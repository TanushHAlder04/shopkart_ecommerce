import { describe, it, expect, vi, beforeEach } from "vitest";

const {
    mockConstructEvent,
    mockTransfersCreate,
    mockSessionsList,
    mockFindUniqueStripeEvent,
    mockCreateStripeEvent,
    mockTransaction,
} = vi.hoisted(() => ({
    mockConstructEvent: vi.fn(),
    mockTransfersCreate: vi.fn(),
    mockSessionsList: vi.fn(),
    mockFindUniqueStripeEvent: vi.fn(),
    mockCreateStripeEvent: vi.fn(),
    mockTransaction: vi.fn(),
}));

vi.mock("stripe", () => {
    return {
        default: function () {
            return {
                webhooks: {
                    constructEvent: mockConstructEvent,
                },
                transfers: {
                    create: mockTransfersCreate,
                },
                checkout: {
                    sessions: {
                        list: mockSessionsList,
                    },
                },
            };
        },
    };
});

vi.mock("@/lib/prisma", () => ({
    prisma: {
        stripeEvent: {
            findUnique: (...args) => mockFindUniqueStripeEvent(...args),
            create: (...args) => mockCreateStripeEvent(...args),
        },
        $transaction: (...args) => mockTransaction(...args),
    },
}));

import { POST as handleStripeWebhook } from "@/app/api/stripe/route";

describe("Stripe Webhook Idempotency & Financial Consistency Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    });

    it("should return { received: true, idempotent: true } and skip processing when event.id was already processed", async () => {
        const mockEvent = {
            id: "evt_duplicate_123",
            type: "checkout.session.completed",
            data: { object: { metadata: { appId: "ShopKart", orderId: "ord_1" } } },
        };

        mockConstructEvent.mockReturnValue(mockEvent);
        mockFindUniqueStripeEvent.mockResolvedValue({ id: "evt_duplicate_123", createdAt: new Date() });

        const req = new Request("http://localhost:3000/api/stripe", {
            method: "POST",
            headers: { "stripe-signature": "sig_valid" },
            body: JSON.stringify(mockEvent),
        });

        const res = await handleStripeWebhook(req);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual({ received: true, idempotent: true });

        // Assert no transaction or transfer was performed
        expect(mockTransaction).not.toHaveBeenCalled();
        expect(mockTransfersCreate).not.toHaveBeenCalled();
    });

    it("should execute transaction and transfer exactly once for new event", async () => {
        const mockEvent = {
            id: "evt_new_456",
            type: "checkout.session.completed",
            data: {
                object: {
                    metadata: { appId: "ShopKart", orderId: "ord_1", userId: "usr_1" },
                },
            },
        };

        mockConstructEvent.mockReturnValue(mockEvent);
        mockFindUniqueStripeEvent.mockResolvedValue(null);

        // Mock tx callback execution
        mockTransaction.mockImplementation(async (callback) => {
            const tx = {
                stripeEvent: { create: vi.fn().mockResolvedValue({ id: "evt_new_456" }) },
                order: {
                    findUnique: vi.fn().mockResolvedValue({
                        id: "ord_1",
                        isPaid: false,
                        total: 100,
                        storeId: "str_1",
                        store: {
                            stripeAccountId: "acct_test_vendor",
                            stripeAccountStatus: "active",
                        },
                    }),
                    update: vi.fn().mockResolvedValue({
                        id: "ord_1",
                        isPaid: true,
                        total: 100,
                        storeId: "str_1",
                        store: {
                            stripeAccountId: "acct_test_vendor",
                            stripeAccountStatus: "active",
                        },
                    }),
                },
                user: { update: vi.fn().mockResolvedValue({}) },
            };
            return await callback(tx);
        });

        mockTransfersCreate.mockResolvedValue({ id: "tr_123" });

        const req = new Request("http://localhost:3000/api/stripe", {
            method: "POST",
            headers: { "stripe-signature": "sig_valid" },
            body: JSON.stringify(mockEvent),
        });

        const res = await handleStripeWebhook(req);
        expect(res.status).toBe(200);

        // Verified Stripe transfer dispatched with deterministic idempotency key and 10% commission deducted
        expect(mockTransfersCreate).toHaveBeenCalledTimes(1);
        expect(mockTransfersCreate).toHaveBeenCalledWith(
            {
                amount: 9000, // 100 - 10% platform fee in cents
                currency: "usd",
                destination: "acct_test_vendor",
                transfer_group: "ORDER_ord_1",
            },
            {
                idempotencyKey: "transfer_ord_1",
            }
        );
    });
});
