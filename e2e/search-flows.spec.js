// Aw Jean Leng Adrian, A0277537N

import { test, expect } from "@playwright/test";

async function submitSearch(page, keyword) {
  const searchInput = page.locator('input[placeholder="Search"]');
  await searchInput.fill(keyword);
  await page.locator('button:has-text("Search")').click();
  await expect(page).toHaveURL("/search");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
}


test.describe("Product Search E2E Flows", () => {
  test.describe("Complete Search User Journey", () => {
    test("User searches for 'Laptop', views results, and sees relevant products", async ({ page }) => {
      // User starts at home page
      await page.goto("/");

      // User searches for "Laptop"
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();

      // Navigate to search results
      await expect(page).toHaveURL("/search");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Verify results are displayed
      const foundMessage = page.locator("h6", { hasText: /^Found \d+$/ });
      await expect(foundMessage).toBeVisible();
      const foundText = await foundMessage.textContent();
      const resultCount = parseInt(foundText?.match(/Found (\d+)/)?.[1] ?? "0");
      expect(resultCount).toBeGreaterThan(0);

      // Verify product card with essential information is displayed
      const productCards = page.locator(".card.m-2");
      await expect(productCards.first()).toBeVisible();
      await expect(productCards.first().locator(".card-title")).toContainText("Laptop");

      // Verify action buttons are available
      await expect(productCards.first().locator('button:has-text("More Details")')).toBeVisible();
      await expect(productCards.first().locator('button:has-text("ADD TO CART")')).toBeVisible();
    });

    test("User searches for 'Smartphone', sees results, then performs new search for 'Novel'", async ({ page }) => {
      await page.goto("/");

      // First search: Smartphone
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Smartphone");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await page.waitForLoadState("networkidle");

      const firstCards = page.locator(".card.m-2");
      await expect(firstCards.first().locator(".card-title")).toHaveText("Smartphone");

      // Second search from results page: Novel
      await searchInput.fill("Novel");
      await page.locator('button:has-text("Search")').click();
      await page.waitForLoadState("networkidle");

      // Verify results updated correctly
      const secondCards = page.locator(".card.m-2");
      await expect(secondCards.first().locator(".card-title")).toContainText("Novel");

      // Old results should be replaced
      const allTitles = await secondCards.locator(".card-title").allTextContents();
      expect(allTitles).not.toContain("Smartphone");
    });

    test("User searches for non-existent product, sees no results, then searches for valid product", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');

      // Search for non-existent product
      await searchInput.fill("xyznonexistentproduct123");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.locator('h6:has-text("No Products Found")')).toBeVisible();
      await expect(page.locator(".card.m-2")).toHaveCount(0);

      // Search for valid product
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();
      await page.waitForLoadState("networkidle");

      // Verify results are now shown
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();
      const productCards = page.locator(".card.m-2");
      await expect(productCards).not.toHaveCount(0);
    });
  });

  test.describe("Search Navigation and State Persistence", () => {
    test("User searches, navigates back, search query persists, then navigates forward", async ({ page }) => {
      // Start at home page
      await page.goto("/");

      // Perform search
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();

      // Navigate back
      await page.goBack();

      // Verify search query persists in input
      await expect(page.locator('input[placeholder="Search"]')).toHaveValue("Laptop");

      // Navigate forward
      await page.goForward();

      // Results page still shows search results
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();
    });

    test("User performs three sequential searches across different product categories", async ({ page }) => {
      await page.goto("/");
      const searchInput = page.locator('input[placeholder="Search"]');

      // Search 1: Electronics
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Search 2: Books
      await searchInput.fill("Novel");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Search 3: Apparel
      await searchInput.fill("T-shirt");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Final state: results for T-shirt are shown
      const foundMsg = page.locator('h6:has-text("Found")');
      const noFoundMsg = page.locator('h6:has-text("No Products Found")');
      const hasFound = await foundMsg.isVisible().catch(() => false);
      const hasNoFound = await noFoundMsg.isVisible().catch(() => false);
      expect(hasFound || hasNoFound).toBe(true);
    });
  });

  test.describe("Search Input Interaction Flows", () => {
    test("User types query, clears it, types new query, then submits", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');

      // Type first query
      await searchInput.fill("Laptop");
      await expect(searchInput).toHaveValue("Laptop");

      // Clear the input
      await searchInput.fill("");
      await expect(searchInput).toHaveValue("");

      // Type new query and submit
      await searchInput.fill("Novel");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Verify Novel results, not Laptop results
      const productCards = page.locator(".card.m-2");
      if (await productCards.first().isVisible()) {
        await expect(productCards.first().locator(".card-title")).toContainText("Novel");
      }
    });

    test("User submits search using Enter key instead of clicking button", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");

      // Press Enter to submit
      await searchInput.press("Enter");

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
    });
  });

  test.describe("Special Character Search Flows", () => {
    test("User searches with hyphenated query and application handles gracefully", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("NUS T-shirt");
      await page.locator('button:has-text("Search")').click();

      // Verify navigation and no crash
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Application should handle gracefully with results or no results message
      const foundMessage = page.locator('h6:has-text("Found")');
      const noResults = page.locator('h6:has-text("No Products Found")');
      const hasFound = await foundMessage.isVisible().catch(() => false);
      const hasNoResults = await noResults.isVisible().catch(() => false);
      expect(hasFound || hasNoResults).toBe(true);
    });

    test("User searches with ampersand and application handles gracefully", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Books & Media");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Page renders without error
      await expect(page.locator(".container")).toBeVisible();
    });
  });

  test.describe("Search API Integration Flow", () => {
    test("User searches and correct API request is triggered with search results displayed", async ({ page }) => {
      // Monitor API calls
      const apiCalls = [];
      page.on("request", (request) => {
        if (request.url().includes("/api/v1/product/search/")) {
          apiCalls.push(request.url());
        }
      });

      await page.goto("/");
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Verify API was called with correct keyword
      expect(apiCalls.length).toBeGreaterThan(0);
      expect(apiCalls[0]).toContain("/api/v1/product/search/Laptop");

      // Verify UI shows results from API
      const productCards = page.locator(".card.m-2");
      if (await productCards.first().isVisible()) {
        await expect(productCards.first()).toBeVisible();
      }
    });

    test("User searches and API response data matches UI display", async ({ page }) => {
      let apiResponseData = null;
      page.on("response", async (response) => {
        if (response.url().includes("/api/v1/product/search/Smartphone")) {
          apiResponseData = await response.json().catch(() => null);
        }
      });

      await page.goto("/");
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Smartphone");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Verify UI renders what API returned
      if (apiResponseData && Array.isArray(apiResponseData)) {
        const productCards = page.locator(".card.m-2");
        await expect(productCards).toHaveCount(apiResponseData.length);

        if (apiResponseData.length > 0) {
          const firstProductName = apiResponseData[0].name;
          await expect(productCards.first().locator(".card-title")).toHaveText(firstProductName);
        }
      }
    });
  });
});
