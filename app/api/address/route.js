import { prisma } from "@/lib/prisma";
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";


//Add new Address
export async function POST(request){
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const {address} = await request.json()

        address.userId = userId

        const newAddress = await prisma.address.create({
            data : address
        })

        return NextResponse.json({newAddress , message : 'Address  added Successfully'})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}

//Get all address for a user
export async function GET(request){
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const addresses = await prisma.address.findMany({
            where : {userId}
        })

        return NextResponse.json({addresses})

    } catch (error) {
        console.error(error);
        return NextResponse.json({error : error.code || error.message} , { status : 400 })
    }
}
