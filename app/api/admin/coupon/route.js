import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import authAdmin from "@/middlewares/authAdmin";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";


//Add new coupon
export async function POST(request) {
    try {
        const { userId } = await auth()
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "Not Authorized" }, { status: 401 })
        }

        const { coupon } = await request.json()
        coupon.code = coupon.code.toUpperCase()

        await prisma.coupon.create({ data: coupon }).then(async (coupon) => {
            //Run Inngest Scheduler Function to delete coupon on expire
            await inngest.send({
                name: "app/coupon.expired",
                data: {
                    code: coupon.code,
                    expires_at: coupon.expiresAt,
                }
            })
        })

        return NextResponse.json({ message: "Coupon Added Sucessfully" })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

//Delete coupon /api/coupon?id=couponId
export async function DELETE(request) {
    try {
        const { userId } = await auth()
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "Not Authorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
        }

        await prisma.coupon.deleteMany({ where: { code: code.toUpperCase() } });
        return NextResponse.json({ message: "Coupon Deleted Successfully" });

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}

//Get all Coupons
export async function GET(request) {
    try {
        const { userId } = await auth()
        const isAdmin = await authAdmin(userId)

        if (!isAdmin) {
            return NextResponse.json({ error: "Not Authorized" }, { status: 401 })
        }

        const coupons = await prisma.coupon.findMany({})
        return NextResponse.json({ coupons })

    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}