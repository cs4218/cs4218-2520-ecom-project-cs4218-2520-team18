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

test.describe("Admin categories fail cases", () => {
  test("admin sees validation error when creating category with empty name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/dashboard/admin/create-category");
    await expect(page.getByRole("heading", { name: "Manage Category" })).toBeVisible();

    const createCategoryPanel = page.locator(".p-3.w-50");
    const createInput = createCategoryPanel.locator(
      "input[placeholder='Enter new category']"
    );
    await createInput.fill("   ");

    const createCategoryResponse = page.waitForResponse((response) =>
      response.url().includes("/api/v1/category/create-category") &&
      response.status() >= 400
    );

    await createCategoryPanel.getByRole("button", { name: "Submit" }).click();
    await createCategoryResponse;

    await expect(page.getByText("somthing went wrong in input form")).toBeVisible();
  });
});
