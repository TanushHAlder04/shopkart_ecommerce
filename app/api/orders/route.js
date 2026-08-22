import { PaymentMethod } from "@/lib/generated/prisma";
import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server"


//Get all orderss for a user
export async function GET(request){
    try {
         const { userId } = await auth()
         const orders = await prisma.order.findMany({
            where: {userId, OR: [
                {paymentMethod: PaymentMethod.COD},
                {AND: [{paymentMethod: PaymentMethod.STRIPE},{isPaid: true}]}
            ]},
            include: {
                orderItems: {include: {product: true}},
                address: true
            },
            orderBy: {createdAt: 'desc'}
         })
         
         return NextResponse.json({orders})

    } catch (error) {
         console.error(error);
        return NextResponse.json({error: error.message},{status: 400})
    }
}