import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



export async function GET(request){
   try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get("search");
    const storeId = searchParams.get("storeId");

    let products;

    if (searchQuery && searchQuery.trim() !== "") {
        // Full-Text Search using Postgres tsvector (stored fts column) and ts_rank
        if (storeId) {
            products = await prisma.$queryRaw`
                SELECT p.*, 
                       ts_rank(p.fts, websearch_to_tsquery('english', ${searchQuery})) AS rank
                FROM "Product" p
                JOIN "Store" s ON p."storeId" = s.id
                WHERE p."inStock" = true
                  AND s."isActive" = true
                  AND p."storeId" = ${storeId}
                  AND p.fts @@ websearch_to_tsquery('english', ${searchQuery})
                ORDER BY rank DESC
            `;
        } else {
            products = await prisma.$queryRaw`
                SELECT p.*, 
                       ts_rank(p.fts, websearch_to_tsquery('english', ${searchQuery})) AS rank
                FROM "Product" p
                JOIN "Store" s ON p."storeId" = s.id
                WHERE p."inStock" = true
                  AND s."isActive" = true
                  AND p.fts @@ websearch_to_tsquery('english', ${searchQuery})
                ORDER BY rank DESC
            `;
        }
    } else {
        products = await prisma.product.findMany({
            where: { 
                inStock: true,
                store: { isActive: true },
                ...(storeId ? { storeId } : {})
            },
            include: {
                rating: {
                    select: {
                        createdAt: true, rating: true, review: true,
                        user: { select: { name: true, image: true } }
                    }
                },
                store: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    return NextResponse.json({ products });
   } catch (error) {
       console.error(error);
       return NextResponse.json({ error: error.code || error.message }, { status: 400 });
   }
}