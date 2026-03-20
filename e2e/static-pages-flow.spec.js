import { test, expect } from '@playwright/test';

test.describe('Static Pages & 404', () => {
  test('About page: title, content, image, layout', async ({ page }) => {
    await page.goto('http://localhost:3000/about');
    await expect(page).toHaveTitle(/about us/i);
    await expect(page.getByText(/add text/i)).toBeVisible();
    await expect(page.locator('img[alt="contactus"]')).toBeVisible();
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });

  test('Contact page: title, content, image, layout', async ({ page }) => {
    await page.goto('http://localhost:3000/contact');
    await expect(page).toHaveTitle(/contact us/i);
    await expect(page.getByText(/contact us/i)).toBeVisible();
    await expect(page.getByText(/for any query/i)).toBeVisible();
    await expect(page.locator('img[alt="contactus"]')).toBeVisible();
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });

  test('Policy page: title, content, image, layout', async ({ page }) => {
    await page.goto('http://localhost:3000/policy');
    await expect(page).toHaveTitle(/privacy policy/i);
    await expect(
      page.locator('text=/add privacy policy/i').first(),
    ).toBeVisible();
    await expect(page.locator('img[alt="contactus"]')).toBeVisible();
    await expect(page.getByText(/all rights reserved/i)).toBeVisible();
  });

  test('404 page: title, content, layout, Go Back', async ({ page }) => {
    await page.goto('http://localhost:3000/nonexistent-page-404');
    await expect(page.getByText(/oops ! page not found/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /go back/i })).toBeVisible();
    await page.getByRole('link', { name: /go back/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
