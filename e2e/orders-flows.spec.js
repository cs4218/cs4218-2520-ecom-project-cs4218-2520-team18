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
    test.describe("Complete Order Viewing User Journey", () => {
        test("User registers, logs in, creates orders, and views them on orders page", async ({ page }) => {
            const user = buildUser("complete-flow");

            // Step 1: Register new user
            await registerUserViaUi(page, user);

            // Step 2: Login
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Step 3: Create orders
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

            // Step 4: Navigate to orders page
            await openOrdersPage(page, user.name);

            // Step 5: Verify orders are displayed
            await expect(page).toHaveTitle(/Your Orders/);
            await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();

            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(2);

            // Verify order information is displayed
            const firstOrderRow = page.locator("table.table").first().locator("tbody tr");
            await expect(firstOrderRow.locator("td").nth(1)).toContainText("Processing");
            await expect(firstOrderRow.locator("td").nth(2)).toContainText(user.name);
            await expect(firstOrderRow.locator("td").nth(4)).toContainText("Success");

            // Verify products are displayed
            const productCards = page.locator(".row.mb-2.p-3.card.flex-row");
            await expect(productCards.first()).toBeVisible();

            // Cleanup
            await deleteTestOrders(page);
        });

        test("User with multiple orders views all orders with different statuses and payment states", async ({ page }) => {
            const user = buildUser("multiple-orders");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create orders with different statuses and payment states
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

            // Verify all 3 orders are displayed
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(3);

            // Verify different statuses are shown
            const firstStatus = await page.locator("table.table").nth(0).locator("tbody tr td").nth(1).textContent();
            const secondStatus = await page.locator("table.table").nth(1).locator("tbody tr td").nth(1).textContent();
            const thirdStatus = await page.locator("table.table").nth(2).locator("tbody tr td").nth(1).textContent();

            expect([firstStatus, secondStatus, thirdStatus]).toContain("Processing");
            expect([firstStatus, secondStatus, thirdStatus]).toContain("Shipped");
            expect([firstStatus, secondStatus, thirdStatus]).toContain("Delivered");

            // Verify payment statuses
            const firstPayment = page.locator("table.table").first().locator("tbody tr td").nth(4);
            const thirdPayment = page.locator("table.table").nth(2).locator("tbody tr td").nth(4);

            await expect(firstPayment).toContainText("Success");
            await expect(thirdPayment).toContainText("Failed");

            await deleteTestOrders(page);
        });

        test("User views orders with different product quantities across multiple orders", async ({ page }) => {
            const user = buildUser("order-products");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create orders with different product counts
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

            // Verify product counts
            const firstOrderQuantity = page.locator("table.table").nth(0).locator("tbody tr td").nth(5);
            const secondOrderQuantity = page.locator("table.table").nth(1).locator("tbody tr td").nth(5);

            await expect(firstOrderQuantity).toContainText("1");
            await expect(secondOrderQuantity).toContainText("2");

            // Verify product cards are displayed for each order
            const orderContainers = page.locator(".border.shadow");
            const firstOrderProducts = orderContainers.nth(0).locator(".row.mb-2.p-3.card.flex-row");
            const secondOrderProducts = orderContainers.nth(1).locator(".row.mb-2.p-3.card.flex-row");

            await expect(firstOrderProducts).toHaveCount(1);
            await expect(secondOrderProducts).toHaveCount(2);

            await deleteTestOrders(page);
        });
    });

    test.describe("Dashboard Navigation Flow", () => {
        test("User navigates from home to dashboard to orders page", async ({ page }) => {
            const user = buildUser("navigation");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            // Navigate from home
            await page.goto("/");
            await expect(page.getByRole("button", { name: user.name })).toBeVisible();

            // Open dashboard
            await page.getByRole("button", { name: user.name }).first().click();
            await page.getByRole("link", { name: /^Dashboard$/ }).click();
            await expect(page).toHaveURL(/\/dashboard\/user$/);

            // Navigate to orders from dashboard
            await page.getByRole("link", { name: "Orders" }).click();
            await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);

            // Verify orders page is loaded with order data
            await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(1);

            await deleteTestOrders(page);
        });

        test("User navigates from orders page to profile page and back to orders", async ({ page }) => {
            const user = buildUser("profile-nav");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            // Go to orders page
            await openOrdersPage(page, user.name);
            await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);

            // Navigate to profile
            await page.getByRole("link", { name: "Profile" }).click();
            await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);

            // Navigate back to orders
            await page.getByRole("link", { name: "Orders" }).click();
            await expect(page).toHaveURL(/\/dashboard\/user\/orders$/);

            // Verify orders are still displayed
            await expect(page.getByRole("heading", { name: "All Orders"  })).toBeVisible();
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(1);

            await deleteTestOrders(page);
        });
    });

    test.describe("Unauthenticated Access Flow", () => {
        test("Unauthenticated user attempts to access orders page and is redirected", async ({ page }) => {
            // Attempt to navigate directly to orders page without logging in
            await page.goto("/dashboard/user/orders");

            // User should be redirected with appropriate message
            await expect(page.getByText(/redirecting to you in/i)).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe("Empty State Flow", () => {
        test("New user with no orders views empty orders page", async ({ page }) => {
            const user = buildUser("empty-orders");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Navigate to orders page without creating any orders
            await openOrdersPage(page, user.name);

            // Verify page loads correctly with no orders
            await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(0);

            // Verify dashboard menu is still functional
            await expect(page.locator(".list-group")).toBeVisible();
            await expect(page.getByRole("link", { name: "Profile" })).toBeVisible();
        });
    });

    test.describe("Order API Integration Flow", () => {
        test("User views orders page and correct API call is made with authentication", async ({ page }) => {
            const user = buildUser("api-verify");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            await createTestOrder(page, {
                products: [{ slug: "novel" }],
                payment: { success: true },
                status: "Processing",
            });

            // Get auth token
            const token = await getAuthToken(page);
            expect(token).toBeTruthy();

            // Monitor API request
            let capturedAuthHeader = null;
            page.on("request", (request) => {
                if (request.url().includes("/api/v1/auth/orders") && request.method() === "GET") {
                    capturedAuthHeader = request.headers()["authorization"];
                }
            });

            // Monitor API response
            const ordersRequestPromise = page.waitForResponse(
                (response) =>
                    response.url().includes("/api/v1/auth/orders") &&
                    response.request().method() === "GET" &&
                    response.status() === 200,
            );

            await openOrdersPage(page, user.name);

            // Verify API call was made with correct auth header
            expect(capturedAuthHeader).toBe(token);

            // Verify API response data
            const ordersResponse = await ordersRequestPromise;
            const ordersData = await ordersResponse.json();

            expect(Array.isArray(ordersData)).toBe(true);
            expect(ordersData.length).toBeGreaterThan(0);

            // Verify order data is populated correctly
            const order = ordersData[0];
            expect(order.products).toBeDefined();
            expect(order.products.length).toBeGreaterThan(0);
            expect(order.buyer.name).toBe(user.name);

            // Verify UI displays the API data
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(ordersData.length);

            await deleteTestOrders(page);
        });
    });

    test.describe("Multi-Status Order Flow", () => {
        test("User views orders progressing through different status values", async ({ page }) => {
            const user = buildUser("status-flow");

            await registerUserViaUi(page, user);
            await page.goto("/login");
            await loginViaUi(page, user.email, user.password);

            // Create orders with all possible statuses
            const statuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];

            for (const status of statuses) {
                await createTestOrder(page, {
                    products: [{ slug: "novel" }],
                    payment: { success: true },
                    status: status,
                });
            }

            await openOrdersPage(page, user.name);

            // Verify all orders are displayed
            const orderTables = page.locator("table.table");
            await expect(orderTables).toHaveCount(5);

            // Verify each status is displayed
            for (let i = 0; i < statuses.length; i++) {
                const statusCell = page.locator("table.table").nth(i).locator("tbody tr td").nth(1);
                await expect(statusCell).toContainText(statuses[i]);
            }

            await deleteTestOrders(page);
        });
    });
});
