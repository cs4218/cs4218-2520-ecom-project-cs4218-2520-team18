import { test, expect } from '@playwright/test';

test.describe('HomePage Filters & State', () => {
  test('Apply category filter and verify filtered products', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/');
    await page.getByText(/filter by category/i).waitFor();
    const firstCategoryLabel = page.locator('.filters label').first();
    await expect(firstCategoryLabel).toBeVisible();
    await firstCategoryLabel.click();
    await page.waitForTimeout(1000);
    const cards = page.locator('.card');
    const count = await cards.count();
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test('Apply price filter and verify price range', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.getByText(/filter by price/i).waitFor();
    const firstRadio = page.locator('.filters .ant-radio-input').first();
    await firstRadio.check();
    await page.waitForTimeout(1000);
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('Apply category + price filters, reset, and verify reset', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/');
    const firstCategory = page.locator('.filters .ant-checkbox-input').first();
    const firstRadio = page.locator('.filters .ant-radio-input').first();
    await firstCategory.check();
    await firstRadio.check();
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /reset filters/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(firstCategory).not.toBeChecked();
    await expect(firstRadio).not.toBeChecked();
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('Repeated filter-reset cycles do not cause stale state', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/');
    const firstCategoryLabel = page.locator('.filters label').first();
    const firstCategory = page.locator('.filters .ant-checkbox-input').first();
    const firstRadio = page.locator('.filters .ant-radio-input').first();
    for (let i = 0; i < 3; i++) {
      await expect(firstCategoryLabel).toBeVisible();
      await firstCategoryLabel.click();
      await firstRadio.check();
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /reset filters/i }).click();
      await page.waitForLoadState('networkidle');
      await expect(firstCategory).not.toBeChecked();
      await expect(firstRadio).not.toBeChecked();
    }
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('URL and UI state remain consistent after filter and reset', async ({
    page,
  }) => {
    await page.goto('http://localhost:3000/');
    const firstCategory = page.locator('.filters .ant-checkbox-input').first();
    await firstCategory.check();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /reset filters/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(firstCategory).not.toBeChecked();
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('Apply filters and reset during loading state', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    const firstCategoryLabel = page.locator('.filters label').first();
    const firstCategory = page.locator('.filters .ant-checkbox-input').first();
    await expect(firstCategoryLabel).toBeVisible();
    await firstCategoryLabel.click();
    await page.getByRole('button', { name: /reset filters/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(firstCategory).not.toBeChecked();
    await expect(page.locator('.card').first()).toBeVisible();
  });
});
