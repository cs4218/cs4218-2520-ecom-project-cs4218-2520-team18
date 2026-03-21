// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUniqueUser = (prefix = "logout-session") => {
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

const readAuthFromStorage = async (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "null"));

const waitForCategoryRequestAuthorization = async (page, action) => {
  const categoryResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/category/get-category") &&
      response.request().method() === "GET",
    { timeout: 10000 },
  );

  await action();

  const categoryResponse = await categoryResponsePromise;
  const authorizationHeader = categoryResponse.request().headers().authorization;
  return authorizationHeader && authorizationHeader.trim().length > 0
    ? authorizationHeader
    : null;
};

const visitUserDashboardAndCaptureAuthCheck = async (page) => {
  const userAuthResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/user-auth") &&
      response.request().method() === "GET",
    { timeout: 12000 },
  );

  await page.goto("/dashboard/user");
  const userAuthResponse = await userAuthResponsePromise;
  const authHeader = userAuthResponse.request().headers().authorization;

  return {
    status: userAuthResponse.status(),
    authorizationHeader: authHeader && authHeader.trim().length > 0 ? authHeader : null,
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
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/auth/login") &&
      response.request().method() === "POST",
    { timeout: 10000 },
  );

  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  await expect(page).toHaveURL("/");
};

const loginAndOpenUserDashboard = async (page, user) => {
  await registerUserViaUi(page, user);
  await loginViaUi(page, user.email, user.password);

  await page.goto("/dashboard/user");

  await expect(page).toHaveURL(/\/dashboard\/user$/);
  await expect(page.locator("h3", { hasText: user.name })).toBeVisible();
  await expect(page.locator("h3", { hasText: user.email })).toBeVisible();
};

const openUserMenuAndLogout = async (page) => {
  await page.locator("a.nav-link.dropdown-toggle").nth(1).click();
  await page.getByRole("link", { name: "Logout" }).click();
};

const assertLoggedOutNavbarState = async (page, user) => {
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
  await expect(page.getByRole("link", { name: user.name })).toHaveCount(0);
};

test.describe("Logout and session-clearing E2E flows", () => {
  test.describe("Atomic linear workflows", () => {
    test("logout clears auth/session state and removes auth header behavior", async ({ page }) => {
    const user = buildUniqueUser("logout-clears-state");
    await loginAndOpenUserDashboard(page, user);

    const authBeforeLogout = await readAuthFromStorage(page);
    expect(authBeforeLogout).toBeTruthy();
    expect(authBeforeLogout.token).toBeTruthy();
    expect(authBeforeLogout.user?.email).toBe(user.email);

    await page.goto("/about");
    const authCheckBeforeLogout = await visitUserDashboardAndCaptureAuthCheck(page);
    expect(authCheckBeforeLogout.status).toBe(200);
    expect(authCheckBeforeLogout.authorizationHeader).toBe(authBeforeLogout.token);

    await page.goto("/");
    await openUserMenuAndLogout(page);
    await expect(page).toHaveURL(/\/login$/);

    const authAfterLogoutRaw = await page.evaluate(() => localStorage.getItem("auth"));
    expect(authAfterLogoutRaw).toBeNull();

    const authorizationAfterLogout = await waitForCategoryRequestAuthorization(page, async () => {
      await page.goto("/about");
    });
    expect(authorizationAfterLogout).toBeNull();

    await assertLoggedOutNavbarState(page, user);
    });

    test("redirect after logout keeps dashboard content hidden and restores public navbar", async ({ page }) => {
    const user = buildUniqueUser("logout-redirect");
    await loginAndOpenUserDashboard(page, user);

    await openUserMenuAndLogout(page);
    await expect(page).toHaveURL(/\/login$/);

    await expect(page.locator("h3", { hasText: user.name })).toHaveCount(0);
    await expect(page.locator("h3", { hasText: user.email })).toHaveCount(0);
    await assertLoggedOutNavbarState(page, user);
    });

    test("after logout, protected routes remain blocked for /dashboard/user and /dashboard/admin", async ({ page }) => {
    const user = buildUniqueUser("logout-blocked-routes");
    await loginAndOpenUserDashboard(page, user);

    await openUserMenuAndLogout(page);
    await expect(page).toHaveURL(/\/login$/);

    const userAuthResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/user-auth") &&
          response.request().method() === "GET",
        { timeout: 6000 },
      )
      .catch(() => null);

    await page.goto("/dashboard/user");
    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();

    const userAuthResponse = await userAuthResponsePromise;
    if (userAuthResponse) {
      const authHeader = userAuthResponse.request().headers().authorization;
      expect(authHeader && authHeader.trim().length > 0 ? authHeader : null).toBeNull();
      expect([401, 403]).toContain(userAuthResponse.status());
    }

    await expect(page).toHaveURL(/\/$|\/login$/, { timeout: 12000 });
    await expect(page.locator("h3", { hasText: user.name })).toHaveCount(0);
    await expect(page.locator("h3", { hasText: user.email })).toHaveCount(0);

    const adminAuthResponsePromise = page
      .waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/admin-auth") &&
          response.request().method() === "GET",
        { timeout: 6000 },
      )
      .catch(() => null);

    await page.goto("/dashboard/admin");
    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();

    const adminAuthResponse = await adminAuthResponsePromise;
    if (adminAuthResponse) {
      const authHeader = adminAuthResponse.request().headers().authorization;
      expect(authHeader && authHeader.trim().length > 0 ? authHeader : null).toBeNull();
      expect([401, 403]).toContain(adminAuthResponse.status());
    }

    await expect(page).toHaveURL(/\/login$/, { timeout: 12000 });
    await expect(page.getByText(/Admin Name\s*:/i)).toHaveCount(0);
    });
  });

  test.describe("Cross workflows", () => {

    test("re-login after logout restores localStorage auth and dashboard access", async ({ page }) => {
    const user = buildUniqueUser("logout-relogin");
    await loginAndOpenUserDashboard(page, user);

    const authBeforeLogout = await readAuthFromStorage(page);
    expect(authBeforeLogout).toBeTruthy();
    expect(authBeforeLogout.token).toBeTruthy();

    await openUserMenuAndLogout(page);
    await expect(page).toHaveURL(/\/login$/);

    const authAfterLogoutRaw = await page.evaluate(() => localStorage.getItem("auth"));
    expect(authAfterLogoutRaw).toBeNull();

    await loginViaUi(page, user.email, user.password);

    const authAfterRelogin = await readAuthFromStorage(page);
    expect(authAfterRelogin).toBeTruthy();
    expect(authAfterRelogin.token).toBeTruthy();
    expect(authAfterRelogin.user?.email).toBe(user.email);

    await page.goto("/about");
    const authCheckAfterRelogin = await visitUserDashboardAndCaptureAuthCheck(page);
    expect(authCheckAfterRelogin.status).toBe(200);
    expect(authCheckAfterRelogin.authorizationHeader).toBe(authAfterRelogin.token);

    await expect(page.locator("h3", { hasText: user.name })).toBeVisible();
    await expect(page.locator("h3", { hasText: user.email })).toBeVisible();
    });
  });
});