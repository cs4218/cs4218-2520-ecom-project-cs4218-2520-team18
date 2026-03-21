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
  test.describe("Successful Search Flow", () => {
    test("User types 'Laptop', submits, and sees matching product with full details", async ({ page }) => {
      // User starts at home page
      await page.goto("/");

      // Verify search input is visible in header
      const searchInput = page.locator('input[placeholder="Search"]');
      await expect(searchInput).toBeVisible();

      // User types "Laptop" – verify input field updates as user types
      await searchInput.fill("Laptop");
      await expect(searchInput).toHaveValue("Laptop");

      // User clicks the Search button
      const searchButton = page.locator('button:has-text("Search")');
      await expect(searchButton).toBeVisible();
      await searchButton.click();

      // Verify browser navigates to /search page
      await expect(page).toHaveURL("/search");
      // Wait for the API call (made inside handleSubmit before navigate) to finish
      await page.waitForLoadState("networkidle");

      // Verify "Search Results" heading is displayed
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      const foundMessage = page.locator("h6", { hasText: /^Found \d+$/ });
      await expect(foundMessage).toBeVisible();
      const foundText = await foundMessage.textContent();
      const resultCount = parseInt(foundText?.match(/Found (\d+)/)?.[1] ?? "0");
      expect(resultCount).toBe(1);

      // Verify exactly 1 product card is rendered
      const productCards = page.locator(".card.m-2");
      await expect(productCards).toHaveCount(1);

      // Verify card title matches the laptop product name
      const firstCard = productCards.first();
      await expect(firstCard.locator(".card-title")).toHaveText("Laptop");

      // Verify card has description text
      await expect(firstCard.locator(".card-text").first()).toBeVisible();

      // Verify "More Details" button is present
      await expect(firstCard.locator('button:has-text("More Details")')).toBeVisible();

      // Verify "ADD TO CART" button is present
      await expect(firstCard.locator('button:has-text("ADD TO CART")')).toBeVisible();

      // Verify product image with correct API path
      const productImage = firstCard.locator(".card-img-top");
      await expect(productImage).toBeVisible();
      const imageSrc = await productImage.getAttribute("src");
      expect(imageSrc).toContain("/api/v1/product/product-photo/");
    });

    test("User searches for 'Smartphone' and sees the matching product", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Smartphone");
      await expect(searchInput).toHaveValue("Smartphone");

      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await page.waitForLoadState("networkidle");

      // Verify count message shows 1 result — use regex-anchored locator (see test 1 comment)
      const foundMessage = page.locator("h6", { hasText: /^Found \d+$/ });
      await expect(foundMessage).toBeVisible();
      const foundText = await foundMessage.textContent();
      expect(parseInt(foundText?.match(/Found (\d+)/)?.[1] ?? "0")).toBe(1);

      // Verify the card title
      const productCards = page.locator(".card.m-2");
      await expect(productCards).toHaveCount(1);
      await expect(productCards.first().locator(".card-title")).toHaveText("Smartphone");
    });
  });

  test.describe("Empty Search Results", () => {
    test("User searches for a non-existent product and sees 'No Products Found'", async ({ page }) => {
      // Navigate to home page
      await page.goto("/");

      // Search for something that definitely does not exist
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("xyznonexistentproduct123");
      await page.locator('button:has-text("Search")').click();

      // Verify navigation to /search page
      await expect(page).toHaveURL("/search");

      // Verify "Search Results" heading is displayed
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Verify "No Products Found" message
      await expect(page.locator('h6:has-text("No Products Found")')).toBeVisible();

      // Verify zero product cards rendered
      const productCards = page.locator(".card.m-2");
      await expect(productCards).toHaveCount(0);

      // Verify the page does not crash – container still visible
      await expect(page.locator(".container")).toBeVisible();
    });
  });

  test.describe("Product Card Display", () => {
    test("Search results cards show image, title, description, price, and action buttons", async ({ page }) => {
      // Search for "Laptop" (known seed product)
      await page.goto("/");
      await submitSearch(page, "Laptop");

      const productCards = page.locator(".card.m-2");
      await expect(productCards).toHaveCount(1);
      const firstCard = productCards.first();

      // Card styling: .card.m-2 with inline width 18rem
      await expect(firstCard).toBeVisible();
      const cardWidth = await firstCard.evaluate((el) => el.style.width);
      expect(cardWidth).toBe("18rem");

      // Product image
      const cardImage = firstCard.locator(".card-img-top");
      await expect(cardImage).toBeVisible();

      // Image src points to the photo API endpoint
      const imageSrc = await cardImage.getAttribute("src");
      expect(imageSrc).toMatch(/\/api\/v1\/product\/product-photo\/.+/);

      // Image alt text equals the product name
      const altText = await cardImage.getAttribute("alt");
      expect(altText).toBe("Laptop");

      // Card title equals product name
      const cardTitle = firstCard.locator(".card-title");
      await expect(cardTitle).toBeVisible();
      await expect(cardTitle).toHaveText("Laptop");

      // Description is truncated: substring(0, 30) + "..."
      // "A powerful laptop" is 17 chars → rendered as "A powerful laptop..."
      const descriptionText = await firstCard.locator(".card-text").first().textContent();
      expect(descriptionText).toContain("...");
      // Total length: at most 30 chars of description + 3 chars of "..."
      expect(descriptionText?.length).toBeLessThanOrEqual(33);

      // Price formatted as " $ <value>"  (space before dollar sign as per Search.js template)
      const priceText = await firstCard.locator(".card-text").nth(1).textContent();
      expect(priceText).toMatch(/\$\s*\d+(\.\d{1,2})?/);

      // "More Details" button with btn-primary styling
      const moreDetailsBtn = firstCard.locator('button:has-text("More Details")');
      await expect(moreDetailsBtn).toBeVisible();
      await expect(moreDetailsBtn).toHaveClass(/btn-primary/);

      // "ADD TO CART" button with btn-secondary styling
      const addToCartBtn = firstCard.locator('button:has-text("ADD TO CART")');
      await expect(addToCartBtn).toBeVisible();
      await expect(addToCartBtn).toHaveClass(/btn-secondary/);
    });

    test("Textbook card description truncates at 30 characters with '...'", async ({ page }) => {
      // "The Law of Contract in Singapore" has a 31-char description:
      // "A bestselling book in Singapore" → truncated to "A bestselling book in Singapor..."
      await page.goto("/");
      await submitSearch(page, "The Law");

      const productCards = page.locator(".card.m-2");
      const cardCount = await productCards.count();

      if (cardCount > 0) {
        const descText = await productCards.first().locator(".card-text").first().textContent();
        // Always ends with "..."
        expect(descText?.endsWith("...")).toBe(true);
        // Length = 30 original chars + 3 "..." = 33 max
        expect(descText?.length).toBeLessThanOrEqual(33);
      }
    });
  });

  test.describe("Search Query Persistence", () => {
    test("Search keyword persists in input after navigating back from results", async ({ page }) => {
      // User starts at home page and performs a search
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();

      // Verify on search results page
      await expect(page).toHaveURL("/search");
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();

      // User navigates back (browser back button)
      await page.goBack();

      // Verify the search input still contains "Laptop" (context preserved in React state)
      await expect(page.locator('input[placeholder="Search"]')).toHaveValue("Laptop");
    });

    test("Navigating forward after back still shows search results", async ({ page }) => {
      // Start at home page
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Smartphone");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();

      // Go back then forward
      await page.goBack();
      await page.goForward();

      // Results page still shows search results
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
    });
  });

  test.describe("Special Characters in Search", () => {
    test("Search with hyphen in query (NUS T-shirt) navigates and shows results or no results", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("NUS T-shirt");
      await page.locator('button:has-text("Search")').click();

      // Verify navigation and no crash
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Either "Found" or "No Products Found" is displayed
      const foundMessage = page.locator('h6:has-text("Found")');
      const noResults = page.locator('h6:has-text("No Products Found")');
      const hasFound = await foundMessage.isVisible().catch(() => false);
      const hasNoResults = await noResults.isVisible().catch(() => false);
      expect(hasFound || hasNoResults).toBe(true);
    });

    test("Search with ampersand-like query navigates without crash", async ({ page }) => {
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

  test.describe("Real-Time Input Update", () => {
    test("Search input updates with every keystroke as user types slowly", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await expect(searchInput).toBeVisible();

      // Simulate slow typing character by character
      await searchInput.pressSequentially("l", { delay: 50 });
      await expect(searchInput).toHaveValue("l");

      await searchInput.pressSequentially("a", { delay: 50 });
      await expect(searchInput).toHaveValue("la");

      await searchInput.pressSequentially("p", { delay: 50 });
      await expect(searchInput).toHaveValue("lap");

      await searchInput.pressSequentially("t", { delay: 50 });
      await expect(searchInput).toHaveValue("lapt");

      await searchInput.pressSequentially("op", { delay: 50 });
      await expect(searchInput).toHaveValue("laptop");

      // Submit the final accumulated query
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
    });

    test("User can clear input and type a new query", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');

      await searchInput.fill("Laptop");
      await expect(searchInput).toHaveValue("Laptop");

      // Clear the input
      await searchInput.fill("");
      await expect(searchInput).toHaveValue("");

      // Type a new query
      await searchInput.fill("Novel");
      await expect(searchInput).toHaveValue("Novel");
    });

    test("User can submit search by pressing Enter key", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");

      // Press Enter to submit the search form
      await searchInput.press("Enter");

      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();
    });
  });

  test.describe("Multiple Searches", () => {
    test("Results update when user performs a second search from the /search page", async ({ page }) => {
      await page.goto("/");

      // First search: Laptop
      const searchInput = page.locator('input[placeholder="Search"]');
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();

      await expect(page).toHaveURL("/search");
      await page.waitForLoadState("networkidle");

      // Wait for the Laptop card to actually appear before reading titles.
      // allTextContents() has no built-in retry, so we must ensure results are rendered first.
      const firstCards = page.locator(".card.m-2");
      await expect(firstCards.first().locator(".card-title")).toHaveText("Laptop");
      const firstTitles = await firstCards.locator(".card-title").allTextContents();
      expect(firstTitles).toContain("Laptop");

      // Second search: Smartphone (from the /search page)
      await searchInput.fill("Smartphone");
      await page.locator('button:has-text("Search")').click();

      // URL is already /search so toHaveURL resolves immediately; wait for the API
      await page.waitForLoadState("networkidle");

      // Wait for the Smartphone card title specifically — handles the race where old
      // Laptop results are still in the DOM right after the second search is submitted
      const secondCards = page.locator(".card.m-2");
      await expect(secondCards.first().locator(".card-title")).toHaveText("Smartphone");
      const secondTitles = await secondCards.locator(".card-title").allTextContents();
      expect(secondTitles).toContain("Smartphone");
      expect(secondTitles).not.toContain("Laptop");
    });

    test("Searching then searching a non-existent term shows 'No Products Found'", async ({ page }) => {
      await page.goto("/");

      const searchInput = page.locator('input[placeholder="Search"]');

      // First search returns results
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.locator('h6:has-text("Found")')).toBeVisible();

      // Second search returns nothing
      await searchInput.fill("nonexistentitem99999");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");

      // Old laptop results are completely replaced
      await expect(page.locator('h6:has-text("No Products Found")')).toBeVisible();
      await expect(page.locator(".card.m-2")).toHaveCount(0);
    });

    test("Three sequential searches: Laptop → Novel → T-shirt all update correctly", async ({ page }) => {
      await page.goto("/");
      const searchInput = page.locator('input[placeholder="Search"]');

      // Search 1
      await searchInput.fill("Laptop");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Search 2
      await searchInput.fill("Novel");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Search 3
      await searchInput.fill("T-shirt");
      await page.locator('button:has-text("Search")').click();
      await expect(page).toHaveURL("/search");
      await expect(page.getByRole("heading", { name: "Search Results" })).toBeVisible();

      // Final state: results for T-shirt are shown (found or not found, no crash)
      const foundMsg = page.locator('h6:has-text("Found")');
      const noFoundMsg = page.locator('h6:has-text("No Products Found")');
      const hasFound = await foundMsg.isVisible().catch(() => false);
      const hasNoFound = await noFoundMsg.isVisible().catch(() => false);
      expect(hasFound || hasNoFound).toBe(true);
    });
  });

  test.describe("API Integration Verification", () => {
    test("Searching 'Laptop' triggers GET request to /api/v1/product/search/Laptop", async ({ page }) => {
      // Capture all API search requests
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

      // Verify exactly one API call was made with the correct keyword
      expect(apiCalls.length).toBeGreaterThan(0);
      expect(apiCalls[0]).toContain("/api/v1/product/search/Laptop");
    });

    test("API response matches what is rendered on the /search page", async ({ page }) => {
      // Intercept the API response for Smartphone search
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

      // Verify UI renders what the API returned
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

  test.describe("Image Loading", () => {
    test("All product images have correct src, alt text, and card-img-top class", async ({ page }) => {
      await page.goto("/");
      await submitSearch(page, "Laptop");

      const productCards = page.locator(".card.m-2");
      // Wait for at least one card to be visible — count() has no retry so we must
      // ensure results are rendered before we read the count
      await expect(productCards.first()).toBeVisible();
      const cardCount = await productCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const card = productCards.nth(i);
        const img = card.locator(".card-img-top");

        // Image element has the correct class
        await expect(img).toBeVisible();

        // src points to the product-photo API endpoint
        const src = await img.getAttribute("src");
        expect(src).toMatch(/\/api\/v1\/product\/product-photo\/.+/);

        // alt text equals the product name (not empty)
        const alt = await img.getAttribute("alt");
        expect(alt).toBeTruthy();
        expect(alt?.length).toBeGreaterThan(0);
      }
    });

    test("Product images load successfully (no broken image icons)", async ({ page }) => {
      await page.goto("/");
      await submitSearch(page, "Laptop");

      const productCards = page.locator(".card.m-2");
      const cardCount = await productCards.count();

      for (let i = 0; i < cardCount; i++) {
        const img = productCards.nth(i).locator(".card-img-top");

        // Evaluate image load state in the browser
        const isLoaded = await img.evaluate((el) => {
          const image = el;
          return image.complete && image.naturalWidth > 0;
        });
        expect(isLoaded).toBe(true);
      }
    });
  });

  test.describe("Price and Description Formatting", () => {
    test("Textbook price displays as '$ 79.99' and description truncates to 30 chars + '...'", async ({ page }) => {
      // Textbook: price=79.99, description="A comprehensive textbook" (24 chars)
      await page.goto("/");
      await submitSearch(page, "Textbook");

      const productCards = page.locator(".card.m-2");
      await expect(productCards).toHaveCount(1);
      const firstCard = productCards.first();

      // Price: Search.js renders " $ {p.price}" → text content is " $ 79.99"
      const priceText = await firstCard.locator(".card-text").nth(1).textContent();
      expect(priceText?.trim()).toBe("$ 79.99");

      // Description: always substring(0, 30) + "..."
      // Use trim() to guard against any leading/trailing whitespace from JSX formatting
      const descText = await firstCard.locator(".card-text").first().textContent();
      expect(descText?.trim()).toBe("A comprehensive textbook...");
      expect(descText?.trim().endsWith("...")).toBe(true);
    });

    test("Long description is truncated at exactly 30 characters with '...'", async ({ page }) => {
      // "The Law of Contract in Singapore" has description "A bestselling book in Singapore" (31 chars)
      // After truncation: "A bestselling book in Singapor" (30 chars) + "..." = 33 chars total
      await page.goto("/");
      await submitSearch(page, "The Law");

      const productCards = page.locator(".card.m-2");
      const cardCount = await productCards.count();

      if (cardCount > 0) {
        const descText = await productCards.first().locator(".card-text").first().textContent();
        expect(descText?.endsWith("...")).toBe(true);
        // 30 content chars + 3 ellipsis = 33 max
        expect(descText?.length).toBeLessThanOrEqual(33);
        // First 30 chars of "A bestselling book in Singapore"
        expect(descText).toBe("A bestselling book in Singapor...");
      }
    });

    test("Novel price displays correctly as '$ 14.99'", async ({ page }) => {
      // Novel: price=14.99
      await page.goto("/");
      await submitSearch(page, "Novel");

      const productCards = page.locator(".card.m-2");
      const cardCount = await productCards.count();

      if (cardCount > 0) {
        const priceText = await productCards.first().locator(".card-text").nth(1).textContent();
        expect(priceText?.trim()).toBe("$ 14.99");
        // Verify the dollar sign and space pattern
        expect(priceText).toMatch(/\$\s*14\.99/);
      }
    });

    test("All search result prices match the '$ XX.XX' format", async ({ page }) => {
      // Search for "Laptop" to get a single known product
      await page.goto("/");
      await submitSearch(page, "Laptop");

      const productCards = page.locator(".card.m-2");
      // Wait for cards to render before reading count — count() has no retry
      await expect(productCards.first()).toBeVisible();
      const cardCount = await productCards.count();
      expect(cardCount).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const priceText = await productCards.nth(i).locator(".card-text").nth(1).textContent();
        // Matches "$ <number>" format, e.g. "$ 1499.99"
        expect(priceText).toMatch(/\$\s*\d+(\.\d{1,2})?/);
      }
    });
  });
});
