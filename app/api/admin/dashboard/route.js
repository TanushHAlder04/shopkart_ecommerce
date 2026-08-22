import { prisma } from "@/lib/prisma"
import authAdmin from "@/middlewares/authAdmin"
import { auth } from "@clerk/nextjs/server"
import {  NextResponse } from "next/server"

//Get Dashboard Data for Admin (total orders, total stores, total products , total revenue)
export async function GET(request){

    try {
        const {userId} = await auth()
        const isAdmin = await authAdmin(userId)

        if(!isAdmin){
        return NextResponse.json({error:'not authorized'},{status:401})
      }

       const orderFilter = {
           OR: [
               { paymentMethod: "COD" },
               { AND: [{ paymentMethod: "STRIPE" }, { isPaid: true }] }
           ]
       };

       //Get total orders (only paid / COD)
       const orders = await prisma.order.count({ where: orderFilter });
       //Get total stores on app
       const stores = await prisma.store.count();
       //Get all orders include only createdAt and total & calculate total revenue
       const allOrders = await prisma.order.findMany({
           where: orderFilter,
           select: {
            createdAt: true,
            total: true,
          }  
        })
      let totalRevenue = allOrders.reduce((acc, order) => acc + order.total, 0)
      const revenue = totalRevenue.toFixed(2)
      //total products on app
      const products = await prisma.product.count()

       const dashboardData = {
        orders,
        stores,
        products,
        revenue,
        allOrders
      }
    
      return NextResponse.json({dashboardData})
  }
     catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status:400}) 
    }

}