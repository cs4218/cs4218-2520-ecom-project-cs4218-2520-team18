// Loh Ze Qing Norbert, A0277473R
import { test, expect } from "@playwright/test";

const SEEDED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin.e2e@example.com";
const SEEDED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Password123";

const buildUser = (prefix = "protected-routes") => {
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
	await page.getByPlaceholder("Enter Your Email").fill(email);
	await page.getByPlaceholder("Enter Your Password").fill(password);
	await page.getByRole("button", { name: "LOGIN" }).click();
};

const registerAndLoginUser = async (page, user) => {
	await registerUserViaUi(page, user);

	const loginResponsePromise = page.waitForResponse(
		(response) =>
			response.url().includes("/api/v1/auth/login") &&
			response.request().method() === "POST" &&
			response.status() === 200,
	);

	await loginViaUi(page, user.email, user.password);
	await loginResponsePromise;
	await expect(page).toHaveURL("/");
};

const readAuthFromStorage = async (page) =>
	page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "null"));

const visitUserDashboardAndGetUserAuthStatus = async (page) => {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const authResponsePromise = page
			.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/user-auth") &&
					response.request().method() === "GET",
				{ timeout: 10000 },
			)
			.catch(() => null);

		await page.goto("/dashboard/user");
		const authResponse = await authResponsePromise;

		if (authResponse) {
			return {
				status: authResponse.status(),
				authorizationHeader: authResponse.request().headers().authorization,
			};
		}

		await page.waitForTimeout(400);
	}

	return { status: null, authorizationHeader: null };
};

const visitAdminDashboardAndGetAdminAuthStatus = async (page) => {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const authResponsePromise = page
			.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/admin-auth") &&
					response.request().method() === "GET",
				{ timeout: 10000 },
			)
			.catch(() => null);

		await page.goto("/dashboard/admin");
		const authResponse = await authResponsePromise;

		if (authResponse) {
			return {
				status: authResponse.status(),
				authorizationHeader: authResponse.request().headers().authorization,
			};
		}

		await page.waitForTimeout(400);
	}

	return { status: null, authorizationHeader: null };
};

test.describe("Protected route E2E flows", () => {
	test.describe("Atomic linear workflows", () => {
		test("denied access while logged out: /dashboard/user redirects to /login and never renders protected content", async ({ page }) => {
			let userAuthRequestCount = 0;
			page.on("request", (request) => {
				if (request.url().includes("/api/v1/auth/user-auth")) {
					userAuthRequestCount += 1;
				}
			});

			await page.goto("/login");
			await page.evaluate(() => localStorage.removeItem("auth"));

			await page.goto("/dashboard/user");

			await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
			await expect(page).toHaveURL(/\/$/, { timeout: 12000 });

			expect(userAuthRequestCount).toBe(0);
			await expect(page.locator("h3", { hasText: /@example\.com/i })).toHaveCount(0);
		});

		test("denied access while logged out: /dashboard/admin redirects to /login and admin dashboard never renders", async ({ page }) => {
			let adminAuthRequestCount = 0;
			page.on("request", (request) => {
				if (request.url().includes("/api/v1/auth/admin-auth")) {
					adminAuthRequestCount += 1;
				}
			});

			await page.goto("/login");
			await page.evaluate(() => localStorage.removeItem("auth"));

			await page.goto("/dashboard/admin");

			await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
			await expect(page).toHaveURL(/\/login$/, { timeout: 12000 });

			expect(adminAuthRequestCount).toBe(0);
			await expect(page.getByText(/Admin Name\s*:/i)).toHaveCount(0);
		});

		test("admin user granted for /dashboard/admin: login -> admin-auth 200 -> dashboard renders", async ({ page }) => {
			await page.goto("/login");

			const loginResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/login") &&
					response.request().method() === "POST" &&
					response.status() === 200,
			);

			await loginViaUi(page, SEEDED_ADMIN_EMAIL, SEEDED_ADMIN_PASSWORD);
			await loginResponsePromise;
			await expect(page).toHaveURL("/");

			const auth = await readAuthFromStorage(page);
			expect(auth).toBeTruthy();
			expect(auth.token).toBeTruthy();
			expect(auth.user?.email).toBe(SEEDED_ADMIN_EMAIL);

			await page.goto("/about");

			const { status, authorizationHeader } = await visitAdminDashboardAndGetAdminAuthStatus(page);
			expect(status).toBe(200);
			expect(authorizationHeader).toBe(auth.token);

			await expect(page).toHaveURL(/\/dashboard\/admin$/);
			await expect(page.getByText(/Admin Name\s*:/i)).toBeVisible();
			await expect(page.getByText(/Admin Email\s*:/i)).toBeVisible();
			await expect(page.getByText(SEEDED_ADMIN_EMAIL)).toBeVisible();
		});
	});

	test.describe("Cross workflows", () => {
		test("register -> login -> visit /dashboard/user: user-auth 200 and profile renders", async ({ page }) => {
			const user = buildUser("granted-user");
			await registerAndLoginUser(page, user);

			const auth = await readAuthFromStorage(page);
			expect(auth).toBeTruthy();
			expect(auth.token).toBeTruthy();
			expect(auth.user?.email).toBe(user.email);
			await expect(page.getByText(user.name)).toBeVisible();

			await page.goto("/about");

			const { status, authorizationHeader } = await visitUserDashboardAndGetUserAuthStatus(page);
			expect(status).toBe(200);
			expect(authorizationHeader).toBe(auth.token);

			await expect(page).toHaveURL(/\/dashboard\/user$/);
			await expect(page.locator("h3", { hasText: user.name })).toBeVisible();
			await expect(page.locator("h3", { hasText: user.email })).toBeVisible();
			await expect(page.locator("h3", { hasText: user.address })).toBeVisible();
		});

		test("register -> login as non-admin -> visit /dashboard/admin: denied and redirected", async ({ page }) => {
			const user = buildUser("non-admin");
			await registerAndLoginUser(page, user);

			const adminAuthResponsePromise = page.waitForResponse(
				(response) =>
					response.url().includes("/api/v1/auth/admin-auth") &&
					response.request().method() === "GET",
				{ timeout: 12000 },
			);

			await page.goto("/dashboard/admin");
			const adminAuthResponse = await adminAuthResponsePromise;

			expect([401, 403]).toContain(adminAuthResponse.status());
			await expect(page.getByText(/redirecting to you in/i)).toBeVisible();
			await expect(page).toHaveURL(/\/login$/, { timeout: 12000 });
			await expect(page.getByText(/Admin Name\s*:/i)).toHaveCount(0);
		});

		test("register -> login -> close tab -> reopen: persisted token still grants /dashboard/user", async ({ browser }) => {
			const user = buildUser("persist");

			const context = await browser.newContext();
			const page = await context.newPage();

			await registerAndLoginUser(page, user);

			const authBeforeClose = await readAuthFromStorage(page);
			expect(authBeforeClose).toBeTruthy();
			expect(authBeforeClose.token).toBeTruthy();
			expect(authBeforeClose.user?.name).toBe(user.name);

			await page.close();

			const reopenedPage = await context.newPage();

			const { status, authorizationHeader } = await visitUserDashboardAndGetUserAuthStatus(reopenedPage);

			const authAfterReopen = await readAuthFromStorage(reopenedPage);
			expect(authAfterReopen?.token).toBe(authBeforeClose.token);
			expect(status).toBe(200);
			expect(authorizationHeader).toBe(authBeforeClose.token);

			await expect(reopenedPage).toHaveURL(/\/dashboard\/user$/);
			await expect(reopenedPage.locator("h3", { hasText: user.name })).toBeVisible();
			await expect(reopenedPage.locator("h3", { hasText: user.email })).toBeVisible();
			await expect(reopenedPage.getByRole("button", { name: user.name })).toBeVisible();

			await context.close();
		});
	});
});
