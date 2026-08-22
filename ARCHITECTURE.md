# ShopKart System Architecture & Engineering Guide

## 1. Checkout & Financial Request Lifecycle

The checkout lifecycle is engineered for atomic consistency, zero double-payouts, and strict isolation between database transactions and external network requests.

```
+-----------------------------------------------------------------------------------+
| 1. Client Trigger (components/OrderSummary.jsx)                                   |
|    - User selects address, payment method (COD / STRIPE), applies optional coupon |
|    - Submits FormData to placeOrderAction (app/actions/checkout.js)               |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. Stock Verification & Row-Level Locking (app/actions/checkout.js)               |
|    - Authenticates user via `await auth()` from `@clerk/nextjs/server`            |
|    - Starts atomic `prisma.$transaction(...)`:                                    |
|      * Acquires pessimistic row lock: `SELECT ... FOR UPDATE` on each product     |
|      * Validates inStock === true; marks `inStock: false` to reserve item         |
|      * Groups items by `storeId` for multi-vendor distribution                    |
|      * Calculates per-store subtotals, coupon deductions, shipping fees           |
|      * Creates `Order` and `OrderItem` records (isPaid: false)                    |
|    - Commits transaction immediately BEFORE initiating any network calls          |
+----------------------------------------+------------------------------------------+
                                         |
            +----------------------------+----------------------------+
            | (PaymentMethod === 'COD')                               | (PaymentMethod === 'STRIPE')
            v                                                         v
+------------------------------------------+ +--------------------------------------+
| 3a. Cash On Delivery Flow                | | 3b. Stripe Session Creation          |
|    - Clears user's DB cart               | |    - Calls stripe.checkout.sessions  |
|    - Returns { success: true }           | |      .create with 30-min expiry      |
|    - Frontend redirects to /orders       | |    - On error: rolls back DB stock   |
|                                          | |    - Returns { url: session.url }    |
+------------------------------------------+ +------------------+-------------------+
                                                                |
                                                                v
+-----------------------------------------------------------------------------------+
| 4. Client Payment & Polling (app/(public)/loading/page.jsx)                       |
|    - User completes payment on Stripe Checkout page                               |
|    - Redirected to `/loading?nextUrl=orders&orderId=<ids>`                        |
|    - Polling interval queries `/api/orders/verify-payment?orderId=<ids>`          |
|    - Navigates to `/orders` once `isPaid === true` is confirmed by webhook        |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 5. Webhook Ingestion & Idempotency (app/api/stripe/route.js)                      |
|    - Validates signature with `stripe.webhooks.constructEvent`                    |
|    - Filters strictly on `checkout.session.completed` (ignores payment_intent)   |
|    - Atomic Transaction:                                                          |
|      * Checks `prisma.stripeEvent.findUnique({ where: { id: event.id } })`        |
|      * Inserts `stripeEvent.create` and updates orders `isPaid: true` atomically  |
|      * Clears user's cart `{ cart: {} }` in database                              |
|      * Collects vendor payout metadata into a pending list                        |
|    - Commits DB transaction                                                       |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 6. Vendor Connect Transfers (app/api/stripe/route.js)                             |
|    - Dispatches Stripe Connect transfers strictly OUTSIDE the database transaction|
|    - Net payout: `order.total * (1 - 0.10)` (10% platform commission deducted)    |
|    - Transferred to seller's `stripeAccountId` with deterministic idempotency:    |
|      `idempotencyKey: 'transfer_${transfer.orderId}'`                             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Infrastructure & Technology Choices

### Clerk (`@clerk/nextjs`)
- **Role**: Handles end-to-end authentication, session tokens, user metadata (e.g. `plan: 'plus'`), and multi-factor security.
- **Why Chosen**: Next.js 15 App Router native compatibility with server-side `await auth()` helper. Eliminates the operational overhead and security risk of managing password hashing, session cookies, and OAuth refresh rotations in-house while providing granular RBAC via public metadata.

### Prisma ORM + Neon Postgres (`@prisma/client`, `@prisma/adapter-neon`)
- **Role**: Type-safe relational data modeling, query generation, and serverless connection management.
- **Why Chosen**: Neon provides serverless Postgres with pooling over WebSockets. Prisma combined with the Neon adapter and a `globalThis.prisma` client singleton eliminates connection pool starvation during development hot-reloads and serverless function cold-starts. Pessimistic row locking (`SELECT FOR UPDATE`) via raw transactions guarantees zero inventory overselling in high-concurrency spikes over optimistic concurrency control (which requires retry loops and degrades under contention).

### Inngest (`inngest`)
- **Role**: Durable, serverless event-driven background job orchestration.
- **Why Chosen**: Inngest handles durable step execution and sleep primitives (`step.sleepUntil`) directly without requiring persistent worker containers (like Celery/BullMQ) or Redis-backed task runners. Coupon expiration events (`app/coupon.expired`) sleep until the exact `expiresAt` timestamp and perform idempotent batch cleanup (`deleteMany`) with automated retries on network transient failures.

### Upstash Redis & Rate Limiting (`@upstash/ratelimit`, `@upstash/redis`)
- **Role**: Edge-compatible sliding-window rate limiting for security-sensitive API routes (store registration, coupon brute-forcing, review submission).
- **Why Chosen**: Upstash offers HTTP-based Redis tailored for serverless edge runtimes without persistent TCP connection overhead. The sliding window algorithm was chosen over token bucket / fixed window because it strictly prevents burst-boundary doubling at the edge of time windows while maintaining predictable rate decay. Rate limiters fail closed (`{ success: false }`) on Redis outages to protect financial assets.

### Stripe Connect (Express Accounts)
- **Role**: Multi-vendor marketplace onboarding and automated split payouts.
- **Why Chosen**: Multi-vendor commerce requires separate KYC verification, tax reporting, and payout schedules for independent sellers. Stripe Connect Express handles seller onboarding hosted flows, bank account verification, and direct transfers (`stripe.transfers.create`) while allowing the platform to deduct a 10% marketplace fee automatically.

### PostgreSQL Full-Text Search (tsvector + GIN Index)
- **Role**: Sub-millisecond text search and relevance ranking over product catalogs.
- **Why Chosen**: Postgres native `tsvector` with a stored generated column (`p.fts`) and a Generalized Inverted Index (`product_fts_idx GIN(fts)`) provides sub-millisecond full-text search with `ts_rank` relevance ordering directly in the database. This avoids the cost, infrastructure maintenance, and data synchronization overhead of external search engines (such as Elasticsearch or Algolia) for catalog sizes under 100k items.

---

## 3. Known Trade-Offs & Technical Decisions

1. **JavaScript (ES Modules) vs TypeScript**:
   - *Decision*: Built with modern ES Modules and JSDoc typing patterns.
   - *Rationale*: Optimized for rapid iteration and minimal build pipeline complexity during initial architecture validation; TypeScript migration is planned as a non-breaking additive phase.

2. **Synchronous Server Actions vs Webhook-Driven Completion**:
   - *Decision*: Orders are provisioned synchronously in a locked transaction, but payment confirmation and seller payouts are strictly driven asynchronously by Stripe webhooks.
   - *Rationale*: Prevents distributed transactions across network boundaries. The client polls `/api/orders/verify-payment` rather than trusting client-side success redirects, ensuring orders only display as paid once the database has committed the verified Stripe event.

3. **Single Image Upload Worker vs Microservice**:
   - *Decision*: Image transformation and hosting are offloaded directly to ImageKit via authenticated upload buffers.
   - *Rationale*: Keeps the Next.js runtime stateless and avoids server-side image processing memory spikes (e.g. sharp/imagemagick) in serverless Lambda functions.
