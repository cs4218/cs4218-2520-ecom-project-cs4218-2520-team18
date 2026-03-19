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

test.describe("Admin products fail cases", () => {
  test("admin cannot create product without selecting category", async ({ page }) => {
    const timestamp = Date.now();
    const productName = `E2E Invalid Product ${timestamp}`;

    await loginAsAdmin(page);
    await page.goto("/dashboard/admin/create-product");
    await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();

    await page.getByPlaceholder("write a name").fill(productName);
    await page.getByPlaceholder("write a description").fill("Missing category should fail");
    await page.getByPlaceholder("write a Price").fill("99.99");
    await page.getByPlaceholder("write a quantity").fill("5");

    const createProductResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/product/create-product") &&
      response.status() >= 400
    );

    await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
    await createProductResponse;

    await expect(page).toHaveURL(/\/dashboard\/admin\/create-product/);
    await expect(page.getByText(/something went wrong/i)).toBeVisible();
  });
});
