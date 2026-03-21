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

test.describe("Admin products", () => {
  test.setTimeout(60_000);

  test.describe("success cases", () => {
    // Lim Kok Liang, A0252776U
    test("admin can create, update, and delete a product", async ({ page }) => {
      const timestamp = Date.now();
      const categoryName = `E2E Category ${timestamp}`;
      const productName = `E2E Product ${timestamp}`;
      const updatedProductName = `E2E Product Updated ${timestamp}`;

      await loginAsAdmin(page);

      await page.goto("/dashboard/admin/create-category");
      await expect(page.getByRole("heading", { name: "Manage Category" })).toBeVisible();
      const createCategoryPanel = page.locator(".p-3.w-50");
      const createInput = createCategoryPanel.locator(
        "input[placeholder='Enter new category']"
      );
      await expect(createInput).toBeVisible();
      await createInput.fill(categoryName);
      const createCategoryResponse = page.waitForResponse((response) =>
        response.url().includes("/api/v1/category/create-category") &&
        response.status() >= 200 &&
        response.status() < 300
      );
      await createCategoryPanel.getByRole("button", { name: "Submit" }).click();
      await createCategoryResponse;
      await expect(page.getByText("somthing went wrong in input form")).toHaveCount(0);
      await expect(page.getByRole("cell", { name: categoryName })).toBeVisible();

      await page.goto("/dashboard/admin/create-product");
      await expect(page.getByRole("heading", { name: "Create Product" })).toBeVisible();
      const categorySelect = page.locator(".ant-select").first();
      await categorySelect.locator(".ant-select-selector").click();
      await page
        .locator(".ant-select-dropdown .ant-select-item-option", { hasText: categoryName })
        .click();

      await page.getByPlaceholder("write a name").fill(productName);
      await page.getByPlaceholder("write a description").fill("E2E description");
      await page.getByPlaceholder("write a Price").fill("99.99");
      await page.getByPlaceholder("write a quantity").fill("5");

      const shippingSelect = page.locator(".ant-select").nth(1);
      await shippingSelect.locator(".ant-select-selector").click();
      await page
        .locator(".ant-select-dropdown .ant-select-item-option", { hasText: /^Yes$/ })
        .click();

      await page.getByRole("button", { name: "CREATE PRODUCT" }).click();
      await page.waitForURL("**/dashboard/admin/products");
      await expect(page.getByText(productName)).toBeVisible();

      await page.getByRole("link", { name: new RegExp(productName) }).click();
      await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

      await page.getByPlaceholder("write a name").fill(updatedProductName);
      await page.getByRole("button", { name: "UPDATE PRODUCT" }).click();
      await page.waitForURL("**/dashboard/admin/products");
      await expect(page.getByText(updatedProductName)).toBeVisible();

      await page
        .getByRole("link", { name: new RegExp(updatedProductName) })
        .click();
      await expect(page.getByRole("heading", { name: "Update Product" })).toBeVisible();

      page.once("dialog", async (dialog) => {
        await dialog.accept("delete");
      });
      await page.getByRole("button", { name: "DELETE PRODUCT" }).click();
      await page.waitForURL("**/dashboard/admin/products");
      await expect(page.getByText(updatedProductName)).toHaveCount(0);
    });
  });

  test.describe("fail cases", () => {
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
});
