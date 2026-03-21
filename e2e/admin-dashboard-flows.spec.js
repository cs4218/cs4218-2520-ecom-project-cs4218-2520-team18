// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const SEEDED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin.e2e@example.com";
const SEEDED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Password123";

const buildUser = (prefix = "admin-flow") => {
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

const loginAsAdmin = async (page, options = {}) => {
	await page.goto("/login");

	const loginResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes("/api/v1/auth/login") &&
			response.request().method() === "POST" &&
			response.status() === 200,
	);

	await page.getByPlaceholder("Enter Your Email").fill(SEEDED_ADMIN_EMAIL);
	await page.getByPlaceholder("Enter Your Password").fill(SEEDED_ADMIN_PASSWORD);
	await page.getByRole("button", { name: "LOGIN" }).click();

	await loginResponsePromise;

	// Admin can be redirected to "/" or to their previous location (e.g., "/dashboard/admin")
	// Check that we're NOT still on the login page
	if (options.skipUrlCheck !== true) {
		await expect(page).not.toHaveURL(/\/login$/);
	}
};

const logoutFromNavbar = async (page, displayName) => {
	await page.goto("/");
	await page.locator("a.nav-link.dropdown-toggle").nth(1).click();
	await page.getByRole("link", { name: "Logout" }).click();
	await expect(page).toHaveURL(/\/login$/);
};

const readAuthFromStorage = async (page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "null"));

test.describe("Admin Dashboard E2E flows", () => {
	test.describe("Atomic linear workflows", () => {
		// Loh Ze Qing Norbert, A0277473R
		test("admin login -> dashboard -> verify admin info displayed", async ({ page }) => {
			await loginAsAdmin(page);

			const auth = await readAuthFromStorage(page);
			expect(auth).toBeTruthy();
			expect(auth.token).toBeTruthy();
			expect(auth.user?.email).toBe(SEEDED_ADMIN_EMAIL);
			expect(auth.user?.role).toBe(1);

			await page.goto("/dashboard/admin");
			await expect(page).toHaveURL(/\/dashboard\/admin$/);

			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();
			await expect(page.getByText(/Admin Email\s*:/i)).toBeVisible();
			await expect(page.getByText(/Admin Contact\s*:/i)).toBeVisible();
			await expect(page.getByText(SEEDED_ADMIN_EMAIL)).toBeVisible();

			await expect(page.getByText("Admin Panel")).toBeVisible();
			await expect(page.getByRole("link", { name: "Create Category" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Create Product" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Products" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
			await expect(page.getByRole("link", { name: "Users" })).toBeVisible();
		});

		// Loh Ze Qing Norbert, A0277473R
		test("admin navigates to users page and views users list", async ({ page }) => {
			const testUser = buildUser("admin-users-view");
			await registerUserViaUi(page, testUser);

			await loginAsAdmin(page);

			const allUsersResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/all-users") &&
					response.request().method() === "GET" &&
					response.status() === 200,
				{ timeout: 10000 },
			);

			await page.goto("/dashboard/admin/users");
			const allUsersResponse = await allUsersResponsePromise;

			await expect(page).toHaveURL(/\/dashboard\/admin\/users$/);
			await expect(page.getByText("All Users")).toBeVisible();

			const responseBody = await allUsersResponse.json();
			expect(responseBody.success).toBe(true);
			expect(responseBody.users).toBeDefined();
			expect(Array.isArray(responseBody.users)).toBe(true);
			expect(responseBody.users.length).toBeGreaterThan(0);

			const foundTestUser = responseBody.users.some(
				(u) => u.email === testUser.email,
			);
			expect(foundTestUser).toBe(true);

			await expect(page.locator("table")).toBeVisible();
			await expect(page.locator("thead th").first()).toContainText("Name");
			await expect(page.locator("thead th").nth(1)).toContainText("Email");
			await expect(page.locator("thead th").nth(2)).toContainText("Phone");

			await expect(page.getByText(testUser.email)).toBeVisible();
		});

		// Loh Ze Qing Norbert, A0277473R
		test("admin menu navigation: all menu items are clickable and navigate correctly", async ({ page }) => {
			await loginAsAdmin(page);
			await page.goto("/dashboard/admin");

			await page.getByRole("link", { name: "Create Category" }).click();
			await expect(page).toHaveURL(/\/dashboard\/admin\/create-category$/);

			await page.getByRole("link", { name: "Create Product" }).click();
			await expect(page).toHaveURL(/\/dashboard\/admin\/create-product$/);

			await page.getByRole("link", { name: "Products" }).click();
			await expect(page).toHaveURL(/\/dashboard\/admin\/products$/);

			await page.getByRole("link", { name: "Orders" }).click();
			await expect(page).toHaveURL(/\/dashboard\/admin\/orders$/);

			await page.getByRole("link", { name: "Users" }).click();
			await expect(page).toHaveURL(/\/dashboard\/admin\/users$/);
		});

		// Loh Ze Qing Norbert, A0277473R
		test("admin requests include authorization header with valid token", async ({ page }) => {
			await loginAsAdmin(page);

			const auth = await readAuthFromStorage(page);
			expect(auth.token).toBeTruthy();

			const allUsersResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/all-users") &&
					response.request().method() === "GET",
				{ timeout: 10000 },
			);

			await page.goto("/dashboard/admin/users");
			const allUsersResponse = await allUsersResponsePromise;

			const authHeader = allUsersResponse.request().headers().authorization;
			expect(authHeader).toBe(auth.token);
			expect(allUsersResponse.status()).toBe(200);
		});
	});

	test.describe("Cross workflows", () => {
		// Loh Ze Qing Norbert, A0277473R
		test("admin login -> users page -> verify multiple users -> logout -> protected route blocked", async ({ page }) => {
			const userOne = buildUser("admin-multi-user-1");
			const userTwo = buildUser("admin-multi-user-2");

			await registerUserViaUi(page, userOne);
			await registerUserViaUi(page, userTwo);

			await loginAsAdmin(page);

			const auth = await readAuthFromStorage(page);
			expect(auth.user?.role).toBe(1);

			const adminAuthResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/admin-auth") &&
					response.request().method() === "GET",
				{ timeout: 10000 },
			);

			await page.goto("/dashboard/admin/users");
			const adminAuthResponse = await adminAuthResponsePromise;
			expect(adminAuthResponse.status()).toBe(200);

			await expect(page.getByText("All Users")).toBeVisible();
			await expect(page.locator("table")).toBeVisible();

			const tableContent = await page.locator("tbody").textContent();
			expect(tableContent).toContain(userOne.email);
			expect(tableContent).toContain(userTwo.email);

			await logoutFromNavbar(page, auth.user.name);

			const authAfterLogout = await page.evaluate(() =>
				localStorage.getItem("auth"),
			);
			expect(authAfterLogout).toBeNull();

			const blockedAdminAuthPromise = page
				.waitForResponse(
					(response) =>
						response.url().includes("/api/v1/auth/admin-auth") &&
						response.request().method() === "GET",
					{ timeout: 6000 },
				)
				.catch(() => null);

			await page.goto("/dashboard/admin/users");

			const blockedAdminAuthResponse = await blockedAdminAuthPromise;
			if (blockedAdminAuthResponse) {
				expect([401, 403]).toContain(blockedAdminAuthResponse.status());
			}

			// Wait for redirect to login (happens quickly after logout)
			await expect(page).toHaveURL(/\/login$|^\/$/, { timeout: 12000 });
			await expect(page.getByText("All Users")).toHaveCount(0);
		});

		// Loh Ze Qing Norbert, A0277473R
		test("admin login -> dashboard -> refresh persists session -> users page still accessible", async ({ page }) => {
			const refreshUser = buildUser("admin-refresh-user");
			await registerUserViaUi(page, refreshUser);

			await loginAsAdmin(page);

			const authBeforeRefresh = await readAuthFromStorage(page);
			expect(authBeforeRefresh.token).toBeTruthy();
			expect(authBeforeRefresh.user?.role).toBe(1);

			await page.goto("/dashboard/admin");
			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();

			await page.reload();

			const authAfterRefresh = await readAuthFromStorage(page);
			expect(authAfterRefresh.token).toBe(authBeforeRefresh.token);
			expect(authAfterRefresh.user?.email).toBe(SEEDED_ADMIN_EMAIL);

			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();

			await page.goto("/dashboard/admin/users");
			await expect(page).toHaveURL(/\/dashboard\/admin\/users$/);
			await expect(page.getByText("All Users")).toBeVisible();
			await expect(page.getByText(refreshUser.email)).toBeVisible();
		});

		// Loh Ze Qing Norbert, A0277473R
		test("admin re-login after logout restores full admin access to all pages", async ({ page }) => {
			await loginAsAdmin(page);

			await page.goto("/dashboard/admin");
			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();

			const auth = await readAuthFromStorage(page);
			expect(auth.token).toBeTruthy();

			await logoutFromNavbar(page, auth.user.name);

			const authAfterLogout = await page.evaluate(() =>
				localStorage.getItem("auth"),
			);
			expect(authAfterLogout).toBeNull();

			await page.goto("/dashboard/admin");

			// Wait for redirect to login after accessing protected route while logged out
			await expect(page).toHaveURL(/\/login$|^\/$/, { timeout: 12000 });

			await loginAsAdmin(page);

			const authAfterRelogin = await readAuthFromStorage(page);
			expect(authAfterRelogin.token).toBeTruthy();
			expect(authAfterRelogin.user?.role).toBe(1);

			await page.goto("/dashboard/admin");
			await expect(page).toHaveURL(/\/dashboard\/admin$/);
			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();

			await page.goto("/dashboard/admin/users");
			await expect(page).toHaveURL(/\/dashboard\/admin\/users$/);
			await expect(page.getByText("All Users")).toBeVisible();

			await page.goto("/dashboard/admin/create-category");
			await expect(page).toHaveURL(/\/dashboard\/admin\/create-category$/);
		});

		// Loh Ze Qing Norbert, A0277473R
		test("regular user cannot access admin routes even with valid user token", async ({ page }) => {
			const regularUser = buildUser("non-admin-blocked");
			await registerUserViaUi(page, regularUser);

			await page.goto("/login");
			await page.getByPlaceholder("Enter Your Email").fill(regularUser.email);
			await page.getByPlaceholder("Enter Your Password").fill(regularUser.password);
			await page.getByRole("button", { name: "LOGIN" }).click();
			await expect(page).toHaveURL("/");

			const auth = await readAuthFromStorage(page);
			expect(auth.token).toBeTruthy();
			expect(auth.user?.role).toBe(0);

			const adminAuthResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/admin-auth") &&
					response.request().method() === "GET",
				{ timeout: 12000 },
			);

			await page.goto("/dashboard/admin");
			const adminAuthResponse = await adminAuthResponsePromise;

			expect([401, 403]).toContain(adminAuthResponse.status());

			// Wait for redirect to login (with or without redirect message)
			await expect(page).toHaveURL(/\/login$/, { timeout: 12000 });
			await expect(page.getByText(/Admin Name\s*:/i)).toHaveCount(0);

			const allUsersResponsePromise = page
				.waitForResponse(
					(response) =>
						response.url().includes("/api/v1/auth/all-users") &&
						response.request().method() === "GET",
					{ timeout: 6000 },
				)
				.catch(() => null);

			await page.goto("/dashboard/admin/users");
			const allUsersResponse = await allUsersResponsePromise;

			if (allUsersResponse) {
				expect([401, 403]).toContain(allUsersResponse.status());
			}

			// Wait for redirect to login (with or without redirect message)
			await expect(page).toHaveURL(/\/login$/, { timeout: 12000 });
			await expect(page.getByText("All Users")).toHaveCount(0);
		});
	});
});
