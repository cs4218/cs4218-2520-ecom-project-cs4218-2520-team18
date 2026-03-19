import { test, expect } from "@playwright/test";

const adminCredentials = {
  email: "admin@example.com",
  password: "Admin123",
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
  // Lim Kok Liang, A0252776U
  test("admin can view orders and update status", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/orders");
    await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();
    await expect(page.getByText("Order Buyer")).toBeVisible();

    const statusSelect = page.locator(".ant-select").first();
    await statusSelect.click();
    await page
      .locator(".ant-select-item-option", { hasText: "Shipped" })
      .click();

    await expect(
      page.locator(".ant-select-selection-item", { hasText: "Shipped" }).first()
    ).toBeVisible();
  });
});
