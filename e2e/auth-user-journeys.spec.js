// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUniqueUser = () => {
  const unique = Date.now().toString();
  return {
    name: `E2E User ${unique}`,
    email: `e2e.user.${unique}@example.com`,
    password: "Password123",
    newPassword: "Password456",
    phone: "+14155552671",
    address: "123 E2E Street",
    dob: "2000-01-01",
    answer: "blue",
  };
};

const registerUser = async (page, user) => {
  await page.goto("/register");
  await page.getByPlaceholder("Enter Your Name").fill(user.name);
  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);
  await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
  await page.getByPlaceholder("Enter Your Address").fill(user.address);
  await page.getByPlaceholder("Enter Your DOB").fill(user.dob);
  await page.getByPlaceholder("What is Your Favorite sports").fill(user.answer);
  await page.getByRole("button", { name: "REGISTER" }).click();
  await expect(page).toHaveURL(/\/login$/);
};

const loginUser = async (page, email, password) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL("/");
};

const openUserDashboard = async (page, userName) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: userName })).toBeVisible();
  await page.getByRole("button", { name: userName }).first().click();
  await page.getByRole("link", { name: /^Dashboard$/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/user$/);
};

const updateProfileName = async (page, userName, password, updatedName) => {
  await openUserDashboard(page, userName);
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);

  await page.getByPlaceholder("Enter Your Name").fill(updatedName);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "UPDATE", exact: true }).click();

  await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
  await expect(page.getByRole("button", { name: updatedName })).toBeVisible();
};

const logoutFromNavbar = async (page, displayedName) => {
  await page.goto("/");
  await page.getByRole("button", { name: displayedName }).first().click();
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
};

test.describe("UI E2E Journeys", () => {
  test.describe("Cross workflows", () => {
    // Loh Ze Qing Norbert, A0277473R
    test("register -> login -> home reflects authenticated header state", async ({
      page,
    }) => {
      const user = buildUniqueUser();

      await registerUser(page, user);
      await loginUser(page, user.email, user.password);

      await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
      await expect(page.getByText(user.name)).toBeVisible();
    });

    // Loh Ze Qing Norbert, A0277473R
    test("register -> forgot password reset -> login with new password", async ({
      page,
    }) => {
      const user = buildUniqueUser();

      await registerUser(page, user);

      await page.getByRole("button", { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/\/forgot-password$/);

      await page.getByPlaceholder(/Enter Your Email/i).fill(user.email);
      await page
        .getByPlaceholder("Enter Your Security Answer")
        .fill(user.answer);
      await page
        .getByPlaceholder("Enter Your New Password")
        .fill(user.newPassword);
      await page.getByRole("button", { name: "RESET PASSWORD" }).click();

      await expect(page).toHaveURL(/\/login$/);

      await loginUser(page, user.email, user.newPassword);
      await expect(page.getByText(user.name)).toBeVisible();
      await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
    });

    // Loh Ze Qing Norbert, A0277473R
    test("register -> login -> update profile -> logout -> protected route blocked -> re-login", async ({
      page,
    }) => {
      const user = buildUniqueUser();
      const updatedName = `Updated ${Date.now()}`;

      await registerUser(page, user);
      await loginUser(page, user.email, user.password);

      await updateProfileName(page, user.name, user.password, updatedName);

      await logoutFromNavbar(page, updatedName);
      const authAfterLogout = await page.evaluate(() =>
        localStorage.getItem("auth"),
      );
      expect(authAfterLogout).toBeNull();

      await page.goto("/dashboard/user");
      await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
      await expect(page).toHaveURL(/\/$|\/login$/, { timeout: 12000 });

      await loginUser(page, user.email, user.password);
      await expect(
        page.getByRole("button", { name: updatedName }),
      ).toBeVisible();

      await openUserDashboard(page, updatedName);
      const dashboardCard = page.locator(".card.w-75.p-3");
      await expect(dashboardCard).toContainText(updatedName);
      await expect(dashboardCard).toContainText(user.email);
    });
  });
});
