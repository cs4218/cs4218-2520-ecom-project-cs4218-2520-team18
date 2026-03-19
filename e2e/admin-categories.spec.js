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

test.describe("Admin categories", () => {
  // Lim Kok Liang, A0252776U
  test("admin can create, update, and delete a category", async ({ page }) => {
    const timestamp = Date.now();
    const categoryName = `E2E Category ${timestamp}`;
    const updatedCategoryName = `E2E Category Updated ${timestamp}`;

    await loginAsAdmin(page);
    await page.goto("/dashboard/admin/create-category");
    await expect(page.getByRole("heading", { name: "Manage Category" })).toBeVisible();

    const createCategoryPanel = page.locator(".p-3.w-50");
    const createInput = createCategoryPanel.locator(
      "input[placeholder='Enter new category']"
    );
    await expect(createInput).toBeVisible();
    await createInput.fill(categoryName);
    await createCategoryPanel.getByRole("button", { name: "Submit" }).click();

    const row = page.getByRole("row", { name: new RegExp(categoryName) });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Edit" }).click();
    const modal = page.locator(".ant-modal");
    await modal.getByPlaceholder("Enter new category").fill(updatedCategoryName);
    await modal.getByRole("button", { name: "Submit" }).click();

    const updatedRow = page.getByRole("row", { name: new RegExp(updatedCategoryName) });
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(updatedCategoryName)).toHaveCount(0);
  });
});
