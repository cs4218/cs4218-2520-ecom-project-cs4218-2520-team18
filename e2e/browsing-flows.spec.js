// E2E Test for Browsing Flows
// Tests category navigation and product browsing from end-user perspective
import { test, expect } from "@playwright/test";

test.describe("Browsing E2E flows", () => {
  test("Flow 1: Categories → Choose Category → View Products → View Product Details", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500); // Wait for page to load

    // User clicks on "Categories" dropdown in navigation header
    const categoriesDropdown = page.locator('.nav-link.dropdown-toggle:has-text("Categories")');
    await expect(categoriesDropdown).toBeVisible();
    await categoriesDropdown.click();

    // Wait for dropdown menu to be visible
    await page.waitForSelector('.dropdown-menu', { state: 'visible' });

    // Assert: Dropdown should display category options
    const categoryDropdownItems = page.locator('.dropdown-menu .dropdown-item');
    await expect(categoryDropdownItems.first()).toBeVisible(); // Ensure at least first item is visible
    const dropdownItemCount = await categoryDropdownItems.count();
    expect(dropdownItemCount).toBeGreaterThan(1); // Should have "All Categories" + individual categories

    // User chooses a category (select second item, first is "All Categories")
    const chosenCategoryItem = categoryDropdownItems.nth(1);
    const chosenCategoryName = await chosenCategoryItem.textContent();
    expect(chosenCategoryName?.trim().length).toBeGreaterThan(0);

    await chosenCategoryItem.click();
    await page.waitForTimeout(500); // Wait for category page to load

    // Assert: Should navigate to category-specific page
    await expect(page).toHaveURL(/\/category\/.+/);

    // Assert: Category name should be displayed in heading
    await expect(page.locator(`h4:has-text("Category - ${chosenCategoryName}")`)).toBeVisible();

    // Assert: Result count should be displayed
    const resultCountText = page.locator('h6:has-text("result found")');
    await expect(resultCountText).toBeVisible();

    // Assert: Products should be displayed for this category
    const productCards = page.locator('.card');
    const productCount = await productCards.count();

    // Assert: Result count should match actual product count
    const resultText = await resultCountText.textContent();
    const displayedCount = parseInt(resultText?.match(/(\d+) result/)?.[1] || "0");
    expect(displayedCount).toBe(productCount);

    // User views a product by clicking "More Details"
    if (productCount > 0) {
      const firstProduct = productCards.first();

      // Assert: Product card should have all required elements
      await expect(firstProduct.locator(".card-title").first()).toBeVisible();
      await expect(firstProduct.locator(".card-price")).toBeVisible();
      await expect(firstProduct.locator('button:has-text("More Details")')).toBeVisible();

      const productNameOnCard = await firstProduct.locator(".card-title").first().textContent();

      // Click More Details button
      await firstProduct.locator('button:has-text("More Details")').click();
      await page.waitForTimeout(500); // Wait for product details page to load

      // Assert: Should navigate to product details page
      await expect(page).toHaveURL(/\/product\/.+/);

      // Assert: Product Details page should display all expected information
      await expect(page.getByText("Product Details")).toBeVisible();

      // Assert: Product name should match what was on the card
      await expect(page.locator(`h6:has-text("Name : ${productNameOnCard}")`)).toBeVisible();

      // Assert: Product price should be displayed
      await expect(page.locator('h6:has-text("Price :")')).toBeVisible();

      // Assert: Product description should be visible
      await expect(page.locator('h6:has-text("Description :")')).toBeVisible();

      // Assert: Product category should be displayed
      await expect(page.locator('h6:has-text("Category :")')).toBeVisible();

      // Assert: Product image should be visible with correct source
      const productImage = page.locator('.product-details img');
      await expect(productImage).toBeVisible();
      const imageSrc = await productImage.getAttribute('src');
      expect(imageSrc).toContain('/api/v1/product/product-photo/');

      // Assert: Image should maintain aspect ratio (not stretched)
      const imageDimensions = await productImage.evaluate((img) => ({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
      }));

      // Calculate aspect ratios
      const naturalAspectRatio = imageDimensions.naturalWidth / imageDimensions.naturalHeight;
      const displayAspectRatio = imageDimensions.displayWidth / imageDimensions.displayHeight;

      // Aspect ratios should match within a small tolerance (5%)
      const aspectRatioDifference = Math.abs(naturalAspectRatio - displayAspectRatio) / naturalAspectRatio;
      expect(aspectRatioDifference).toBeLessThan(0.05);

      // Assert: Add to cart button should be present
      await expect(page.getByRole("button", { name: "ADD TO CART" })).toBeVisible();

      // Assert: Similar products section should be present
      await expect(page.getByRole('heading', { name: /Similar Products/ })).toBeVisible();
    }
  });

  test("Flow 2: Categories → All Categories → Categories Page → Choose Category → View Products → View Product Details", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500); // Wait for page to load

    // User clicks on "Categories" dropdown in navigation
    const categoriesDropdown = page.locator('.nav-link.dropdown-toggle:has-text("Categories")');
    await expect(categoriesDropdown).toBeVisible();
    await categoriesDropdown.click();

    // Wait for dropdown menu to be visible
    await page.waitForSelector('.dropdown-menu', { state: 'visible' });

    // Assert: Dropdown should show "All Categories" option
    const allCategoriesLink = page.locator('.dropdown-menu .dropdown-item:has-text("All Categories")');
    await expect(allCategoriesLink).toBeVisible();

    // Assert: Individual category links should also be visible in dropdown
    const categoryDropdownItems = page.locator('.dropdown-menu .dropdown-item');
    await expect(categoryDropdownItems.first()).toBeVisible(); // Ensure first item is loaded
    const dropdownItemCount = await categoryDropdownItems.count();
    expect(dropdownItemCount).toBeGreaterThan(1); // At least "All Categories" + 1 category

    // User clicks "All Categories"
    await allCategoriesLink.click();
    await page.waitForTimeout(500); // Wait for categories page to load

    // Assert: Should navigate to /categories page
    await expect(page).toHaveURL("/categories");

    // Assert: "All Categories" heading should be visible
    await expect(page.getByRole('heading', { name: "All Categories" })).toBeVisible();

    // Assert: Categories should be rendered as clickable buttons
    const categoryButtons = page.locator('.btn.btn-primary');
    const categoryCount = await categoryButtons.count();
    expect(categoryCount).toBeGreaterThan(0);

    // User chooses a category by clicking the first category button
    const firstCategoryButton = categoryButtons.first();
    const chosenCategoryName = await firstCategoryButton.textContent();
    expect(chosenCategoryName?.trim().length).toBeGreaterThan(0);

    await firstCategoryButton.click();
    await page.waitForTimeout(500); // Wait for category page to load

    // Assert: Should navigate to category-specific page
    await expect(page).toHaveURL(/\/category\/.+/);

    // Assert: Category name should be displayed in heading
    await expect(page.locator(`h4:has-text("Category - ${chosenCategoryName}")`)).toBeVisible();

    // Assert: Result count should be displayed
    const resultCountText = page.locator('h6:has-text("result found")');
    await expect(resultCountText).toBeVisible();

    // Assert: Products should be displayed in cards
    const productCards = page.locator('.card');
    const productCount = await productCards.count();

    // Assert: Result count should match actual product count
    const resultText = await resultCountText.textContent();
    const displayedCount = parseInt(resultText?.match(/(\d+) result/)?.[1] || "0");
    expect(displayedCount).toBe(productCount);

    // User views a product by clicking "More Details"
    if (productCount > 0) {
      const firstProductCard = productCards.first();

      // Assert: Product card should have all required elements
      await expect(firstProductCard.locator(".card-title").first()).toBeVisible();
      await expect(firstProductCard.locator(".card-price")).toBeVisible();
      await expect(firstProductCard.locator('button:has-text("More Details")')).toBeVisible();

      const productNameFromCategory = await firstProductCard.locator('.card-title').first().textContent();

      // Click More Details
      await firstProductCard.locator('button:has-text("More Details")').click();
      await page.waitForTimeout(500); // Wait for product details page to load

      // Assert: Should navigate to product details page
      await expect(page).toHaveURL(/\/product\/.+/);

      // Assert: Product Details page should display all expected information
      await expect(page.getByText("Product Details")).toBeVisible();

      // Assert: Product name should match
      await expect(page.locator(`h6:has-text("Name : ${productNameFromCategory}")`)).toBeVisible();

      // Assert: Product details should all be visible
      await expect(page.locator('h6:has-text("Price :")')).toBeVisible();
      await expect(page.locator('h6:has-text("Description :")')).toBeVisible();
      await expect(page.locator('h6:has-text("Category :")')).toBeVisible();

      // Assert: Product image should be visible
      const productImage = page.locator('.product-details img');
      await expect(productImage).toBeVisible();
      const imageSrc = await productImage.getAttribute('src');
      expect(imageSrc).toContain('/api/v1/product/product-photo/');

      // Assert: Image should maintain aspect ratio (not stretched)
      const imageDimensions = await productImage.evaluate((img) => ({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.clientWidth,
        displayHeight: img.clientHeight,
      }));

      // Calculate aspect ratios
      const naturalAspectRatio = imageDimensions.naturalWidth / imageDimensions.naturalHeight;
      const displayAspectRatio = imageDimensions.displayWidth / imageDimensions.displayHeight;

      // Aspect ratios should match within a small tolerance (5%)
      const aspectRatioDifference = Math.abs(naturalAspectRatio - displayAspectRatio) / naturalAspectRatio;
      expect(aspectRatioDifference).toBeLessThan(0.05);

      // Assert: Add to cart button should be present
      await expect(page.getByRole("button", { name: "ADD TO CART" })).toBeVisible();

      // Assert: Similar products section should be present
      await expect(page.getByRole('heading', { name: /Similar Products/ })).toBeVisible();
    }
  });
});
