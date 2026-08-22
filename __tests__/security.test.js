import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock clerk auth
vi.mock("@clerk/nextjs/server", () => ({
    auth: vi.fn(),
}));

// Mock authSeller middleware
vi.mock("@/middlewares/authSeller", () => ({
    default: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
    prisma: {
        order: { findMany: vi.fn(), count: vi.fn() },
        product: { findMany: vi.fn(), count: vi.fn() },
        rating: { findMany: vi.fn() },
        address: { findMany: vi.fn(), create: vi.fn() },
    },
}));

import { auth } from "@clerk/nextjs/server";
import authSeller from "@/middlewares/authSeller";
import { GET as getStoreDashboard } from "@/app/api/store/dashboard/route";
import { GET as getAddresses, POST as postAddress } from "@/app/api/address/route";

describe("Tier 1 Security & Authorization Unit Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Store Dashboard Route (/api/store/dashboard)", () => {
        it("should return 401 Unauthorized when userId is missing", async () => {
            auth.mockResolvedValue({ userId: null });
            const req = new Request("http://localhost:3000/api/store/dashboard");
            const res = await getStoreDashboard(req);
            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe("Unauthorized");
        });

        it("should return 401 Not authorized as seller when storeId is missing", async () => {
            auth.mockResolvedValue({ userId: "user_non_seller" });
            authSeller.mockResolvedValue(null);

            const req = new Request("http://localhost:3000/api/store/dashboard");
            const res = await getStoreDashboard(req);
            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe("Not authorized as seller");
        });
    });

    describe("Address Routes (/api/address)", () => {
        it("should return 401 on GET when unauthenticated", async () => {
            auth.mockResolvedValue({ userId: null });
            const req = new Request("http://localhost:3000/api/address");
            const res = await getAddresses(req);
            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe("Unauthorized");
        });

        it("should return 401 on POST when unauthenticated", async () => {
            auth.mockResolvedValue({ userId: null });
            const req = new Request("http://localhost:3000/api/address", {
                method: "POST",
                body: JSON.stringify({ address: { city: "Austin" } }),
            });
            const res = await postAddress(req);
            expect(res.status).toBe(401);
            const body = await res.json();
            expect(body.error).toBe("Unauthorized");
        });
    });
});
