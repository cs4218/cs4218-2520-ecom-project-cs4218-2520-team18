// Billy Ho Cheng En, A0252588R

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import AdminMenu from "./AdminMenu";

describe("AdminMenu - Integration Tests", () => {
	const renderAdminMenuIntegration = (initialPath = "/dashboard/admin") =>
		render(
			<MemoryRouter initialEntries={[initialPath]}>
				<AdminMenu />
				<Routes>
					<Route
						path="/dashboard/admin/create-category"
						element={<div data-testid="create-category-page">Create Category Page Content</div>}
					/>
					<Route
						path="/dashboard/admin/create-product"
						element={<div data-testid="create-product-page">Create Product Page Content</div>}
					/>
					<Route
						path="/dashboard/admin/products"
						element={<div data-testid="products-page">Products Page Content</div>}
					/>
					<Route
						path="/dashboard/admin/orders"
						element={<div data-testid="orders-page">Orders Page Content</div>}
					/>
					<Route
						path="/dashboard/admin/users"
						element={<div data-testid="users-page">Users Page Content</div>}
					/>
				</Routes>
			</MemoryRouter>,
		);

	test("navigates to Create Category page when the Create Category link is clicked", () => {
		renderAdminMenuIntegration();

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		fireEvent.click(createCategoryLink);

		expect(screen.getByTestId("create-category-page")).toBeInTheDocument();
		expect(screen.getByText("Create Category Page Content")).toBeInTheDocument();
	});

	test("navigates to Create Product page when the Create Product link is clicked", () => {
		renderAdminMenuIntegration();

		const createProductLink = screen.getByRole("link", { name: /create product/i });
		fireEvent.click(createProductLink);

		expect(screen.getByTestId("create-product-page")).toBeInTheDocument();
		expect(screen.getByText("Create Product Page Content")).toBeInTheDocument();
	});

	test("navigates to Products page when the Products link is clicked", () => {
		renderAdminMenuIntegration();

		const productsLink = screen.getByRole("link", { name: /^products$/i });
		fireEvent.click(productsLink);

		expect(screen.getByTestId("products-page")).toBeInTheDocument();
		expect(screen.getByText("Products Page Content")).toBeInTheDocument();
	});

	test("navigates to Orders page when the Orders link is clicked", () => {
		renderAdminMenuIntegration();

		const ordersLink = screen.getByRole("link", { name: /orders/i });
		fireEvent.click(ordersLink);

		expect(screen.getByTestId("orders-page")).toBeInTheDocument();
		expect(screen.getByText("Orders Page Content")).toBeInTheDocument();
	});

	test("applies active class to Create Category NavLink when route matches create-category", () => {
		renderAdminMenuIntegration("/dashboard/admin/create-category");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		expect(createCategoryLink).toHaveClass("active");

		const createProductLink = screen.getByRole("link", { name: /create product/i });
		const productsLink = screen.getByRole("link", { name: /^products$/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(createProductLink).not.toHaveClass("active");
		expect(productsLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});

	test("applies active class to Create Product NavLink when route matches create-product", () => {
		renderAdminMenuIntegration("/dashboard/admin/create-product");

		const createProductLink = screen.getByRole("link", { name: /create product/i });
		expect(createProductLink).toHaveClass("active");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		const productsLink = screen.getByRole("link", { name: /^products$/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(createCategoryLink).not.toHaveClass("active");
		expect(productsLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});

	test("applies active class to Products NavLink when route matches products", () => {
		renderAdminMenuIntegration("/dashboard/admin/products");

		const productsLink = screen.getByRole("link", { name: /^products$/i });
		expect(productsLink).toHaveClass("active");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		const createProductLink = screen.getByRole("link", { name: /create product/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(createCategoryLink).not.toHaveClass("active");
		expect(createProductLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});

	test("applies active class to Orders NavLink when route matches orders", () => {
		renderAdminMenuIntegration("/dashboard/admin/orders");

		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(ordersLink).toHaveClass("active");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		const createProductLink = screen.getByRole("link", { name: /create product/i });
		const productsLink = screen.getByRole("link", { name: /^products$/i });
		expect(createCategoryLink).not.toHaveClass("active");
		expect(createProductLink).not.toHaveClass("active");
		expect(productsLink).not.toHaveClass("active");
	});

	test("does not mark any link active on non-matching dashboard child route", () => {
		renderAdminMenuIntegration("/dashboard/admin/settings");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		const createProductLink = screen.getByRole("link", { name: /create product/i });
		const productsLink = screen.getByRole("link", { name: /^products$/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });

		expect(createCategoryLink).not.toHaveClass("active");
		expect(createProductLink).not.toHaveClass("active");
		expect(productsLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});

	test("navigates to Users page when the Users link is clicked", () => {
		renderAdminMenuIntegration();

		const usersLink = screen.getByRole("link", { name: /users/i });
		fireEvent.click(usersLink);

		expect(screen.getByTestId("users-page")).toBeInTheDocument();
		expect(screen.getByText("Users Page Content")).toBeInTheDocument();
	});

	test("applies active class to Users NavLink when route matches users", () => {
		renderAdminMenuIntegration("/dashboard/admin/users");

		const usersLink = screen.getByRole("link", { name: /users/i });
		expect(usersLink).toHaveClass("active");

		const createCategoryLink = screen.getByRole("link", { name: /create category/i });
		const createProductLink = screen.getByRole("link", { name: /create product/i });
		const productsLink = screen.getByRole("link", { name: /^products$/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(createCategoryLink).not.toHaveClass("active");
		expect(createProductLink).not.toHaveClass("active");
		expect(productsLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});
});
