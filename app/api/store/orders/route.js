import { prisma } from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";


//Update seller-order status
export async function POST(request){
    try {
        const { userId } = await auth()
        const storeId = await authSeller(userId)

        if(!storeId){
            return NextResponse.json({error:'not authorized'},{status: 401})
        }

        const {orderId , status} = await request.json()

        // Verify the order belongs to this seller's store before updating
        const order = await prisma.order.findFirst({
            where: { id: orderId, storeId }
        })
        if (!order) {
            return NextResponse.json({ error: 'Order not found or not authorized' }, { status: 404 })
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status }
        })

        return NextResponse.json({message :"Order Status Updated"})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}

//Get all order for a seller
export async function GET(request){
    try {
        const { userId } = await auth()
        const storeId = await authSeller(userId)

         if(!storeId){
            return NextResponse.json({error:'not authorized'},{status: 401})
        }

        const orders = await prisma.order.findMany({
            where : {storeId},
            include: {user: true , address : true , orderItems :  {include : {product : true}}},
            orderBy : {createdAt : 'desc'}
        })

        return NextResponse.json({orders})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}