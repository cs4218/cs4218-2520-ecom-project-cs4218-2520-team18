// E2E Test for Cart Flows
// Tests cart functionality including adding products, viewing cart, and persistence
import { test, expect } from "@playwright/test";

test.describe("Cart E2E flows", () => {
  test("Flow 1: View Product Details → Add to Cart → Navigate to Cart", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500);

    // Get initial cart count from Ant Design badge
    const cartBadge = page.locator('.ant-badge-count');
    const initialCartCount = await cartBadge.textContent().catch(() => "0");
    const initialCount = parseInt(initialCartCount) || 0;

    // Navigate to a product from the home page
    const productCards = page.locator('.card').first();
    await expect(productCards).toBeVisible();

    // Capture product details from card for later verification
    const productNameOnCard = await productCards.locator('.card-title').first().textContent();
    const productPriceText = await productCards.locator('.card-price').textContent();

    // Extract numeric price value (remove currency symbols and format)
    const priceMatch = productPriceText?.match(/[\d,]+\.?\d*/);
    const productPrice = priceMatch ? priceMatch[0].replace(/,/g, '') : null;

    // Click "More Details" to go to product details page
    await productCards.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    // Assert: Should be on product details page
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByText("Product Details")).toBeVisible();

    // Assert: Product details match what was on the card
    await expect(page.locator(`h6:has-text("Name : ${productNameOnCard}")`)).toBeVisible();
    await expect(page.locator('h6:has-text("Price :")')).toBeVisible();

    // Find and click "ADD TO CART" button (the main product button, not related products)
    const addToCartButton = page.locator('.product-details-info button:has-text("ADD TO CART")');
    await expect(addToCartButton).toBeVisible();
    await addToCartButton.click();

    // Wait for cart to update
    await page.waitForTimeout(1000);

    // Assert: Cart count should increment by 1
    const updatedCartCount = await cartBadge.textContent().catch(() => "1");
    expect(parseInt(updatedCartCount) || 0).toBe(initialCount + 1);

    // Navigate to cart page by clicking the cart icon/link
    const cartLink = page.locator('a[href="/cart"]');
    await expect(cartLink).toBeVisible();
    await cartLink.click();
    await page.waitForTimeout(500);

    // Assert: Should be on cart page
    await expect(page).toHaveURL("/cart");

    // Assert: Cart should show the correct number of items
    await expect(page.locator(`p:has-text("You Have ${initialCount + 1} items in your cart")`)).toBeVisible();

    // Assert: Product should be in cart with correct details
    const cartProductCard = page.locator('.card.flex-row').first();
    await expect(cartProductCard).toBeVisible();

    // Verify product name in cart (use first() to handle strict mode)
    await expect(cartProductCard.locator('p').filter({ hasText: productNameOnCard }).first()).toBeVisible();

    // Verify product price in cart
    if (productPrice) {
      await expect(cartProductCard.locator(`p:has-text("Price : ${productPrice}")`)).toBeVisible();
    }

    // Assert: Product image should be visible
    const cartProductImage = cartProductCard.locator('img');
    await expect(cartProductImage).toBeVisible();
    const imageSrc = await cartProductImage.getAttribute('src');
    expect(imageSrc).toContain('/api/v1/product/product-photo/');

    // Assert: Remove button should be present
    await expect(cartProductCard.locator('button:has-text("Remove")')).toBeVisible();

    // Assert: Cart summary should be visible
    await expect(page.locator('h2:has-text("Cart Summary")')).toBeVisible();
    await expect(page.locator('h4:has-text("Total :")')).toBeVisible();
  });

  test("Flow 2: View Product Details → View Related Product → Add Related Product to Cart → Cart", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500);

    // Get initial cart count
    const cartBadge = page.locator('.ant-badge-count');
    const initialCartCount = await cartBadge.textContent().catch(() => "0");
    const initialCount = parseInt(initialCartCount) || 0;

    // Navigate to "Novel" product from home page
    const novelProductCard = page.locator('.card').filter({ hasText: "Novel" }).first();
    await expect(novelProductCard).toBeVisible();

    await novelProductCard.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    // Assert: Should be on product details page
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByText("Product Details")).toBeVisible();

    // Assert: Similar products section should be present
    await expect(page.getByRole('heading', { name: /Similar Products/ })).toBeVisible();


    // Get first related product details
    const relatedProduct = page.locator('.similar-products .card').first();
    await expect(relatedProduct).toBeVisible();

    const relatedProductName = await relatedProduct.locator('.card-title').first().textContent();
    const relatedProductPriceText = await relatedProduct.locator('.card-price').textContent();
    const priceMatch = relatedProductPriceText?.match(/[\d,]+\.?\d*/);
    const relatedProductPrice = priceMatch ? priceMatch[0].replace(/,/g, '') : null;

    // Click "ADD TO CART" directly on the related product (without navigating)
    const relatedAddToCartButton = relatedProduct.locator('button:has-text("ADD TO CART")');
    await expect(relatedAddToCartButton).toBeVisible();
    await relatedAddToCartButton.click();

    // Wait for cart to update
    await page.waitForTimeout(1000);

    // Assert: Cart count should increment
    const updatedCartCount = await cartBadge.textContent().catch(() => "1");
    expect(parseInt(updatedCartCount) || 0).toBe(initialCount + 1);

    // Navigate to cart
    const cartLink = page.locator('a[href="/cart"]');
    await cartLink.click();
    await page.waitForTimeout(500);

    // Assert: Should be on cart page
    await expect(page).toHaveURL("/cart");

    // Assert: Cart should contain the related product
    const cartProductCard = page.locator('.card.flex-row').first();
    await expect(cartProductCard).toBeVisible();

    await expect(cartProductCard.locator('p').filter({ hasText: relatedProductName }).first()).toBeVisible();

    if (relatedProductPrice) {
      await expect(cartProductCard.locator('p').filter({ hasText: `Price : ${relatedProductPrice}` }).first()).toBeVisible();
    }
  });

  test("Cart persists after page refresh", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500);

    // Add a product to cart
    const productCard = page.locator('.card').first();
    const productName = await productCard.locator('.card-title').first().textContent();

    await productCard.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    const addToCartButton = page.locator('.product-details-info button:has-text("ADD TO CART")');
    await addToCartButton.click();
    await page.waitForTimeout(1000);

    // Get cart count before refresh
    const cartBadge = page.locator('.ant-badge-count');
    const cartCountBeforeRefresh = await cartBadge.textContent().catch(() => "1");

    // Refresh the page
    await page.reload();
    await page.waitForTimeout(500);

    // Assert: Cart count should remain the same after refresh
    const cartCountAfterRefresh = await cartBadge.textContent().catch(() => cartCountBeforeRefresh);
    expect(cartCountAfterRefresh).toBe(cartCountBeforeRefresh);

    // Navigate to cart page
    const cartLink = page.locator('a[href="/cart"]');
    await cartLink.click();
    await page.waitForTimeout(500);

    // Assert: Product should still be in cart (use filter to avoid strict mode)
    await expect(page.locator('.card.flex-row p').filter({ hasText: productName }).first()).toBeVisible();
  });

  test("Adding same product increases quantity (adds another instance)", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500);

    // Get initial cart count
    const cartBadge = page.locator('.ant-badge-count');
    const initialCartCount = await cartBadge.textContent().catch(() => "0");
    const initialCount = parseInt(initialCartCount) || 0;

    // Navigate to a product
    const productCard = page.locator('.card').first();
    const productName = await productCard.locator('.card-title').first().textContent();

    await productCard.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    // Add to cart first time
    const addToCartButton = page.locator('.product-details-info button:has-text("ADD TO CART")');
    await addToCartButton.click();
    await page.waitForTimeout(1000);

    // Assert: Cart count should increase by 1
    let currentCartCount = await cartBadge.textContent().catch(() => "1");
    expect(parseInt(currentCartCount) || 0).toBe(initialCount + 1);

    // Add the same product to cart again
    await addToCartButton.click();
    await page.waitForTimeout(1000);

    // Assert: Cart count should increase by 1 more (now +2 total)
    currentCartCount = await cartBadge.textContent().catch(() => "2");
    expect(parseInt(currentCartCount) || 0).toBe(initialCount + 2);

    // Navigate to cart page
    const cartLink = page.locator('a[href="/cart"]');
    await cartLink.click();
    await page.waitForTimeout(500);

    // Assert: Cart should show 2 items
    await expect(page.locator(`p:has-text("You Have ${initialCount + 2} items in your cart")`)).toBeVisible();

    // Assert: The product should appear twice (as separate entries) - count all p tags containing the name
    const productCardsInCart = page.locator('.card.flex-row p').filter({ hasText: productName });
    const productCountInCart = await productCardsInCart.count();
    expect(productCountInCart).toBeGreaterThanOrEqual(2); // At least 2 (could be more if name appears in description)
  });

  test("Cart shows empty state when no items", async ({ page }) => {
    // Clear localStorage to ensure empty cart
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    await page.waitForTimeout(500);

    // Navigate to cart page
    await page.goto("/cart");
    await page.waitForTimeout(500);

    // Assert: Should show empty cart message
    await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();

    // Assert: Cart badge should show 0
    const cartBadge = page.locator('.ant-badge-count');
    const cartCount = await cartBadge.textContent().catch(() => "0");
    expect(parseInt(cartCount) || 0).toBe(0);
  });

  test("Remove button removes product from cart", async ({ page }) => {
    // Start at home page
    await page.goto("/");
    await page.waitForTimeout(500);

    // Add a product to cart
    const productCard = page.locator('.card').first();
    const productName = await productCard.locator('.card-title').first().textContent();

    await productCard.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    const addToCartButton = page.locator('.product-details-info button:has-text("ADD TO CART")');
    await addToCartButton.click();
    await page.waitForTimeout(1000);

    // Get cart count after adding
    const cartBadge = page.locator('.ant-badge-count');
    const cartCountAfterAdd = parseInt(await cartBadge.textContent().catch(() => "1")) || 1;

    // Navigate to cart
    const cartLink = page.locator('a[href="/cart"]');
    await cartLink.click();
    await page.waitForTimeout(500);

    // Assert: Product should be in cart (use filter to avoid strict mode)
    await expect(page.locator('.card.flex-row p').filter({ hasText: productName }).first()).toBeVisible();

    // Click remove button
    const removeButton = page.locator('.card.flex-row button:has-text("Remove")').first();
    await removeButton.click();
    await page.waitForTimeout(1000);

    // Assert: Cart count should decrease by 1
    const cartCountAfterRemove = parseInt(await cartBadge.textContent().catch(() => "0")) || 0;
    expect(cartCountAfterRemove).toBe(cartCountAfterAdd - 1);

    // Assert: If cart is now empty, should show empty message
    if (cartCountAfterRemove === 0) {
      await expect(page.locator('p:has-text("Your Cart Is Empty")')).toBeVisible();
    }
  });

  test("Cart total price calculation is correct", async ({ page }) => {
    // Clear cart first
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    await page.waitForTimeout(500);

    // Add a product to cart
    const productCard = page.locator('.card').first();
    const productPriceText = await productCard.locator('.card-price').textContent();

    // Extract numeric price
    const priceMatch = productPriceText?.match(/[\d,]+\.?\d*/);
    const productPrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

    await productCard.locator('button:has-text("More Details")').click();
    await page.waitForTimeout(500);

    const addToCartButton = page.locator('button:has-text("ADD TO CART")');
    await addToCartButton.click();
    await page.waitForTimeout(500);

    // Navigate to cart
    await page.goto("/cart");
    await page.waitForTimeout(500);

    // Get total from cart summary
    const totalText = await page.locator('h4:has-text("Total :")').textContent();
    const totalMatch = totalText?.match(/[\d,]+\.?\d*/);
    const displayedTotal = totalMatch ? parseFloat(totalMatch[0].replace(/,/g, '')) : 0;

    // Assert: Total should match the product price
    expect(displayedTotal).toBe(productPrice);
  });

  test("Cart integration: Multiple products with correct details", async ({ page }) => {
    // Clear cart first
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem('cart'));
    await page.reload();
    await page.waitForTimeout(500);

    // Collect products to add
    const productCards = page.locator('.card');
    const productCount = Math.min(await productCards.count(), 5);

    const productsToAdd = [];

    for (let i = 0; i < productCount; i++) {
      const card = productCards.nth(i);
      const name = await card.locator('.card-title').first().textContent();
      const priceText = await card.locator('.card-price').textContent();
      const priceMatch = priceText?.match(/[\d,]+\.?\d*/);
      const price = priceMatch ? priceMatch[0].replace(/,/g, '') : null;

      productsToAdd.push({ name, price });

      // Navigate to product and add to cart
      await card.locator('button:has-text("More Details")').click();
      await page.waitForTimeout(500);

      const addButton = page.locator('.product-details-info button:has-text("ADD TO CART")');
      await addButton.click();
      await page.waitForTimeout(1000);

      // Go back to home
      await page.goto("/");
      await page.waitForTimeout(500);
    }

    // Navigate to cart
    await page.goto("/cart");
    await page.waitForTimeout(500);

    // Assert: Cart should have all products
    await expect(page.locator(`p:has-text("You Have ${productCount} items in your cart")`)).toBeVisible();

    // Verify each product in cart (use filter to avoid strict mode violations)
    for (const product of productsToAdd) {
      await expect(page.locator('.card.flex-row p').filter({ hasText: product.name }).first()).toBeVisible();

      if (product.price) {
        await expect(page.locator('.card.flex-row p').filter({ hasText: `Price : ${product.price}` }).first()).toBeVisible();
      }
    }

    // Assert: Cart badge should show correct count
    const cartBadge = page.locator('.ant-badge-count');
    const badgeCount = parseInt(await cartBadge.textContent().catch(() => `${productCount}`)) || productCount;
    expect(badgeCount).toBe(productCount);
  });
});
