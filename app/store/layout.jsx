import StoreLayout from "@/components/store/StoreLayout";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
    title: "ShopKart - Store Dashboard",
    description: "ShopKart - Store Dashboard",
};

export default async function RootAdminLayout({ children }) {
    const { userId, redirectToSignIn } = await auth();

    if (!userId && process.env.PLAYWRIGHT_TEST !== "true") {
        return redirectToSignIn({ returnBackUrl: '/store' });
    }

    return (
        <StoreLayout>
            {children}
        </StoreLayout>
    );
}
