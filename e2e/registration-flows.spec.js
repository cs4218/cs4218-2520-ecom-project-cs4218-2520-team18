// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const buildUser = (prefix = "register") => {
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

const fillRegistrationForm = async (page, user) => {
  await page.getByPlaceholder("Enter Your Name").fill(user.name);
  await page.getByPlaceholder("Enter Your Email").fill(user.email);
  await page.getByPlaceholder("Enter Your Password").fill(user.password);
  await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
  await page.getByPlaceholder("Enter Your Address").fill(user.address);
  await page.getByPlaceholder("Enter Your DOB").fill(user.dob);
  await page.getByPlaceholder("What is Your Favorite sports").fill(user.answer);
};

const submitRegistration = async (page) => {
  await page.getByRole("button", { name: "REGISTER" }).click();
};

const loginFromUi = async (page, email, password) => {
  await page.goto("/login");
  await page.getByPlaceholder("Enter Your Email").fill(email);
  await page.getByPlaceholder("Enter Your Password").fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
};

const expectLoginFailureUi = async (page, email, password) => {
  await loginFromUi(page, email, password);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/Invalid Email or Password|Something went wrong/i)).toBeVisible();
};

const expectLoginSuccessUi = async (page, email, password, expectedName) => {
  await loginFromUi(page, email, password);
  await expect(page).toHaveURL("/");
  await expect(page.getByText(expectedName)).toBeVisible();
};

test.describe("Registration E2E flows", () => {
  test.describe("Atomic linear workflows", () => {
  // Loh Ze Qing Norbert, A0277473R
    test("invalid registration flow: malformed email -> error, no redirect, no successful login", async ({ page }) => {
    const user = buildUser("invalid-email");

    await page.goto("/register");
    await fillRegistrationForm(page, { ...user, email: "invalid@localhost" });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText(/Invalid Email|Invalid Email Format/i)).toBeVisible();

    await expectLoginFailureUi(page, user.email, user.password);
    });

  // Loh Ze Qing Norbert, A0277473R
    test("invalid registration flow: short password -> error, no redirect, no successful login", async ({ page }) => {
    const user = buildUser("short-password");

    await page.goto("/register");
    await fillRegistrationForm(page, { ...user, password: "123" });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Password must be at least 6 characters long")).toBeVisible();

    await expectLoginFailureUi(page, user.email, user.password);
    });

  // Loh Ze Qing Norbert, A0277473R
    test("invalid registration flow: empty name -> error and stays on register", async ({ page }) => {
    const user = buildUser("missing-name");

    await page.goto("/register");
    await fillRegistrationForm(page, { ...user, name: "   " });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Name should be 1 to 100 characters")).toBeVisible();

    await expectLoginFailureUi(page, user.email, user.password);
    });

  // Loh Ze Qing Norbert, A0277473R
    test("invalid registration flow: invalid phone -> error, no redirect, no successful login", async ({ page }) => {
    const user = buildUser("invalid-phone");

    await page.goto("/register");
    await fillRegistrationForm(page, { ...user, phone: "invalid-phone" });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Phone number must be in E.164 format")).toBeVisible();

    await expectLoginFailureUi(page, user.email, user.password);
    });

  // Loh Ze Qing Norbert, A0277473R
    test("invalid registration flow: missing answer -> error, no redirect, no successful login", async ({ page }) => {
    const user = buildUser("missing-answer");

    await page.goto("/register");
    await fillRegistrationForm(page, { ...user, answer: "   " });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Answer is required")).toBeVisible();

    await expectLoginFailureUi(page, user.email, user.password);
    });
  });

  test.describe("Cross workflows", () => {
    // Loh Ze Qing Norbert, A0277473R
    test("valid registration flow: register -> success toast -> redirect to login -> successful login", async ({ page }) => {
      const user = buildUser("valid");

      await page.goto("/register");
      await fillRegistrationForm(page, user);
      await submitRegistration(page);

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByText(/Register Successfully, please login/i)).toBeVisible();

      await expectLoginSuccessUi(page, user.email, user.password, user.name);
    });

  // Loh Ze Qing Norbert, A0277473R
    test("duplicate email flow: same email rejected, stays on register, original account preserved", async ({ page }) => {
    const existingUser = buildUser("duplicate-existing");
    const duplicateAttemptPassword = "Password999";

    await page.goto("/register");
    await fillRegistrationForm(page, existingUser);
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/Register Successfully, please login/i)).toBeVisible();

    await page.goto("/register");
    await fillRegistrationForm(page, {
      ...existingUser,
      password: duplicateAttemptPassword,
      name: "Duplicate Attempt User",
      phone: "+14155550000",
      address: "999 Duplicate Lane",
    });
    await submitRegistration(page);

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByText("Already registered, please login")).toBeVisible();

    await expectLoginFailureUi(page, existingUser.email, duplicateAttemptPassword);
    await expectLoginSuccessUi(page, existingUser.email, existingUser.password, existingUser.name);
    });
  });
});
