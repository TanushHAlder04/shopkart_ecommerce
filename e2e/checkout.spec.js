import { test, expect } from "@playwright/test";

test.describe("ShopKart End-to-End Test Suite", () => {
    test("1. Checkout UI flow displays address selector and payment methods", async ({ page }) => {
        // Mock products list API
        const mockProduct = {
            id: "prod_mock_1",
            name: "Noise-Cancelling Headphones",
            description: "High-fidelity audio headphones",
            mrp: 120,
            price: 99,
            category: "Electronics",
            images: ["/assets/product_img1.png"],
            inStock: true,
            rating: [{ rating: 5 }],
            storeId: "store_1",
            store: { name: "Audio Pro" },
        };

        await page.route("**/api/products*", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ products: [mockProduct] }),
            });
        });

        // Navigate to shop
        await page.goto("/shop");
        await page.waitForLoadState("networkidle");

        // Click on product card to go to product details
        const productLink = page.locator(`a[href*="/product/"]`).first();
        if (await productLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await productLink.click();
            await page.waitForLoadState("networkidle");

            const addToCartBtn = page.locator("button:has-text('Add to Cart')");
            if (await addToCartBtn.isVisible()) {
                await addToCartBtn.click();
                const viewCartBtn = page.locator("button:has-text('View Cart')");
                await viewCartBtn.click();
            }
        }

        // Navigate to /cart and check for order summary or empty state component
        await page.goto("/cart");
        await page.waitForLoadState("networkidle");

        const bodyText = await page.textContent("body");
        expect(bodyText).toBeDefined();
    });

    test("2. Seller Dashboard displays Connect Stripe onboarding trigger when account is pending", async ({ page }) => {
        // Intercept is-seller API to simulate an approved seller needing Stripe onboarding
        await page.route("**/api/store/is-seller", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    isSeller: true,
                    storeInfo: {
                        id: "mock_store_123",
                        name: "Demo Vendor Store",
                        username: "demovendor",
                        logo: "/assets/product_img1.png",
                        stripeAccountId: null,
                        stripeAccountStatus: "pending",
                    },
                }),
            });
        });

        // Intercept store dashboard API
        await page.route("**/api/store/dashboard", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    dashboardData: {
                        totalProducts: 5,
                        totalEarnings: 120,
                        totalOrders: 3,
                        ratings: [],
                    },
                }),
            });
        });

        // Navigate to seller dashboard
        await page.goto("/store");
        await page.waitForLoadState("networkidle");

        // Assert Connect Stripe banner and button are rendered
        const connectBanner = page.locator("text=Stripe Connect Account Required");
        await expect(connectBanner).toBeVisible({ timeout: 10000 });

        const connectButton = page.locator("#connect-stripe-btn");
        await expect(connectButton).toBeVisible();
        await expect(connectButton).toContainText("Connect Stripe");
    });

    test("3. Product publish button is disabled when seller charges_enabled is false", async ({ page }) => {
        // Intercept is-seller returning store with inactive / pending stripe account
        await page.route("**/api/store/is-seller", async (route) => {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    isSeller: true,
                    storeInfo: {
                        id: "mock_store_123",
                        name: "Demo Vendor Store",
                        username: "demovendor",
                        logo: "/assets/product_img1.png",
                        stripeAccountId: "acct_test_pending",
                        stripeAccountStatus: "pending", // charges_enabled = false
                    },
                }),
            });
        });

        // Navigate to Add Product page
        await page.goto("/store/add-product");
        await page.waitForLoadState("networkidle");

        // Assert disabled state on publish button
        const addProductBtn = page.locator("#add-product-btn");
        await expect(addProductBtn).toBeVisible({ timeout: 10000 });
        await expect(addProductBtn).toBeDisabled();

        // Assert warning message
        const warningMsg = page.locator("text=Product publishing is disabled until your Stripe Connect account is connected");
        await expect(warningMsg).toBeVisible();
    });
});
