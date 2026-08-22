import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
import { reviewLimiter, checkRateLimit } from "@/middlewares/rateLimit";

//Add new Rating
export async function POST(request){
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limitRes = await checkRateLimit(reviewLimiter, userId);
        if (!limitRes.success) {
            return NextResponse.json({ error: "Too many review attempts. Please try again later." }, { status: 429 });
        }
        const {orderId, productId, rating, review} = await request.json()
        const order = await prisma.order.findUnique({where: {id: orderId, userId}})

        if(!order){
            return NextResponse.json({error: "Order Not Found"},{status: 404})
        }
        const isAlreadyRated = await prisma.rating.findFirst({where:{productId,orderId}})

          if(isAlreadyRated){
            return NextResponse.json({error: "Product Already Rated"},{status: 400})
        }

        const response = await prisma.rating.create({
            data: {userId, productId, rating, review, orderId}
        })

        return NextResponse.json({message: "Rating added Successfully" , rating: response})


    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message},{status: 400})
    }
}

//Get all rating for a user
export async function GET(request){
    try {
        const { userId } = await auth()
        if(!userId){
         return NextResponse.json({error: "Unauthorized"},{status: 401})   
        }
        
        const ratings = await prisma.rating.findMany({
            where:{userId}
        })

        return NextResponse.json({ratings})
        
    } catch (error) {
        console.error(error);
        return NextResponse.json({error: error.code || error.message},{status: 400})
    }
}