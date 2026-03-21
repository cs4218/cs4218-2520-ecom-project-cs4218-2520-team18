// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUser = (prefix = "profile") => {
  const unique = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  return {
    name: `E2E ${prefix} User`,
    email: `${unique}@example.com`,
    password: "Password123",
    phone: "+14155552671",
    address: "123 E2E Street",
    dob: "2000-01-01",
    answer: "blue",
  };
};

const registerUserViaUi = async (page, user) => {
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

const loginViaUi = async (page, email, password) => {
  const loginPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST" &&
      response.status() === 200,
  );

  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await loginPromise;

  await expect(page).toHaveURL("/");
};

const openDashboardPage = async (page, userName) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: userName })).toBeVisible();

  await page.getByRole("button", { name: userName }).first().click();
  await page.getByRole("link", { name: /^Dashboard$/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/user$/);
};

const openProfilePage = async (page, userName) => {
  await openDashboardPage(page, userName);
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);
  await expect(page.getByPlaceholder("Enter Your Name")).toBeVisible();
};

const setupProfileRequestMonitor = (page) => {
  let requestSent = false;
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/auth/profile") && request.method() === "PUT") {
      requestSent = true;
    }
  });

  return () => requestSent;
};

const clickUpdate = async (page) => {
  await page.getByRole("button", { name: "UPDATE", exact: true }).click();
};

const getAuthUserName = async (page) =>
  page.evaluate(() => {
    const authRaw = localStorage.getItem("auth");
    if (!authRaw) return null;
    const auth = JSON.parse(authRaw);
    return auth?.user?.name ?? null;
  });

const logoutFromNavbar = async (page, displayName) => {
  await page.goto("/");
  await page.getByRole("button", { name: displayName }).first().click();
  await page.getByRole("link", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login$/);
};

test.describe("Profile E2E flows", () => {
  test.describe("Atomic linear workflows", () => {
    test("valid profile update: name change updates profile, header, and dashboard", async ({ page }) => {
    const user = buildUser("valid-update");
    const updatedName = `Updated ${Date.now()}`;

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your Name").fill(updatedName);
    await page.getByPlaceholder("Enter Your Password").fill(user.password);
    await clickUpdate(page);

    expect(wasProfileRequestSent()).toBe(true);
    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(updatedName);
    await expect(page.getByRole("button", { name: updatedName })).toBeVisible();

    const updatedAuthName = await getAuthUserName(page);
    expect(updatedAuthName).toBe(updatedName);

    await openDashboardPage(page, updatedName);
    const dashboardCard = page.locator(".card.w-75.p-3");
    await expect(dashboardCard).toContainText(updatedName);
    await expect(dashboardCard).toContainText(user.email);
    });

    test("invalid profile update: empty name shows error, stays on profile, and keeps persisted name", async ({ page }) => {
    const user = buildUser("empty-name");

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your Name").fill("   ");
    await clickUpdate(page);

    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);
    await expect(page.getByText("Name should be 1 to 100 characters")).toBeVisible();
    expect(wasProfileRequestSent()).toBe(false);

    const authName = await getAuthUserName(page);
    expect(authName).toBe(user.name);

    await expect(page.getByRole("button", { name: user.name })).toBeVisible();

    await openDashboardPage(page, user.name);
    const dashboardCard = page.locator(".card.w-75.p-3");
    await expect(dashboardCard).toContainText(user.name);
    await expect(dashboardCard).toContainText(user.email);
    });

    test("persistence after refresh: updated name remains in profile, header, and dashboard", async ({ page }) => {
    const user = buildUser("persist-name");
    const persistedName = `Persisted ${Date.now()}`;

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your Name").fill(persistedName);
    await page.getByPlaceholder("Enter Your Password").fill(user.password);
    await clickUpdate(page);

    await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
    expect(wasProfileRequestSent()).toBe(true);
    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(persistedName);
    const persistedAuthName = await getAuthUserName(page);
    expect(persistedAuthName).toBe(persistedName);

    await page.goto("/");
    await expect(page.getByRole("button", { name: persistedName })).toBeVisible();

    await openProfilePage(page, persistedName);
    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(persistedName);

    await openDashboardPage(page, persistedName);
    const dashboardCard = page.locator(".card.w-75.p-3");
    await expect(dashboardCard).toContainText(persistedName);
    await expect(dashboardCard).toContainText(user.email);
    });

    test("invalid field validation: short password is rejected with no profile API call", async ({ page }) => {
    const user = buildUser("invalid-short-password");

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your Password").fill("123");
    await clickUpdate(page);

    await expect(page.getByText("Password must be at least 6 characters")).toBeVisible();
    expect(wasProfileRequestSent()).toBe(false);
    });

    test("invalid field validation: invalid phone format is rejected with no profile API call", async ({ page }) => {
    const user = buildUser("invalid-phone");

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your Phone Number").fill("invalid-phone");
    await clickUpdate(page);

    await expect(page.getByText("Phone number must be in E.164 format")).toBeVisible();
    expect(wasProfileRequestSent()).toBe(false);
    });

    test("invalid field validation: future DOB is rejected with no profile API call", async ({ page }) => {
    const user = buildUser("future-dob");

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    const wasProfileRequestSent = setupProfileRequestMonitor(page);

    await page.getByPlaceholder("Enter Your DOB").fill("2099-01-01");
    await clickUpdate(page);

    await expect(page.getByText("DOB cannot be in the future")).toBeVisible();
    expect(wasProfileRequestSent()).toBe(false);
    });
  });

  test.describe("Cross workflows", () => {

  // Loh Ze Qing Norbert, A0277473R
    test("profile update persists across logout/login and still passes route guard checks", async ({ page }) => {
    const user = buildUser("profile-logout-relogin");
    const updatedName = `Relogin Name ${Date.now()}`;

    await registerUserViaUi(page, user);
    await loginViaUi(page, user.email, user.password);
    await openProfilePage(page, user.name);

    await page.getByPlaceholder("Enter Your Name").fill(updatedName);
    await page.getByPlaceholder("Enter Your Password").fill(user.password);
    await clickUpdate(page);

    await expect(page.getByText("Profile Updated Successfully")).toBeVisible();
    await expect(page.getByRole("button", { name: updatedName })).toBeVisible();

    await logoutFromNavbar(page, updatedName);

    const authAfterLogout = await page.evaluate(() => localStorage.getItem("auth"));
    expect(authAfterLogout).toBeNull();

    await page.goto("/dashboard/user");
    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await expect(page).toHaveURL(/\/$|\/login$/, { timeout: 12000 });

    await page.goto("/login");
    await loginViaUi(page, user.email, user.password);

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: updatedName })).toBeVisible();

    await openDashboardPage(page, updatedName);
    const dashboardCard = page.locator(".card.w-75.p-3");
    await expect(dashboardCard).toContainText(updatedName);
    await expect(dashboardCard).toContainText(user.email);
    });
  });
});
