import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";


//Update User Cart
export async function POST(request){
    try {
        const { userId } = await auth()
        if(!userId){
            return NextResponse.json({error: 'Unauthorized'}, {status: 401})
        }

        const {cart} = await request.json()

        //Save the cart to user object
        await prisma.user.update({
            where : {id : userId},
            data : {cart : cart}
        })

        return NextResponse.json({message : 'Cart Updated'})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}

//Get user Cart
export async function GET(request){
    try {
        const { userId } = await auth()
        if(!userId){
            return NextResponse.json({cart: {}})
        }

        const user = await prisma.user.findUnique({
            where : {id :userId}
        })

        return NextResponse.json({cart : user?.cart || {}})
    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}