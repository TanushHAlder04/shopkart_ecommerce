'use client'
import Banner from "@/components/Banner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { fetchProducts } from "@/lib/features/product/productSlice";
import { useAuth, useUser } from "@clerk/nextjs";
import { fetchUserRatings } from "@/lib/features/rating/ratingSlice";
import { fetchCart, uploadCart } from "@/lib/features/cart/cartSlice";
import { fetchAddress } from "@/lib/features/address/addressSlice";

export default function PublicLayout({ children }) {

    const dispatch = useDispatch()

    const {user} = useUser()
    const {getToken} = useAuth()

    const {cartItems, isCartLoaded} = useSelector((state)=> state.cart)

    useEffect(()=>{
        dispatch(fetchProducts({}))
    },[])

    useEffect(()=>{
        if(user){
            dispatch(fetchCart({getToken}))
            dispatch(fetchAddress({getToken}))
            dispatch(fetchUserRatings({getToken}))
        }
    },[user])

     useEffect(()=>{
        if(user && isCartLoaded){
            dispatch(uploadCart({getToken}))
        }
    },[cartItems])


    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 pt-24 sm:pt-28">
                {children}
            </main>
            <Footer />
        </div>
    );
}
