// Sherwyn Ng, A0255132N
import { test, expect } from '@playwright/test';

const buildUniqueUser = () => {
  const unique = Date.now().toString();
  return {
    name: `E2E User ${unique}`,
    email: `e2e.user.${unique}@example.com`,
    password: 'Password123',
    newPassword: 'Password456',
    phone: '+14155552671',
    address: '123 E2E Street',
    dob: '2000-01-01',
    answer: 'blue',
  };
};

const registerUser = async (page, user) => {
  await page.goto('/register');
  await page.getByPlaceholder('Enter Your Name').fill(user.name);
  await page.getByPlaceholder('Enter Your Email').fill(user.email);
  await page.getByPlaceholder('Enter Your Password').fill(user.password);
  await page.getByPlaceholder('Enter Your Phone').fill(user.phone);
  await page.getByPlaceholder('Enter Your Address').fill(user.address);
  await page.getByPlaceholder('Enter Your DOB').fill(user.dob);
  await page.getByPlaceholder('What is Your Favorite sports').fill(user.answer);
  await page.getByRole('button', { name: 'REGISTER' }).click();
  await expect(page).toHaveURL(/\/login$/);
};

const loginUser = async (page, email, password) => {
  await page.goto('/login');
  await page.getByPlaceholder('Enter Your Email').fill(email);
  await page.getByPlaceholder('Enter Your Password').fill(password);
  await page.getByRole('button', { name: 'LOGIN' }).click();
  await expect(page).toHaveURL('/');
};

test.describe('Header UI & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should render brand logo, nav links, and cart badge', async ({
    page,
  }) => {
    await expect(
      page.getByRole('link', { name: /virtual vault/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cart/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cart/i })).toBeVisible();
  });

  test('should update cart badge when cart changes', async ({ page }) => {
    await page
      .getByRole('button', { name: /add to cart/i })
      .first()
      .click();
    await expect(page.locator('.ant-badge .ant-scroll-number')).toHaveText('1');
  });

  test('guest should see Login and Register', async ({ page }) => {
    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /register/i })).toBeVisible();
  });

  test('logged-in user should see user dropdown and logout', async ({
    page,
  }) => {
    const user = buildUniqueUser();
    await registerUser(page, user);
    await loginUser(page, user.email, user.password);

    // await page.getByRole('link', { name: /login/i }).click();
    // await page.getByPlaceholder('Enter Your Email').fill('test@test.com');
    // await page.getByPlaceholder('Enter Your Password').fill('test123');
    // await page.getByRole('button', { name: /login/i }).click();

    await expect(
      page.getByRole('button', { name: new RegExp(user.name, 'i') }),
    ).toBeVisible();
    // await expect(page.getByRole('button', { name: /test/i })).toBeVisible();
    // await page.getByRole('button', { name: /test/i }).click();
    await page
      .getByRole('button', { name: new RegExp(user.name, 'i') })
      .click();
    await expect(page.getByRole('link', { name: /logout/i })).toBeVisible();
  });

  test('logout should update header and redirect', async ({ page }) => {
    // await page.getByRole('link', { name: /login/i }).click();
    // await page.getByPlaceholder('Enter Your Email').fill('test@test.com');
    // await page.getByPlaceholder('Enter Your Password').fill('test123');
    // await page.getByRole('button', { name: /login/i }).click();
    const user = buildUniqueUser();
    await registerUser(page, user);
    await loginUser(page, user.email, user.password);

    // await page.getByRole('button', { name: /test/i }).click();
    await page
      .getByRole('button', { name: new RegExp(user.name, 'i') })
      .click();
    await page.getByRole('link', { name: /logout/i }).click();

    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login as regular user redirects to /dashboard/user', async ({
    page,
  }) => {
    const user = buildUniqueUser();
    await registerUser(page, user);
    await loginUser(page, user.email, user.password);
    // await page.getByRole('link', { name: /login/i }).click();
    // await page.getByPlaceholder('Enter Your Email').fill('test@test.com');
    // await page.getByPlaceholder('Enter Your Password').fill('test123');
    // await page.getByRole('button', { name: /login/i }).click();

    // await page.getByRole('button', { name: /test/i }).click();
    await page
      .getByRole('button', { name: new RegExp(user.name, 'i') })
      .click();
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard\/user/);
  });

  test('login as admin redirects to /dashboard/admin', async ({ page }) => {
    await page.getByRole('link', { name: /login/i }).click();
    await page
      .getByPlaceholder('Enter Your Email')
      .fill('admin.e2e@example.com');
    await page.getByPlaceholder('Enter Your Password').fill('Password123');
    await page.getByRole('button', { name: /login/i }).click();

    // await page.getByRole('button', { name: /admin/i }).click();
    await page.getByRole('button', { name: /E2E Admin User/i }).click();
    await page.getByRole('link', { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/dashboard\/admin/);
  });

  test('clicking brand logo from non-homepage redirects to homepage', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/cart');
    await page.getByRole('link', { name: /virtual vault/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('open categories dropdown and verify categories load', async ({
    page,
  }) => {
    await page.getByRole('link', { name: /categories/i }).click();
    await expect(
      page.getByRole('link', { name: /all categories/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /electronics/i }),
    ).toBeVisible();
  });

  test('select category navigates to correct page', async ({ page }) => {
    await page.getByRole('link', { name: /categories/i }).click();
    await page.getByRole('link', { name: /electronics/i }).click();
    await expect(page).toHaveURL(/category\/electronics/);
  });
});
