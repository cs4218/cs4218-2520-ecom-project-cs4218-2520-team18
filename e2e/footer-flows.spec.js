// Sherwyn Ng, A0255132N
import { test, expect } from '@playwright/test';

test.describe('Footer UI & Navigation', () => {
  const pages = [
    '/',
    '/about',
    '/contact',
    '/policy',
    '/login',
    '/register',
    '/cart',
  ];

  test('footer should render on all main pages', async ({ page }) => {
    for (const path of pages) {
      await page.goto(`http://localhost:3000${path}`);
      await expect(page.getByText(/all rights reserved/i)).toBeVisible();
    }
  });

  test('footer should show correct copyright', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(
      page.getByText(/all rights reserved.*testingcomp/i),
    ).toBeVisible();
  });

  test('clicking About navigates to About page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: /about/i }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test('clicking Contact navigates to Contact page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: /contact/i }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('clicking Privacy Policy navigates to Policy page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: /privacy policy/i }).click();
    await expect(page).toHaveURL(/\/policy$/);
  });
});
