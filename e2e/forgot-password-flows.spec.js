// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUser = (prefix = "forgot-password") => {
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

const submitForgotPassword = async (page, { email, answer, newPassword }) => {
  await page.getByPlaceholder(/Enter Your Email/i).fill(email ?? "");
  await page.getByPlaceholder("Enter Your Security Answer").fill(answer ?? "");
  await page.getByPlaceholder("Enter Your New Password").fill(newPassword ?? "");
  await page.getByRole("button", { name: "RESET PASSWORD" }).click();
};

const loginViaUi = async (page, email, password) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
};

test.describe("Forgot Password E2E flows", () => {
  test.describe("Atomic linear workflows", () => {
    test("invalid reset flow: non-existent email shows error and stays on forgot-password", async ({ page }) => {
    const user = buildUser("reset-missing-user");

    await page.goto("/forgot-password");

    const forgotPasswordResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/auth/forgot-password") &&
        response.request().method() === "POST" &&
        response.status() === 400,
    );

    await submitForgotPassword(page, {
      email: user.email,
      answer: "any-answer",
      newPassword: "Password999",
    });
    await forgotPasswordResponse;

    await expect(page.getByText(/Invalid Email or Answer|Wrong Email or Answer/i)).toBeVisible();
    await expect(page).toHaveURL(/\/forgot-password$/);
    });

    test("empty and short-password submissions: validation errors and no forgot-password API call", async ({ page }) => {
    let forgotPasswordRequestCount = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/forgot-password")) {
        forgotPasswordRequestCount += 1;
      }
    });

    await page.goto("/forgot-password");

    await page.getByRole("button", { name: "RESET PASSWORD" }).click();

    const allMissingValidity = await page.evaluate(() => {
      const email = document.querySelector('input[placeholder="Enter Your Email "]');
      const answer = document.querySelector('input[placeholder="Enter Your Security Answer"]');
      const newPassword = document.querySelector('input[placeholder="Enter Your New Password"]');

      return {
        emailMissing: email ? email.validity.valueMissing : false,
        answerMissing: answer ? answer.validity.valueMissing : false,
        newPasswordMissing: newPassword ? newPassword.validity.valueMissing : false,
      };
    });

    expect(allMissingValidity.emailMissing).toBe(true);
    expect(allMissingValidity.answerMissing).toBe(true);
    expect(allMissingValidity.newPasswordMissing).toBe(true);
    expect(forgotPasswordRequestCount).toBe(0);

    await submitForgotPassword(page, {
      email: "user@example.com",
      answer: "",
      newPassword: "",
    });

    const answerAndPasswordMissingValidity = await page.evaluate(() => {
      const answer = document.querySelector('input[placeholder="Enter Your Security Answer"]');
      const newPassword = document.querySelector('input[placeholder="Enter Your New Password"]');

      return {
        answerMissing: answer ? answer.validity.valueMissing : false,
        newPasswordMissing: newPassword ? newPassword.validity.valueMissing : false,
      };
    });

    expect(answerAndPasswordMissingValidity.answerMissing).toBe(true);
    expect(answerAndPasswordMissingValidity.newPasswordMissing).toBe(true);
    expect(forgotPasswordRequestCount).toBe(0);

    await submitForgotPassword(page, {
      email: "user@example.com",
      answer: "blue",
      newPassword: "",
    });

    const passwordMissingValidity = await page.evaluate(() => {
      const newPassword = document.querySelector('input[placeholder="Enter Your New Password"]');
      return {
        newPasswordMissing: newPassword ? newPassword.validity.valueMissing : false,
      };
    });

    expect(passwordMissingValidity.newPasswordMissing).toBe(true);
    expect(forgotPasswordRequestCount).toBe(0);

    await submitForgotPassword(page, {
      email: "user@example.com",
      answer: "blue",
      newPassword: "123",
    });
    await expect(page.getByText(/New password must be at least 6 characters long/i)).toBeVisible();
    expect(forgotPasswordRequestCount).toBe(0);
    await expect(page).toHaveURL(/\/forgot-password$/);
    });
  });

  test.describe("Cross workflows", () => {
    test("valid reset flow: reset succeeds, old password fails, new password logs in", async ({ page }) => {
      const user = buildUser("reset-valid");
      const newPassword = "Password456";

      await registerUserViaUi(page, user);

      await page.goto("/login");
      await page.getByRole("button", { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/\/forgot-password$/);

      const forgotPasswordResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/forgot-password") &&
          response.request().method() === "POST" &&
          response.status() === 200,
      );

      await submitForgotPassword(page, {
        email: user.email,
        answer: user.answer,
        newPassword,
      });
      await forgotPasswordResponse;

      await expect(page.getByText(/Password Reset Successfully/i)).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);

      await loginViaUi(page, user.email, user.password);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/Invalid Email or Password/i)).toBeVisible();

      await loginViaUi(page, user.email, newPassword);
      await expect(page).toHaveURL("/");
      await expect(page.getByText(user.name)).toBeVisible();
      await expect(page.getByRole("link", { name: "Login" })).toHaveCount(0);
    });

    test("invalid reset flow: wrong answer keeps old password unchanged", async ({ page }) => {
      const user = buildUser("reset-wrong-answer");
      const newPassword = "Password789";

      await registerUserViaUi(page, user);

      await page.goto("/forgot-password");

      const forgotPasswordResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/auth/forgot-password") &&
          response.request().method() === "POST" &&
          response.status() === 400,
      );

      await submitForgotPassword(page, {
        email: user.email,
        answer: "wrong-answer",
        newPassword,
      });
      await forgotPasswordResponse;

      await expect(page.getByText(/Invalid Email or Answer|Wrong Email or Answer/i)).toBeVisible();
      await expect(page).toHaveURL(/\/forgot-password$/);

      await loginViaUi(page, user.email, user.password);
      await expect(page).toHaveURL("/");
      await expect(page.getByText(user.name)).toBeVisible();

      await page.goto("/login");
      await loginViaUi(page, user.email, newPassword);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/Invalid Email or Password/i)).toBeVisible();
    });
  });
});
