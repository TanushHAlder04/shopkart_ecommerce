import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis;
try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
} catch (e) {
    console.warn("Upstash Redis initialization warning:", e);
}

// 1. Store creation: 3 requests per 1 day by userId
export const storeCreateLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 d"),
    analytics: true,
    prefix: "@upstash/ratelimit/store_create",
}) : null;

// 2. Coupon application: 5 requests per 10 seconds by userId
export const couponApplyLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "10 s"),
    analytics: true,
    prefix: "@upstash/ratelimit/coupon_apply",
}) : null;

// 3. Product reviews: 10 requests per 1 hour by userId
export const reviewLimiter = redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    analytics: true,
    prefix: "@upstash/ratelimit/review",
}) : null;

export async function checkRateLimit(limiter, identifier) {
    if (!limiter) return { success: true };
    try {
        return await limiter.limit(identifier);
    } catch (err) {
        console.error("Rate limit check failed:", err);
        return { success: false }; // Fail closed on Redis error
    }
}
