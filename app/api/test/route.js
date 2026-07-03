// app/api/test/route.js
import { prisma } from "@/lib/prisma"
import { getAuth } from "@clerk/nextjs/server"
import imagekit from "@/configs/imagekit"
import { NextResponse } from "next/server"

export async function GET(request) {
    const results = {}

    // Test 1 - DB Connection
    try {
        await prisma.$connect()
        results.database = "✅ connected"
    } catch (error) {
        results.database = `❌ ${error.message}`
    }

    // Test 2 - Clerk Auth
    try {
        const { userId } = getAuth(request)
        results.auth = userId ? `✅ userId: ${userId}` : "❌ userId is null - not authenticated"
    } catch (error) {
        results.auth = `❌ ${error.message}`
    }

    // Test 3 - ImageKit
    try {
        const url = imagekit.url({
            path: "/test.jpg",
            transformations: [{ width: "100" }]
        })
        results.imagekit = url ? `✅ working - ${url}` : "❌ imagekit url generation failed"
    } catch (error) {
        results.imagekit = `❌ ${error.message}`
    }

    // Test 4 - Prisma Store Query
    try {
        const count = await prisma.store.count()
        results.storeQuery = `✅ store table accessible - ${count} stores`
    } catch (error) {
        results.storeQuery = `❌ ${error.message}`
    }

    // Test 5 - Prisma User Query
    try {
        const count = await prisma.user.count()
        results.userQuery = `✅ user table accessible - ${count} users`
    } catch (error) {
        results.userQuery = `❌ ${error.message}`
    }

    // Test 6 - Env Variables
    results.envVars = {
        DATABASE_URL: process.env.DATABASE_URL ? "✅ set" : "❌ missing",
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ? "✅ set" : "❌ missing",
        IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY ? "✅ set" : "❌ missing",
        IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY ? "✅ set" : "❌ missing",
        IMAGEKIT_URL_ENDPOINT: process.env.IMAGEKIT_URL_ENDPOINT ? "✅ set" : "❌ missing",
    }

    console.log("Test Results:", JSON.stringify(results, null, 2))
    return NextResponse.json(results)
}