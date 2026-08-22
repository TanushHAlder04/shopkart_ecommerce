import { describe, it, expect } from "vitest";

// Pure checkout logic functions to test
export function calculateOrderTotal({ items, coupon, isPlusMember }) {
    let subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    let discountAmount = 0;

    if (coupon && coupon.discount) {
        discountAmount = (subtotal * coupon.discount) / 100;
    }

    let total = subtotal - discountAmount;
    let shippingFee = 0;

    if (!isPlusMember) {
        shippingFee = 5.0;
        total += shippingFee;
    }

    return {
        subtotal: parseFloat(subtotal.toFixed(2)),
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        shippingFee: parseFloat(shippingFee.toFixed(2)),
        total: parseFloat(total.toFixed(2))
    };
}

describe("Checkout Total & Coupon Calculations", () => {
    it("should correctly calculate total without coupon for non-plus member", () => {
        const items = [
            { price: 20.00, quantity: 2 }, // 40
            { price: 10.00, quantity: 1 }  // 10
        ];
        const res = calculateOrderTotal({ items, coupon: null, isPlusMember: false });
        expect(res.subtotal).toBe(50.00);
        expect(res.discountAmount).toBe(0.00);
        expect(res.shippingFee).toBe(5.00);
        expect(res.total).toBe(55.00);
    });

    it("should waive shipping fee for plus members", () => {
        const items = [{ price: 100.00, quantity: 1 }];
        const res = calculateOrderTotal({ items, coupon: null, isPlusMember: true });
        expect(res.shippingFee).toBe(0.00);
        expect(res.total).toBe(100.00);
    });

    it("should apply percentage coupon discount correctly", () => {
        const items = [{ price: 100.00, quantity: 1 }];
        const coupon = { code: "SAVE20", discount: 20 };
        const res = calculateOrderTotal({ items, coupon, isPlusMember: true });
        expect(res.discountAmount).toBe(20.00);
        expect(res.total).toBe(80.00);
    });
});
