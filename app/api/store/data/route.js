import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

//Get store Info and Products
export async function GET(request) {
    try {
        //Get store username from query params
        const { searchParams } = new URL(request.url)
        const rawUsername = searchParams.get('username');

        if (!rawUsername || !rawUsername.trim()) {
            return NextResponse.json({ message: "missing username" }, { status: 400 })
        }

        const username = rawUsername.trim().toLowerCase();

        //Get Store info and inStock product with ratings
        const store = await prisma.store.findUnique({
            where: { username, isActive: true },
            include: { Product: { include: { rating: true } } }
        })

        if (!store) {
            return NextResponse.json({ message: "store not found" }, { status: 400 })
        }

        return NextResponse.json({ store })

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}