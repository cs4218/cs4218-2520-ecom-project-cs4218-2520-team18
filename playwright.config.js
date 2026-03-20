import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node server.js",
      url: "http://127.0.0.1:6060/",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        PORT: "6060",
        DEV_MODE: "test",
        JWT_SECRET: process.env.JWT_SECRET || "playwright_jwt_secret",
        USE_IN_MEMORY_MONGO: "true",
        E2E_SEED_ADMIN: "true",
        E2E_SEED_TEST_DATA: "true",
        BRAINTREE_MERCHANT_ID: process.env.BRAINTREE_MERCHANT_ID || "dummy_merchant",
        BRAINTREE_PUBLIC_KEY: process.env.BRAINTREE_PUBLIC_KEY || "dummy_public",
        BRAINTREE_PRIVATE_KEY: process.env.BRAINTREE_PRIVATE_KEY || "dummy_private",
        MONGOMS_DOWNLOAD_URL: "https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.0.tgz",
        MONGOMS_VERSION: "7.0.0",
        DEBUG: process.env.CI ? "MongoMS:*" : undefined,
      },
    },
    {
      command: "npm start --prefix ./client",
      url: "http://127.0.0.1:3000",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        CI: "true",
        BROWSER: "none",
        PORT: "3000",
      },
    },
  ],
});
