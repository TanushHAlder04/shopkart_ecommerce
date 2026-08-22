import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

/**
 * GET /api/orders/verify-payment?orderId=<id>
 *
 * Polled by the success redirect page (/loading) to check whether the
 * webhook has already marked the order as paid.  The client polls every
 * 2 seconds and redirects to /orders once isPaid === true.
 *
 * Security:  only the authenticated user who owns the order can query it.
 * Returns:   { paid: boolean }
 */
export async function GET(request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get("orderId");

        if (!orderId) {
            return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }

        // Support comma-separated list (multi-store checkout creates multiple orders)
        const orderIds = orderId.split(",").filter(Boolean);

        const orders = await prisma.order.findMany({
            where: {
                id: { in: orderIds },
                userId // Ensures a user can only query their own orders
            },
            select: { id: true, isPaid: true }
        });

        // All orders in the group must be paid for the session to be considered complete
        const allPaid = orders.length > 0 && orders.every(o => o.isPaid);

        return NextResponse.json({ paid: allPaid });
    } catch (error) {
        console.error("verify-payment error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
