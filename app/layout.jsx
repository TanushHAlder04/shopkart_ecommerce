import { Outfit } from "next/font/google";
import { Toaster } from "react-hot-toast";
import StoreProvider from "@/app/StoreProvider";
import { ClerkProvider } from '@clerk/nextjs'
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata = {
    title: "ShopKart - Shop Smartly!",
    description: "Shop smarter, Live better. Discover thousands of products. ",
};

export default function RootLayout({ children }) {
    return (
        <ClerkProvider>
            <html lang="en" className="scroll-smooth">
                <body className={`${outfit.className} antialiased  bg-[#F7F5EE]`}>
                    <StoreProvider>
                        <Toaster />
                        {children}
                    </StoreProvider>
                </body>
            </html>
        </ClerkProvider>
    );
}
