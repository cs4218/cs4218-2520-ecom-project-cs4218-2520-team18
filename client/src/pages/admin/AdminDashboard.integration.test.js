// Billy Ho Cheng En, A0252588R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import AdminDashboard from "./AdminDashboard";
import { AuthProvider } from "../../context/auth";

jest.mock("../../components/Layout", () => ({ children, title }) => (
	<div data-testid="layout-mock">
		<div data-testid="layout-title">{title}</div>
		{children}
	</div>
));

describe("AdminDashboard - Integration Tests", () => {
	const renderAdminDashboardIntegration = (initialPath = "/dashboard/admin") =>
		render(
			<AuthProvider>
				<MemoryRouter initialEntries={[initialPath]}>
					<Routes>
						<Route path="/dashboard/admin" element={<AdminDashboard />} />
						<Route path="/dashboard/admin/create-category" element={<div data-testid="create-category-page">Create Category Page Content</div>} />
						<Route path="/dashboard/admin/create-product" element={<div data-testid="create-product-page">Create Product Page Content</div>} />
						<Route path="/dashboard/admin/products" element={<div data-testid="products-page">Products Page Content</div>} />
						<Route path="/dashboard/admin/orders" element={<div data-testid="orders-page">Orders Page Content</div>} />
					</Routes>
				</MemoryRouter>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	test("integrates AuthContext + Layout + AdminMenu and renders full admin dashboard", async () => {
		const mockUser = {
			name: "Admin User",
			email: "admin@example.com",
			phone: "+1234567890",
		};

		localStorage.setItem(
			"auth",
			JSON.stringify({ user: mockUser, token: "valid-admin-token" }),
		);

		renderAdminDashboardIntegration();

		await waitFor(() => {
			expect(screen.getByText(/Admin User/)).toBeInTheDocument();
			expect(screen.getByText(/admin@example.com/)).toBeInTheDocument();
			expect(screen.getByText(/\+1234567890/)).toBeInTheDocument();
		});

		expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /create category/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /create product/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /^products$/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
	});

	test("displays admin name, email, and phone from auth context", async () => {
		const mockUser = {
			name: "Test Admin",
			email: "test.admin@example.com",
			phone: "+9876543210",
		};

		localStorage.setItem(
			"auth",
			JSON.stringify({ user: mockUser, token: "valid-token" }),
		);

		renderAdminDashboardIntegration();

		await waitFor(() => {
			expect(screen.getByText(/Test Admin/)).toBeInTheDocument();
			expect(screen.getByText(/test.admin@example.com/)).toBeInTheDocument();
			expect(screen.getByText(/\+9876543210/)).toBeInTheDocument();
		});
	});

	test("handles missing user data gracefully without crashing", async () => {
		localStorage.setItem("auth", JSON.stringify({ user: null, token: "" }));

		const { container } = renderAdminDashboardIntegration();

		await waitFor(() => {
			expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
		});

		expect(screen.getByRole("link", { name: /create category/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /create product/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /^products$/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();

		const h3Elements = container.querySelectorAll("h3");
		expect(h3Elements.length).toBeGreaterThanOrEqual(3);
		expect(screen.queryByText("Test Admin")).not.toBeInTheDocument();
		expect(screen.queryByText("undefined")).not.toBeInTheDocument();
		expect(screen.queryByText("null")).not.toBeInTheDocument();
	});

	test("navigates to Create Category page when AdminMenu Create Category link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "Admin", email: "admin@example.com", phone: "123" },
				token: "valid-token",
			}),
		);

		renderAdminDashboardIntegration();

		const createCategoryLink = await screen.findByRole("link", { name: /create category/i });
		fireEvent.click(createCategoryLink);

		expect(screen.getByTestId("create-category-page")).toBeInTheDocument();
		expect(screen.getByText("Create Category Page Content")).toBeInTheDocument();
	});

	test("navigates to Create Product page when AdminMenu Create Product link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "Admin", email: "admin@example.com", phone: "123" },
				token: "valid-token",
			}),
		);

		renderAdminDashboardIntegration();

		const createProductLink = await screen.findByRole("link", { name: /create product/i });
		fireEvent.click(createProductLink);

		expect(screen.getByTestId("create-product-page")).toBeInTheDocument();
		expect(screen.getByText("Create Product Page Content")).toBeInTheDocument();
	});

	test("navigates to Products page when AdminMenu Products link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "Admin", email: "admin@example.com", phone: "123" },
				token: "valid-token",
			}),
		);

		renderAdminDashboardIntegration();

		const productsLink = await screen.findByRole("link", { name: /^products$/i });
		fireEvent.click(productsLink);

		expect(screen.getByTestId("products-page")).toBeInTheDocument();
		expect(screen.getByText("Products Page Content")).toBeInTheDocument();
	});

	test("navigates to Orders page when AdminMenu Orders link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "Admin", email: "admin@example.com", phone: "123" },
				token: "valid-token",
			}),
		);

		renderAdminDashboardIntegration();

		const ordersLink = await screen.findByRole("link", { name: /orders/i });
		fireEvent.click(ordersLink);

		expect(screen.getByTestId("orders-page")).toBeInTheDocument();
		expect(screen.getByText("Orders Page Content")).toBeInTheDocument();
	});
});
