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

test.describe("Admin users", () => {
  // Lim Kok Liang, A0252776U
  test("admin can access users page", async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto("/dashboard/admin/users");
    await expect(page.getByRole("heading", { name: "All Users" })).toBeVisible();
    await expect(page.getByText("Admin Panel")).toBeVisible();
  });
});
