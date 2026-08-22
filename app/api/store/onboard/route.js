import { NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
    try {
        const { userId } = await auth();
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const store = await prisma.store.findUnique({
            where: { id: storeId }
        });

        if (!store) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        let accountId = store.stripeAccountId;

        if (!accountId) {
            // Create Stripe Express account for seller
            const account = await stripe.accounts.create({
                type: "express",
                country: "US",
                email: store.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                },
                business_profile: {
                    name: store.name,
                    url: `https://shopkart.com/shop/${store.username}`
                }
            });

            accountId = account.id;

            await prisma.store.update({
                where: { id: storeId },
                data: {
                    stripeAccountId: accountId,
                    stripeAccountStatus: "pending"
                }
            });
        }

        const origin = request.headers.get("origin") || "http://localhost:3000";

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/store`,
            return_url: `${origin}/store`,
            type: "account_onboarding"
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error("Stripe Connect onboarding error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
