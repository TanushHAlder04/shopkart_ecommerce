import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    timeout: 30000,
    fullyParallel: true,
    reporter: "list",
    use: {
        baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
        trace: "on-first-retry",
    },
    webServer: {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
        env: {
            PLAYWRIGHT_TEST: "true",
        },
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
});
