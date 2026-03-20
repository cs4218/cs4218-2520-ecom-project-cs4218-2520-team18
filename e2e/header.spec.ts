import { test, expect } from '@playwright/test';

test.describe('Header UI & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should render logo, nav links and cart badge', async ({ page }) => {
    await expect(page.getByText(/brand|logo/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cart/i })).toBeVisible();
  });

  test('guest should see login and register', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('input[name="email"]', 'user@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard\/user/);

    await expect(page.getByText(/logout/i)).toBeVisible();
  });

  test('should login and redirect to admin dashboard', async ({ page }) => {
    await page.click('text=Login');

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard\/admin/);
  });

  test('should logout and update header', async ({ page }) => {
    await page.click('text=Logout');

    await expect(page.getByRole('link', { name: /login/i })).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('clicking logo should redirects to homepage', async ({ page }) => {
    await page.goto('http://localhost:3000/cart');

    await page.click('text=Logo');
    await expect(page).toHaveURL('/');
  });

  test('should navigate via category dropdown', async ({ page }) => {
    await page.click('text=Categories');
    await page.click('text=Electronics');

    await expect(page).toHaveURL(/category\/electronics/);
  });
});
