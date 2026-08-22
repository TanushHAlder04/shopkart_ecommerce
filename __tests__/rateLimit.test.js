import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "@/middlewares/rateLimit";

describe("Rate Limiting Unit Tests (Fail-Closed Verification)", () => {
    it("should return { success: true } when limiter is not initialized (dev/fallback)", async () => {
        const res = await checkRateLimit(null, "user_123");
        expect(res.success).toBe(true);
    });

    it("should return { success: false } fail-closed when Redis throws an unexpected error", async () => {
        const mockBrokenLimiter = {
            limit: vi.fn().mockRejectedValue(new Error("Redis connection refused: ECONNREFUSED")),
        };

        const res = await checkRateLimit(mockBrokenLimiter, "user_123");
        expect(res.success).toBe(false);
    });

    it("should return the limiter result when Redis succeeds", async () => {
        const mockWorkingLimiter = {
            limit: vi.fn().mockResolvedValue({ success: true, limit: 5, remaining: 4, reset: 12345 }),
        };

        const res = await checkRateLimit(mockWorkingLimiter, "user_123");
        expect(res.success).toBe(true);
        expect(res.remaining).toBe(4);
    });
});
