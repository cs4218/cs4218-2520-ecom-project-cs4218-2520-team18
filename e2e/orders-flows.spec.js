// Aw Jean Leng Adrian, A0277537N

import { test, expect } from "@playwright/test";

const buildUser = (prefix = "orders") => {
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

const registerUserViaUi = async (page, user) => {
    await page.goto("/register");
    await page.getByPlaceholder("Enter Your Name").fill(user.name);
    await page.getByPlaceholder("Enter Your Email").fill(user.email);
    await page.getByPlaceholder("Enter Your Password").fill(user.password);
    await page.getByPlaceholder("Enter Your Phone").fill(user.phone);
    await page.getByPlaceholder("Enter Your Address").fill(user.address);
    await page.getByPlaceholder("Enter Your DOB").fill(user.dob);
    await page.getByPlaceholder("What is Your Favorite sports").fill(user.answer);
    await page.getByRole("button", { name: "REGISTER" }).click();
    await expect(page).toHaveURL(/\/login$/);
};

const loginViaUi = async (page, email, password) => {
    const loginPromise = page.waitForResponse(
        (response) =>
            response.url().includes("/api/v1/auth/login") &&
            response.request().method() === "POST" &&
            response.status() === 200,
    );

    await page.getByPlaceholder("Enter Your Email").fill(email);
    await page.getByPlaceholder("Enter Your Password").fill(password);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await loginPromise;

    await expect(page).toHaveURL("/");
};

const openDashboardPage = async (page, userName) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: userName })).toBeVisible();

    await page.getByRole("button", { name: userName }).first().click();
    await page.getByRole("link", { name: /^Dashboard$/ }).click();
    await expect(page).toHaveURL(/\/dashboard\/user$/);
};

const openOrdersPage = async (page, userName) => {
    await openDashboardPage(page, userName);
    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);
};

const getAuthToken = async (page) =>
    page.evaluate(() => {
        const authRaw = localStorage.getItem("auth");
        if (!authRaw) return null;
        const auth = JSON.parse(authRaw);
        return auth?.token ?? null;
    });

const createTestOrder = async (page, orderData) => {
    const token = await getAuthToken(page);
    const response = await page.request.post("/api/v1/auth/test/create-order", {
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        data: orderData,
    });
    return response.json();
};

const deleteTestOrders = async (page) => {
    const token = await getAuthToken(page);
    await page.request.delete("/api/v1/auth/test/delete-orders", {
        headers: {
            Authorization: token,
        },
    });
};

const getProducts = async (page) => {
    const response = await page.request.get("/api/v1/product/get-product");
    const data = await response.json();
    return data.products || [];
};

test.describe("Orders Page E2E flows", () => {
    test.describe("Authenticated User Order Display", () => {
        test("authenticated user can view orders page with seeded orders", async ({ page }) => {
            const user = buildUser("orders-display");

            // Register and login user
            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Get available products
            const products = await getProducts(page);
            expect(products.length).toBeGreaterThan(0);

            // Create 2 orders with different statuses
            await createTestOrder(page, {
                products: [{ slug: "novel" }, { slug: "textbook" }],
                payment: { success: true },
                status: "Processing",
            });

            await createTestOrder(page, {
                products: [{ slug: "laptop" }],
                payment: { success: false },
                status: "Shipped",
            });

            // Navigate to orders page
            await openOrdersPage(page, user.name);

            // Verify page title and heading
            await expect(page).toHaveTitle(/Your Orders/);
            await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();

            // Verify 2 order tables are rendered
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(2);

            // Verify each order shows required info (order number, status, buyer name, date, payment status, quantity)
            const firstOrderRow = page.locator("table.table").first().locator("tbody tr");
            await expect(firstOrderRow.locator("td").nth(0)).toContainText("1"); // Order number
            await expect(firstOrderRow.locator("td").nth(1)).toContainText("Processing"); // Status
            await expect(firstOrderRow.locator("td").nth(2)).toContainText(user.name); // Buyer name
            await expect(firstOrderRow.locator("td").nth(4)).toContainText("Success"); // Payment
            await expect(firstOrderRow.locator("td").nth(5)).toContainText("2"); // Quantity

            // Cleanup
            await deleteTestOrders(page);
        });

        test("order table shows correct headers", async ({ page }) => {
            const user = buildUser("orders-headers");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify table headers
            const headerRow = page.locator("table.table thead tr").first();
            await expect(headerRow.locator("th").nth(0)).toContainText("#");
            await expect(headerRow.locator("th").nth(1)).toContainText("Status");
            await expect(headerRow.locator("th").nth(2)).toContainText("Buyer");
            await expect(headerRow.locator("th").nth(3)).toContainText("date");
            await expect(headerRow.locator("th").nth(4)).toContainText("Payment");
            await expect(headerRow.locator("th").nth(5)).toContainText("Quantity");

            await deleteTestOrders(page);
        });
    });

    test.describe("Order Information Display", () => {
        test("order displays all required information correctly", async ({ page }) => {
            const user = buildUser("order-info");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create order with specific data
            await createTestOrder(page, {
                products: [{ slug: "novel" }, { slug: "textbook" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify first order table shows correct info
            const orderRow = page.locator("table.table tbody tr").first();
            await expect(orderRow.locator("td").nth(0)).toContainText("1"); // Order number: "1"
            await expect(orderRow.locator("td").nth(1)).toContainText("Processing"); // Status
            await expect(orderRow.locator("td").nth(2)).toContainText(user.name); // Buyer name
            await expect(orderRow.locator("td").nth(4)).toContainText("Success"); // Payment success
            await expect(orderRow.locator("td").nth(5)).toContainText("2"); // Quantity: 2 products

            await deleteTestOrders(page);
        });
    });

    test.describe("Payment Status Indicators", () => {
        test("payment success displays 'Success'", async ({ page }) => {
            const user = buildUser("payment-success");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            const paymentCell = page.locator("table.table tbody tr").first().locator("td").nth(4);
            await expect(paymentCell).toContainText("Success");

            await deleteTestOrders(page);
        });

        test("payment failure displays 'Failed'", async ({ page }) => {
            const user = buildUser("payment-failed");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: false },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            const paymentCell = page.locator("table.table tbody tr").first().locator("td").nth(4);
            await expect(paymentCell).toContainText("Failed");

            await deleteTestOrders(page);
        });

        test("multiple orders show different payment statuses", async ({ page }) => {
            const user = buildUser("payment-mixed");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await createTestOrder(page, {
                products: [{ slug: "textbook" }],
                payment: { success: false },
                status: "Shipped",
            });

            await openOrdersPage(page, user.name);

            // Verify first order has Success payment
            const firstOrderPayment = page.locator("table.table").first().locator("tbody tr td").nth(4);
            await expect(firstOrderPayment).toContainText("Success");

            // Verify second order has Failed payment
            const secondOrderPayment = page.locator("table.table").nth(1).locator("tbody tr td").nth(4);
            await expect(secondOrderPayment).toContainText("Failed");

            await deleteTestOrders(page);
        });
    });

    test.describe("Product Display Within Orders", () => {
        test("product cards display below order table", async ({ page }) => {
            const user = buildUser("product-cards");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }, { slug: "textbook" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify product cards are displayed
            const productCards = page.locator(".row.mb-2.p-3.card.flex-row");
            await expect(productCards).toHaveCount(2);

            await deleteTestOrders(page);
        });

        test("product card shows image, name, description, and price", async ({ page }) => {
            const user = buildUser("product-details");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify product card contains required elements
            const productCard = page.locator(".row.mb-2.p-3.card.flex-row").first();

            // Verify image is present
            const productImage = productCard.locator("img.card-img-top");
            await expect(productImage).toBeVisible();
            await expect(productImage).toHaveAttribute("src", /\/api\/v1\/product\/product-photo\//);
            await expect(productImage).toHaveAttribute("width", "100px");
            await expect(productImage).toHaveAttribute("height", "100px");

            // Verify product name is displayed
            await expect(productCard).toContainText("Novel");

            // Verify price formatting
            await expect(productCard).toContainText("Price: $14.99");

            await deleteTestOrders(page);
        });

        test("product description is truncated to 30 characters", async ({ page }) => {
            const user = buildUser("product-truncate");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Use a product with longer description
            await createTestOrder(page, {
                products: [{ slug: "the-law-of-contract-in-singapore" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // The description should be truncated - get the text content
            const productCard = page.locator(".row.mb-2.p-3.card.flex-row").first();
            const descriptionElement = productCard.locator(".col-md-8 p").nth(1);
            const descriptionText = await descriptionElement.textContent();

            // Description should be 30 characters or less
            expect(descriptionText.length).toBeLessThanOrEqual(30);

            await deleteTestOrders(page);
        });

        test("product image has correct alt text", async ({ page }) => {
            const user = buildUser("product-alt");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            const productImage = page.locator(".row.mb-2.p-3.card.flex-row img.card-img-top").first();
            await expect(productImage).toHaveAttribute("alt", "Novel");

            await deleteTestOrders(page);
        });
    });

    test.describe("UserMenu Integration", () => {
        test("UserMenu is rendered in left column", async ({ page }) => {
            const user = buildUser("usermenu");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);
            await openOrdersPage(page, user.name);

            // Verify the dashboard layout with UserMenu in col-md-3
            const leftColumn = page.locator(".col-md-3");
            await expect(leftColumn).toBeVisible();

            // Verify UserMenu contains Dashboard heading and navigation links
            const userMenu = leftColumn.locator(".list-group");
            await expect(userMenu).toBeVisible();
            await expect(userMenu.getByRole("heading", { name: "Dashboard" })).toBeVisible();
            await expect(userMenu.getByRole("link", { name: "Profile" })).toBeVisible();
            await expect(userMenu.getByRole("link", { name: "Orders" })).toBeVisible();
        });

        test("orders content is in right column", async ({ page }) => {
            const user = buildUser("right-column");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify orders content is in col-md-9
            const rightColumn = page.locator(".col-md-9");
            await expect(rightColumn).toBeVisible();
            await expect(rightColumn.getByRole("heading", { name: "All Orders" })).toBeVisible();

            await deleteTestOrders(page);
        });

        test("Bootstrap grid structure is correct", async ({ page }) => {
            const user = buildUser("grid-structure");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);
            await openOrdersPage(page, user.name);

            // Verify container-fluid and row structure
            const container = page.locator(".container-fluid.dashboard");
            await expect(container).toBeVisible();

            const row = container.locator(".row");
            await expect(row).toBeVisible();
        });

        test("UserMenu Profile link navigates correctly", async ({ page }) => {
            const user = buildUser("usermenu-nav");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);
            await openOrdersPage(page, user.name);

            // Click Profile link in UserMenu
            await page.getByRole("link", { name: "Profile" }).click();
            await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);
        });
    });

    test.describe("Unauthenticated User Handling", () => {
        test("unauthenticated user is redirected from orders page", async ({ page }) => {
            // Navigate directly to orders page without logging in
            await page.goto("/dashboard/user/orders");

            // User should be redirected (protected route behavior)
            await expect(page.getByText(/redirecting to you in/i)).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe("Multiple Orders Display", () => {
        test("all orders are displayed in separate tables", async ({ page }) => {
            const user = buildUser("multiple-orders");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create 3 orders with different dates
            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await createTestOrder(page, {
                products: [{ slug: "textbook" }],
                payment: { success: true },
                status: "Shipped",
            });

            await createTestOrder(page, {
                products: [{ slug: "laptop" }],
                payment: { success: false },
                status: "Delivered",
            });

            await openOrdersPage(page, user.name);

            // Verify all 3 orders displayed in separate tables
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(3);

            // Verify order numbers are displayed correctly (1, 2, 3)
            const firstOrderNumber = page.locator("table.table").nth(0).locator("tbody tr td").first();
            const secondOrderNumber = page.locator("table.table").nth(1).locator("tbody tr td").first();
            const thirdOrderNumber = page.locator("table.table").nth(2).locator("tbody tr td").first();

            await expect(firstOrderNumber).toContainText("1");
            await expect(secondOrderNumber).toContainText("2");
            await expect(thirdOrderNumber).toContainText("3");

            await deleteTestOrders(page);
        });

        test("each order independently shows its products", async ({ page }) => {
            const user = buildUser("order-products");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create 2 orders with different products
            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await createTestOrder(page, {
                products: [{ slug: "laptop" }, { slug: "smartphone" }],
                payment: { success: true },
                status: "Shipped",
            });

            await openOrdersPage(page, user.name);

            // First order should have 1 product card, second should have 2
            const orderContainers = page.locator(".border.shadow");

            // First order
            const firstOrderProducts = orderContainers.nth(0).locator(".row.mb-2.p-3.card.flex-row");
            await expect(firstOrderProducts).toHaveCount(1);

            // Second order
            const secondOrderProducts = orderContainers.nth(1).locator(".row.mb-2.p-3.card.flex-row");
            await expect(secondOrderProducts).toHaveCount(2);

            await deleteTestOrders(page);
        });
    });

    test.describe("Date Formatting with Moment", () => {
        test("date is displayed using moment.fromNow() format", async ({ page }) => {
            const user = buildUser("date-format");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify date is displayed in relative format (e.g., "a few seconds ago")
            const dateCell = page.locator("table.table tbody tr td").nth(3);
            const dateText = await dateCell.textContent();

            // Date should match moment's relative time pattern
            expect(dateText).toMatch(/ago|just now|seconds|minutes|hours|days/i);

            await deleteTestOrders(page);
        });
    });

    test.describe("Empty Order State", () => {
        test("authenticated user with no orders sees empty state", async ({ page }) => {
            const user = buildUser("empty-orders");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);
            await openOrdersPage(page, user.name);

            // Verify "All Orders" heading is displayed
            await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();

            // Verify no order tables are rendered
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(0);

            // Verify UserMenu is still visible
            await expect(page.locator(".list-group")).toBeVisible();
            await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();

            // Verify page doesn't crash (no error messages)
            await expect(page.locator("text=Error")).not.toBeVisible();
        });
    });

    test.describe("Product Image Loading", () => {
        test("product images load with correct attributes", async ({ page }) => {
            const user = buildUser("image-load");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }, { slug: "textbook" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify both product images are present
            const productImages = page.locator("img.card-img-top");
            await expect(productImages).toHaveCount(2);

            // Verify each image has correct attributes
            for (let i = 0; i < 2; i++) {
                const img = productImages.nth(i);
                await expect(img).toHaveAttribute("width", "100px");
                await expect(img).toHaveAttribute("height", "100px");
                await expect(img).toHaveAttribute("src", /\/api\/v1\/product\/product-photo\//);
                await expect(img).toHaveClass(/card-img-top/);
            }

            await deleteTestOrders(page);
        });
    });

    test.describe("API Integration Verification", () => {
        test("orders page makes GET request to /api/v1/auth/orders with auth token", async ({ page }) => {
            const user = buildUser("api-verify");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            // Monitor the orders API request
            const ordersRequestPromise = page.waitForResponse(
                (response) =>
                    response.url().includes("/api/v1/auth/orders") &&
                    response.request().method() === "GET" &&
                    response.status() === 200,
            );

            await openOrdersPage(page, user.name);

            const ordersResponse = await ordersRequestPromise;
            const ordersData = await ordersResponse.json();

            // Verify API returns populated data
            expect(Array.isArray(ordersData)).toBe(true);
            expect(ordersData.length).toBeGreaterThan(0);

            // Verify order has populated products
            const order = ordersData[0];
            expect(order.products).toBeDefined();
            expect(order.products.length).toBeGreaterThan(0);
            expect(order.products[0].name).toBeDefined();

            // Verify order has populated buyer info
            expect(order.buyer).toBeDefined();
            expect(order.buyer.name).toBe(user.name);

            await deleteTestOrders(page);
        });

        test("orders API request includes authorization header", async ({ page }) => {
            const user = buildUser("api-auth");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Get auth token before navigating
            const token = await getAuthToken(page);
            expect(token).toBeTruthy();

            // Monitor the orders API request
            let capturedAuthHeader = null;
            page.on("request", (request) => {
                if (request.url().includes("/api/v1/auth/orders") && request.method() === "GET") {
                    capturedAuthHeader = request.headers()["authorization"];
                }
            });

            await openOrdersPage(page, user.name);

            // Verify authorization header was included
            expect(capturedAuthHeader).toBeTruthy();
            expect(capturedAuthHeader).toBe(token);
        });
    });

    test.describe("Order Status Variety", () => {
        test("all status values display correctly", async ({ page }) => {
            const user = buildUser("status-variety");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create orders with different statuses
            const statuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];

            for (const status of statuses) {
                await createTestOrder(page, {
                    products: [{ slug: "novel" }],
                    payment: { success: true },
                    status: status,
                });
            }

            await openOrdersPage(page, user.name);

            // Verify all 5 orders are displayed
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(5);

            // Verify each status is displayed correctly
            for (let i = 0; i < statuses.length; i++) {
                const statusCell = page.locator("table.table").nth(i).locator("tbody tr td").nth(1);
                await expect(statusCell).toContainText(statuses[i]);
            }

            await deleteTestOrders(page);
        });
    });

    test.describe("Price Precision", () => {
        test("product prices display with correct decimal formatting", async ({ page }) => {
            const user = buildUser("price-format");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create order with products of different prices
            await createTestOrder(page, {
                products: [{ slug: "novel" }, { slug: "laptop" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify price formatting (Novel: $14.99, Laptop: $1499.99)
            const productCards = page.locator(".row.mb-2.p-3.card.flex-row");

            // Check that prices are formatted with 2 decimal places
            const firstProductPrice = productCards.nth(0).locator(".col-md-8 p").filter({ hasText: "Price:" });
            const secondProductPrice = productCards.nth(1).locator(".col-md-8 p").filter({ hasText: "Price:" });

            await expect(firstProductPrice).toContainText(/Price: \$\d+\.\d{2}/);
            await expect(secondProductPrice).toContainText(/Price: \$\d+\.\d{2}/);

            await deleteTestOrders(page);
        });
    });

    test.describe("Layout and Styling Verification", () => {
        test("container has correct classes", async ({ page }) => {
            const user = buildUser("container-classes");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);
            await openOrdersPage(page, user.name);

            // Verify container has correct classes
            const container = page.locator(".container-fluid.p-3.m-3.dashboard");
            await expect(container).toBeVisible();
        });

        test("order table has correct class", async ({ page }) => {
            const user = buildUser("table-class");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify table has "table" class
            const table = page.locator("table.table");
            await expect(table).toBeVisible();

            await deleteTestOrders(page);
        });

        test("product cards have correct flex layout classes", async ({ page }) => {
            const user = buildUser("flex-layout");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify product card has correct classes
            const productCard = page.locator(".row.mb-2.p-3.card.flex-row");
            await expect(productCard).toBeVisible();

            // Verify image column has correct class
            const imageColumn = productCard.locator(".col-md-4");
            await expect(imageColumn).toBeVisible();

            // Verify details column has correct class
            const detailsColumn = productCard.locator(".col-md-8");
            await expect(detailsColumn).toBeVisible();

            await deleteTestOrders(page);
        });

        test("order containers have border and shadow classes", async ({ page }) => {
            const user = buildUser("border-shadow");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            await openOrdersPage(page, user.name);

            // Verify order container has border and shadow classes
            const orderContainer = page.locator(".border.shadow");
            await expect(orderContainer).toBeVisible();

            await deleteTestOrders(page);
        });
    });
});