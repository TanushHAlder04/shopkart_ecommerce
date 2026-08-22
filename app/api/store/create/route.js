import imagekit, { toFile } from "@/configs/imagekit";
import { prisma } from "@/lib/prisma";
import { clerkClient, auth } from '@clerk/nextjs/server';
import { NextResponse } from "next/server";
import { storeCreateLimiter, checkRateLimit } from "@/middlewares/rateLimit";

//create the store
export async function POST(request) {
    try{
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const limitRes = await checkRateLimit(storeCreateLimiter, userId);
        if (!limitRes.success) {
            return NextResponse.json({ error: "Daily store creation limit reached." }, { status: 429 });
        }

        // Step 1 — ensure user exists in DB
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(userId)

        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: clerkUser.emailAddresses[0].emailAddress,
                name: `${clerkUser.firstName} ${clerkUser.lastName}`,
                image: clerkUser.imageUrl,
            }
        })

        //Get the data from the form
        const formData = await request.formData()

        const name = formData.get("name")
        const username = formData.get("username")
        const description = formData.get("description")
        const email = formData.get("email")
        const contact = formData.get("contact")
        const address = formData.get("address")
        const image = formData.get("image")

        if(!name || !username || !description || !email || !contact || !address || !image){
            return NextResponse.json({error: "Missing store info"},{status:404})
        }

        //check is user have already registerd a store
        const store = await prisma.store.findFirst({
            where: {userId : userId}
        })

        //if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        //check if username is already taken
        const isUsernameTaken = await prisma.store.findFirst({
            where: {username: username.toLowerCase()}
        })

        if(isUsernameTaken){
            return NextResponse.json({error: "username already taken"},{status: 404})
        }

        //image upload to imagekit
        const buffer = Buffer.from(await image.arrayBuffer());
        const file = await toFile(buffer, image.name);
        const response = await imagekit.files.upload({
            file: file,
            fileName: image.name,
            folder: "logos"
        })

        const optimizedImage = imagekit.helper.buildSrc({
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    src: response.filePath,
    transformation: [
        {
            quality: 80,
            format: 'webp',
            width: 512,
        }
    ]
})

        

        const newStore = await prisma.store.create({
            data:{
                userId,
                name,
                description,
                username: username.toLowerCase(),
                email,
                contact,
                address,
                logo: optimizedImage
            }
        })

        //link store to user
        await prisma.user.update({
            where : {id: userId},
            data: {store: {connect: {id: newStore.id}}}
        })

        return NextResponse.json({message: "applied, waiting for approval"})

        }catch (error){
            console.error(error);
            return NextResponse.json({error: error.code || error.message},{status:404})
 }  
}

//Check is user have already registered a store if yes then send the status of the store
export async function GET(request) {
    try{
         const { userId } = await auth()
         if (!userId) {
             return NextResponse.json({ status: "not registered" })
         }

        //check is user have already registerd a store
        const store = await prisma.store.findFirst({
            where: {userId : userId}
        })

        //if store is already registered then send status of store
        if(store){
            return NextResponse.json({status: store.status})
        }

        return NextResponse.json({status: "not registered"})

    }catch(error){
        console.error("GET error:", error.message)
        console.error(error);
        return NextResponse.json({error: error.code || error.message}, {status:400})
    }
    
}
