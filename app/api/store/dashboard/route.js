import { prisma } from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";

//Get Dashboard data for Seller ( total orders , total earnings , total products )
export async function GET(request){
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const storeId = await authSeller(userId)
        if (!storeId) {
            return NextResponse.json({ error: "Not authorized as seller" }, { status: 401 });
        }
        
        //Get all orders for Seller
        const orders = await prisma.order.findMany({ where: {storeId}})

        //Get all orders with ratings for Seller
         const products = await prisma.product.findMany({ where: {storeId}})

          const ratings = await prisma.rating.findMany({ 
            where: {productId: {in: products.map(product => product.id)}},
            include: {user: true , product: true}        
        })

        const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalEarnings: Math.round(orders.reduce((acc, order)=> acc + order.total, 0)),
            totalProducts: products.length
        }

        return NextResponse.json({dashboardData});

    } catch (error) {
        console.error(error);
        return NextResponse.json({error:error.code || error.message},{status:400}) 
    }
}