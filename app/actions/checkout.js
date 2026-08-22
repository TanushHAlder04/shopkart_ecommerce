"use server";

import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export async function placeOrderAction(formData) {
    try {
        const { userId, has } = await auth();
        if (!userId) {
            return { success: false, error: "Unauthorized" };
        }

        const itemsJson = formData.get("items");
        const addressId = formData.get("addressId");
        const paymentMethod = formData.get("paymentMethod");
        const couponCode = formData.get("couponCode");

        if (!itemsJson || !addressId || !paymentMethod) {
            return { success: false, error: "Missing required checkout details" };
        }

        const items = JSON.parse(itemsJson);
        if (!Array.isArray(items) || items.length === 0) {
            return { success: false, error: "Cart is empty" };
        }

        let coupon = null;
        if (couponCode) {
            coupon = await prisma.coupon.findUnique({
                where: {
                    code: couponCode.toUpperCase(),
                    expiresAt: { gt: new Date() }
                }
            });
            if (!coupon) {
                return { success: false, error: "Coupon not found or expired" };
            }
            if (coupon.forNewUser) {
                const userOrders = await prisma.order.findMany({ where: { userId } });
                if (userOrders.length > 0) {
                    return { success: false, error: "Coupon valid for new users only" };
                }
            }
            if (coupon.forMember) {
                if (!hasPlusPlan) {
                    return { success: false, error: "Coupon valid for plus members only" };
                }
            }
        }

        // Short transaction locking stock via SELECT FOR UPDATE
        const { orderIds, fullAmount } = await prisma.$transaction(async (tx) => {
            const ordersByStore = new Map();

            for (const item of items) {
                const lockedProducts = await tx.$queryRaw`
                    SELECT "id", "name", "price", "inStock", "storeId" 
                    FROM "Product" 
                    WHERE "id" = ${item.id} 
                    FOR UPDATE
                `;
                const product = lockedProducts[0];

                if (!product || !product.inStock) {
                    throw new Error(`Product ${product ? product.name : item.id} is out of stock`);
                }

                await tx.product.update({
                    where: { id: item.id },
                    data: { inStock: false }
                });

                const storeId = product.storeId;
                if (!ordersByStore.has(storeId)) {
                    ordersByStore.set(storeId, []);
                }
                ordersByStore.get(storeId).push({ ...item, price: product.price });
            }

            let createdOrderIds = [];
            let totalAmount = 0;
            let isShippingFeeAdded = false;

            for (const [storeId, sellerItems] of ordersByStore.entries()) {
                let total = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

                if (couponCode && coupon) {
                    total -= (total * coupon.discount) / 100;
                }
                if (!hasPlusPlan && !isShippingFeeAdded) {
                    total += 5;
                    isShippingFeeAdded = true;
                }

                const orderTotal = parseFloat(total.toFixed(2));
                totalAmount += orderTotal;

                const order = await tx.order.create({
                    data: {
                        userId,
                        storeId,
                        addressId,
                        total: orderTotal,
                        paymentMethod,
                        isCouponUsed: Boolean(couponCode && coupon),
                        coupon: coupon || {},
                        orderItems: {
                            create: sellerItems.map(item => ({
                                productId: item.id,
                                quantity: item.quantity,
                                price: item.price
                            }))
                        }
                    }
                });
                createdOrderIds.push(order.id);
            }

            return { orderIds: createdOrderIds, fullAmount: totalAmount };
        });

        if (paymentMethod === 'STRIPE') {
            try {
                const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
                const reqHeaders = await headers();
                const origin = reqHeaders.get('origin') || "http://localhost:3000";

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'ShopKart Order'
                            },
                            unit_amount: Math.round(fullAmount * 100)
                        },
                        quantity: 1
                    }],
                    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
                    mode: 'payment',
                    success_url: `${origin}/loading?nextUrl=orders&orderId=${encodeURIComponent(orderIds.join(','))}`,
                    cancel_url: `${origin}/cart`,
                    metadata: {
                        orderId: orderIds.join(','),
                        userId,
                        appId: 'ShopKart'
                    }
                });
                return { success: true, url: session.url };
            } catch (stripeError) {
                console.error("Stripe session creation failed in Server Action:", stripeError);
                // Rollback stock and draft orders
                await prisma.$transaction(async (tx) => {
                    await tx.product.updateMany({
                        where: { id: { in: items.map(i => i.id) } },
                        data: { inStock: true }
                    });
                    await tx.order.deleteMany({
                        where: { id: { in: orderIds } }
                    });
                });
                return { success: false, error: "Failed to initialize payment gateway." };
            }
        }

        // Clear cart for COD orders
        await prisma.user.update({
            where: { id: userId },
            data: { cart: {} }
        });

        return { success: true, message: "Order placed successfully!" };
    } catch (error) {
        console.error("placeOrderAction error:", error);
        return { success: false, error: error.message };
    }
}
