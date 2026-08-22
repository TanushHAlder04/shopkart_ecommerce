import AdminLayout from "@/components/admin/AdminLayout";
import { auth } from "@clerk/nextjs/server";

export const metadata = {
  title: "ShopKart - Admin",
  description: "ShopKart - Admin",
};

export default async function RootAdminLayout({ children }) {
  const { isAuthenticated, redirectToSignIn } = await auth();

  if (!isAuthenticated) {
    return redirectToSignIn();
  }

  return <AdminLayout>{children}</AdminLayout>;
}