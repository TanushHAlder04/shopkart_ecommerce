# ShopKart Testing Guide & Test Plans

This document provides both step-by-step manual test procedures for end-to-end multi-vendor e-commerce validation and an overview of automated test suites (Vitest unit/integration tests and Playwright end-to-end tests).

---

## 1. Manual Testing Checklist

Follow these exact numbered steps to verify critical business logic, security guards, and financial workflows in browser, Stripe Dashboard, and terminal environments.

### Flow A: Seller Application & Admin Approval
1. Open the application in the browser at `http://localhost:3000`.
2. Sign in as a test user via Clerk (e.g. `seller_test@shopkart.dev`).
3. Navigate to `/create-store` from the header menu or footer link.
4. Fill in the store registration form:
   - Store Name: `Acme Electronics`
   - Username: `acme-elec`
   - Description: `Quality audio and accessories.`
   - Email: `seller_test@shopkart.dev`
   - Contact: `+1 555-0199`
   - Address: `100 Innovation Way, Austin, TX 78701`
   - Logo: Upload any sample image (`.png` / `.webp`).
5. Submit the form. Verify toast message: `"applied, waiting for approval"`.
6. Open an incognito window, navigate to `http://localhost:3000`, and log in as the Admin user (`NEXT_PUBLIC_ADMIN_EMAIL`).
7. Open `/admin/approve`. Confirm `Acme Electronics` appears in the pending list with full store info.
8. Click **Approve**. Verify the store status updates to `approved` and appears in `/admin/stores` with `Active` toggled ON.

### Flow B: Seller Stripe Connect Onboarding (`charges_enabled`)
1. As the approved seller user, navigate to `/store`.
2. Observe the seller dashboard displays the banner: `"Connect your Stripe Account to start receiving payouts"`.
3. Click **Connect Stripe**. Verify you are redirected to Stripe's hosted Express onboarding page (`connect.stripe.com`).
4. In Stripe Test Mode, complete onboarding using test credentials (use Stripe test phone `000-000-0000`, test SMS code `000-000`, and test routing/account numbers).
5. Upon redirect back to `/store`, verify:
   - The store's `stripeAccountStatus` is `active`.
   - The **Add Product** tab is now fully enabled.

### Flow C: Single-Store Checkout (Stripe Payment & Idempotent Webhook)
1. In the terminal, start the Stripe webhook listener forwarding to your local endpoint:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe
   ```
2. In the browser as a regular customer (`customer@shopkart.dev`), visit `/shop`.
3. Add 1 unit of `Acme Headphones` ($50.00) from `Acme Electronics` to your cart.
4. Go to `/cart` and proceed to checkout (`/cart` -> Order Summary).
5. Select a shipping address, select **Stripe Payment**, and click **Place Order**.
6. On the Stripe Checkout page, use test card `4242 4242 4242 4242`, any future MM/YY, and CVC `123`. Click **Pay**.
7. Observe redirection to `/loading?nextUrl=orders&orderId=...`.
8. Check the Stripe CLI terminal: observe `checkout.session.completed` received with HTTP 200.
9. Verify the `/loading` page resolves and redirects automatically to `/orders`, showing the order marked as **Paid**.
10. Check Stripe Dashboard (Connect Transfers): verify a single transfer of $45.00 ($50 - 10% platform fee) was dispatched to `Acme Electronics` with transfer group `ORDER_<id>`.
11. **Idempotency Resend Test**: In the terminal, resend the same webhook event:
    ```bash
    stripe events resend evt_<event_id_from_step_8>
    ```
12. Verify the server logs return `{ received: true, idempotent: true }` and **no second transfer** is created in Stripe Dashboard.

### Flow D: Multi-Store Checkout (Split Connect Transfers)
1. Add 1 item from Store A ($30.00) and 1 item from Store B ($40.00) to the cart.
2. Complete checkout via Stripe payment.
3. Observe the database creates two distinct `Order` records linked to Store A and Store B.
4. Verify Stripe Connect transfers:
   - Transfer 1: $27.00 sent to Store A's Stripe account.
   - Transfer 2: $36.00 sent to Store B's Stripe account.

### Flow E: Cash on Delivery (COD) Checkout
1. Add an in-stock product to cart.
2. At checkout, select **COD** as the payment method.
3. Click **Place Order**.
4. Verify immediate toast: `"Order placed successfully!"` and redirect to `/orders`.
5. Verify the order is created with `paymentMethod: "COD"`, `isPaid: false`, and the cart is emptied.

### Flow F: Coupon Validation & Rate Limiting (429 Fail-Closed)
1. In checkout, attempt to apply coupon code `NEW20`. Verify 20% discount is applied to the subtotal.
2. Rapidly click Apply 6 times within 10 seconds with arbitrary coupon codes.
3. Verify the 6th attempt returns HTTP 429: `"Too many attempts. Please wait a few seconds."`
4. Attempt to validate a coupon while logged out (unauthenticated HTTP POST to `/api/coupon`). Verify immediate HTTP 401 response.

---

## 2. Automated Test Matrix

| Test Suite | File Path | Coverage |
| :--- | :--- | :--- |
| **Checkout Calculation Unit Tests** | `__tests__/checkout.test.js` | Shipping fees calculation, member zero-shipping waiver, coupon discount percentage deduction |
| **API Auth & Security Tests** | `__tests__/security.test.js` | 401 Unauthorized on missing `userId` / `storeId` in dashboard and address routes |
| **Rate Limiter Fail-Closed Tests** | `__tests__/rateLimit.test.js` | Verification of fail-closed behavior (`{ success: false }`) when Redis throws an unexpected error |
| **Webhook Idempotency Tests** | `__tests__/webhook.test.js` | Verification that duplicate webhook event IDs are rejected without re-executing transactions |
| **End-to-End Playwright Tests** | `e2e/checkout.spec.js` | Single-store checkout UI flow, seller dashboard status checks, charges_enabled validations |

---

## 3. Running Automated Tests

```bash
# Run unit and integration tests (Vitest)
npx vitest run

# Run end-to-end tests (Playwright)
npx playwright test

# Generate Prisma Client & Run production build
npx prisma generate
npm run build
```
