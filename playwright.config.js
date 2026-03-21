import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node server.js',
      url: 'http://127.0.0.1:6060/',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PORT: '6060',
        DEV_MODE: 'test',
        JWT_SECRET: process.env.JWT_SECRET || 'playwright_jwt_secret',
        USE_IN_MEMORY_MONGO: 'true',
        E2E_SEED_ADMIN: 'true',
        E2E_SEED_TEST_DATA: 'true',
        DISABLE_ADMIN_SEED: 'false',
        E2E_SEED_ADMIN: 'true',
        SEED_ADMIN_NAME: 'E2E Admin User',
        SEED_ADMIN_EMAIL: 'admin.e2e@example.com',
        SEED_ADMIN_PASSWORD: 'Password123',
        SEED_ADMIN_PHONE: '+14155550000',
        SEED_ADMIN_ADDRESS: '1 Admin Street',
        SEED_ADMIN_ANSWER: 'blue',
        SEED_ADMIN_DOB: '2000-01-01',
      },
    },
    {
      command: 'npm start --prefix ./client',
      url: 'http://127.0.0.1:3000',
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        CI: 'true',
        BROWSER: 'none',
        PORT: '3000',
      },
    },
  ],
});
