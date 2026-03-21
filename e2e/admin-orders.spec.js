import { test, expect } from "@playwright/test";

const adminCredentials = {
  email: process.env.SEED_ADMIN_EMAIL || "admin.e2e@example.com",
  password: process.env.SEED_ADMIN_PASSWORD || "Password123",
};

const loginAsAdmin = async (page) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email").fill(adminCredentials.email);
  await page.getByPlaceholder("Enter Your Password").fill(adminCredentials.password);
  const loginResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/auth/login") && response.status() === 200
  );
  await page.getByRole("button", { name: "LOGIN" }).click();
  await loginResponse;
  await page.waitForFunction(() => {
    const authRaw = localStorage.getItem("auth");
    if (!authRaw) return false;
    try {
      const auth = JSON.parse(authRaw);
      return !!auth?.token;
    } catch {
      return false;
    }
  });
  await page.waitForURL("**/");
};

test.describe("Admin orders", () => {
  test.describe("success cases", () => {
    // Lim Kok Liang, A0252776U
    test("admin can view orders and update status", async ({ page }) => {
      await loginAsAdmin(page);

      await page.goto("/dashboard/admin/orders");
      await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();
      const statusSelect = page.locator(".ant-select").first();
      if ((await statusSelect.count()) > 0) {
        await statusSelect.click();
        await page
          .locator(".ant-select-item-option", { hasText: "Shipped" })
          .click();

        await expect(
          page.locator(".ant-select-selection-item", { hasText: "Shipped" }).first()
        ).toBeVisible();
      }
    });
  });

  test.describe("fail cases", () => {
    test("unauthenticated user is redirected away from admin orders page", async ({ page }) => {
      await page.goto("/dashboard/admin/orders");

      await page.waitForURL("**/login");
      await expect(page.getByRole("heading", { name: "LOGIN FORM" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "All Orders" })).toHaveCount(0);
    });
  });
});
