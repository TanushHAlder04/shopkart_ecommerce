import Stripe from "stripe";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const body = await request.text();
        const sig = request.headers.get("stripe-signature");
        const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);

        // Idempotency check: Ignore duplicate webhook deliveries
        const existingEvent = await prisma.stripeEvent.findUnique({
            where: { id: event.id }
        });
        if (existingEvent) {
            return NextResponse.json({ received: true, idempotent: true });
        }

        const handleSuccess = async (session) => {
            const { orderId, userId, appId } = session.metadata || {};
            if (appId !== 'ShopKart' || !orderId) return;

            const orderIdsArray = orderId.split(",");

            // Collect transfer data outside the transaction
            const pendingTransfers = [];

            // Update orders to paid inside a transaction, along with idempotency record
            await prisma.$transaction(async (tx) => {
                // Record the event inside the transaction so it only commits if everything succeeds
                await tx.stripeEvent.create({
                    data: { id: event.id }
                });

                for (const id of orderIdsArray) {
                    const existingOrder = await tx.order.findUnique({
                        where: { id },
                        include: { store: true }
                    });

                    // Defense in depth: skip if already paid (e.g. race condition)
                    if (!existingOrder || existingOrder.isPaid) continue;

                    const order = await tx.order.update({
                        where: { id },
                        data: { isPaid: true },
                        include: { store: true }
                    });

                    // Collect transfer info — actual Stripe API call happens AFTER transaction commits
                    if (order.store && order.store.stripeAccountId && order.store.stripeAccountStatus === "active") {
                        const platformCommissionRate = 0.10; // 10% platform fee
                        const netPayout = Math.round(order.total * (1 - platformCommissionRate) * 100);
                        pendingTransfers.push({
                            amount: netPayout,
                            currency: "usd",
                            destination: order.store.stripeAccountId,
                            transfer_group: `ORDER_${order.id}`,
                            orderId: order.id,
                            storeId: order.storeId,
                        });
                    }
                }

                // Clear user's cart after successful payment (object shape, not array)
                if (userId) {
                    await tx.user.update({
                        where: { id: userId },
                        data: { cart: {} }
                    });
                }
            });

            // Dispatch Stripe Connect transfers OUTSIDE the DB transaction
            for (const transfer of pendingTransfers) {
                try {
                    await stripe.transfers.create(
                        {
                            amount: transfer.amount,
                            currency: transfer.currency,
                            destination: transfer.destination,
                            transfer_group: transfer.transfer_group,
                        },
                        {
                            idempotencyKey: `transfer_${transfer.orderId}`,
                        }
                    );
                } catch (transferErr) {
                    console.error(`Failed vendor transfer for store ${transfer.storeId}:`, transferErr);
                }
            }
        };

        const handleFailureOrExpiry = async (session) => {
            const { orderId, appId } = session.metadata || {};
            if (appId !== 'ShopKart' || !orderId) return;

            const orderIdsArray = orderId.split(",");

            await prisma.$transaction(async (tx) => {
                // Record the event inside the transaction
                await tx.stripeEvent.create({
                    data: { id: event.id }
                });

                for (const id of orderIdsArray) {
                    const order = await tx.order.findUnique({
                        where: { id },
                        include: { orderItems: true }
                    });

                    if (order && !order.isPaid) {
                        // Restore product inventory
                        for (const item of order.orderItems) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { inStock: true }
                            });
                        }
                        // Remove un-paid expired order
                        await tx.order.delete({
                            where: { id }
                        });
                    }
                }
            });
        };

        switch (event.type) {
            // 1b: Only handle checkout.session.completed for success — NOT payment_intent.succeeded
            case "checkout.session.completed": {
                const session = event.data.object;
                await handleSuccess(session);
                break;
            }

            case "payment_intent.succeeded": {
                // Intentionally ignored — checkout.session.completed is the canonical success event.
                // Processing both causes double transfers.
                console.log("payment_intent.succeeded received — skipping (handled via checkout.session.completed)");
                // Still record the event to prevent future re-processing attempts
                await prisma.stripeEvent.create({ data: { id: event.id } }).catch(() => {});
                break;
            }

            case "checkout.session.expired":
            case "checkout.session.async_payment_failed":
            case "payment_intent.payment_failed": {
                const sessionOrIntent = event.data.object;
                if (sessionOrIntent.object === "checkout.session") {
                    await handleFailureOrExpiry(sessionOrIntent);
                } else {
                    const sessions = await stripe.checkout.sessions.list({
                        payment_intent: sessionOrIntent.id
                    });
                    if (sessions.data.length > 0) {
                        await handleFailureOrExpiry(sessions.data[0]);
                    }
                }
                break;
            }

            default:
                console.log('Unhandled event type:', event.type);
                break;
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook processing error:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}