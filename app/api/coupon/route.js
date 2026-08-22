import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
import { couponApplyLimiter, checkRateLimit } from "@/middlewares/rateLimit";

//Verify Coupon 
export async function POST(request) {
    try {
        const { userId, has } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const limitRes = await checkRateLimit(couponApplyLimiter, userId);
        if (!limitRes.success) {
            return NextResponse.json({ error: "Too many attempts. Please wait a few seconds." }, { status: 429 });
        }

        const {code} = await request.json()

        const coupon = await prisma.coupon.findUnique({
            where : {code: code.toUpperCase(),
              expiresAt : {gt: new Date()}
            }
        })
        if(!coupon){
            return NextResponse.json({error: "Coupon Not Found"},{status: 404})
        }
        if(coupon.forNewUser){
            const useorders = await prisma.order.findMany({where: {userId}})
            if(useorders.length > 0){
                 return NextResponse.json({error: "Coupon Valid For New Users"},{status: 404})
            }
        }

        if(coupon.forMember){
            const hasPlusPlan = has({plan :'plus'})
            if(!hasPlusPlan){
                return NextResponse.json({error: "Coupon Valid For Members Only"},{status: 404})
            }
        }
        return NextResponse.json({coupon})

    } catch (error) {
        console.error(error)
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
    
}