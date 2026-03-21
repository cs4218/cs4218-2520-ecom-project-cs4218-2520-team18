// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUser = (prefix = "login") => {
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
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
};

const openUserDashboardFromHeader = async (page, userName) => {
  await page.goto("/");
  await page.getByRole("button", { name: userName }).first().click();
  await page.getByRole("link", { name: /^Dashboard$/ }).click();
  await expect(page).toHaveURL(/\/dashboard\/user$/);
};

test.describe("Login E2E flows", () => {
  test.describe("Atomic linear workflows", () => {
    test("valid login flow", async ({ page }) => {
    const user = buildUser("valid-login");

    await registerUserViaUi(page, user);

    const loginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/login") &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );

    await loginViaUi(page, user.email, user.password);
    await loginPromise;

    await expect(page).toHaveURL("/");

    const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("auth")));
    expect(auth).toBeTruthy();
    expect(auth.token).toBeTruthy();
    expect(auth.user.name).toBe(user.name);
    expect(auth.user.email).toBe(user.email);
    expect(auth.user.role).toBe(0);

    await expect(page.getByText(user.name)).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Register" })).toHaveCount(0);
    });

    test("invalid login flow: existing email + wrong password shows error and does not persist auth", async ({ page }) => {
    const user = buildUser("wrong-password");

    await registerUserViaUi(page, user);
    await page.goto("/login");

    const beforeAuth = await page.evaluate(() => globalThis.localStorage.getItem("auth"));
    expect(beforeAuth).toBeNull();

    await loginViaUi(page, user.email, `${user.password}-wrong`);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/Invalid Email or Password/i)).toBeVisible();

    const afterAuth = await page.evaluate(() => globalThis.localStorage.getItem("auth"));
    expect(afterAuth).toBeNull();
    });

    test("invalid login flow: non-existent email shows error and does not persist auth", async ({ page }) => {
    const user = buildUser("non-existent");

    await page.goto("/login");

    const beforeAuth = await page.evaluate(() => globalThis.localStorage.getItem("auth"));
    expect(beforeAuth).toBeNull();

    await loginViaUi(page, user.email, user.password);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/Invalid Email or Password/i)).toBeVisible();

    const afterAuth = await page.evaluate(() => globalThis.localStorage.getItem("auth"));
    expect(afterAuth).toBeNull();
    });

    test("malformed email: blocks API call", async ({ page }) => {
    let requestSent = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/login")) {
        requestSent = true;
      }
    });

    await page.goto("/login");
    await loginViaUi(page, "notanemail", "Password123");

    const emailInput = page.getByPlaceholder("Enter Your Email");
    const isInvalid = await emailInput.evaluate((element) => !element.checkValidity());

    expect(isInvalid).toBe(true);
    expect(requestSent).toBe(false);
    });

    test("empty fields submission: both empty blocks submit and no login API call", async ({ page }) => {
    let requestSent = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/login")) {
        requestSent = true;
      }
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(requestSent).toBe(false);

    const validity = await page.evaluate(() => {
      const email = document.querySelector('input[placeholder="Enter Your Email"]');
      const password = document.querySelector('input[placeholder="Enter Your Password"]');
      return {
        emailMissing: email ? email.validity.valueMissing : false,
        passwordMissing: password ? password.validity.valueMissing : false,
      };
    });

    expect(validity.emailMissing).toBe(true);
    expect(validity.passwordMissing).toBe(true);
    });

    test("empty password submission: email filled but password empty blocks submit and no login API call", async ({ page }) => {
    let requestSent = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/login")) {
        requestSent = true;
      }
    });

    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Email").fill("filled@example.com");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(requestSent).toBe(false);

    const passwordMissing = await page.getByPlaceholder("Enter Your Password").evaluate((element) => {
      const input = element;
      return input.validity.valueMissing;
    });
    expect(passwordMissing).toBe(true);
    });

    test("empty email submission: password filled but email empty blocks submit and no login API call", async ({ page }) => {
    let requestSent = false;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/login")) {
        requestSent = true;
      }
    });

    await page.goto("/login");
    await page.getByPlaceholder("Enter Your Password").fill("Password123");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(page).toHaveURL(/\/login$/);
    expect(requestSent).toBe(false);

    const emailMissing = await page.getByPlaceholder("Enter Your Email").evaluate((element) => {
      const input = element;
      return input.validity.valueMissing;
    });
    expect(emailMissing).toBe(true);
    });
  });

  test.describe("Cross workflows", () => {

  // Loh Ze Qing Norbert, A0277473R
    test("login session survives refresh and is revoked after logout for protected routes", async ({ page }) => {
    const user = buildUser("refresh-guard");

    await registerUserViaUi(page, user);
    await page.goto("/login");

    await loginViaUi(page, user.email, user.password);
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: user.name })).toBeVisible();

    const authAfterLogin = await page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "null"));
    expect(authAfterLogin?.token).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("button", { name: user.name })).toBeVisible();

    await openUserDashboardFromHeader(page, user.name);
    await expect(page.locator("h3", { hasText: user.email })).toBeVisible();

    await page.goto("/");
    await page.getByRole("button", { name: user.name }).first().click();
    await page.getByRole("link", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login$/);

    const authAfterLogout = await page.evaluate(() => localStorage.getItem("auth"));
    expect(authAfterLogout).toBeNull();

    await page.goto("/dashboard/user");
    await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
    await expect(page).toHaveURL(/\/$|\/login$/, { timeout: 12000 });
    });
  });
});
