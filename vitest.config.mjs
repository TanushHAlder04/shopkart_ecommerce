import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        include: ["__tests__/**/*.test.js"],
        exclude: ["e2e/**", "node_modules/**"],
        alias: {
            "@": path.resolve(import.meta.dirname, "./"),
        },
    },
});
