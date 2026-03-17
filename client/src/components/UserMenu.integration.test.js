// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import UserMenu from "./UserMenu";

describe("UserMenu - Integration Tests", () => {
	const renderUserMenuIntegration = (initialPath = "/dashboard/user") =>
		render(
			<MemoryRouter initialEntries={[initialPath]}>
				<UserMenu />
				<Routes>
					<Route
						path="/dashboard/user/profile"
						element={<div data-testid="profile-page">Profile Page Content</div>}
					/>
					<Route
						path="/dashboard/user/orders"
						element={<div data-testid="orders-page">Orders Page Content</div>}
					/>
				</Routes>
			</MemoryRouter>,
		);

	test("navigates to Profile page when the Profile link is clicked", () => {
		renderUserMenuIntegration();

		const profileLink = screen.getByRole("link", { name: /profile/i });
		fireEvent.click(profileLink);

		expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		expect(screen.getByText("Profile Page Content")).toBeInTheDocument();
	});

	test("navigates to Orders page when the Orders link is clicked", () => {
		renderUserMenuIntegration();

		const ordersLink = screen.getByRole("link", { name: /orders/i });
		fireEvent.click(ordersLink);

		expect(screen.getByTestId("orders-page")).toBeInTheDocument();
		expect(screen.getByText("Orders Page Content")).toBeInTheDocument();
	});

	test("applies active class to Profile NavLink when route matches profile", () => {
		renderUserMenuIntegration("/dashboard/user/profile");

		const profileLink = screen.getByRole("link", { name: /profile/i });
		expect(profileLink).toHaveClass("active");

		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(ordersLink).not.toHaveClass("active");
	});

	test("applies active class to Orders NavLink when route matches orders", () => {
		renderUserMenuIntegration("/dashboard/user/orders");

		const ordersLink = screen.getByRole("link", { name: /orders/i });
		expect(ordersLink).toHaveClass("active");

		const profileLink = screen.getByRole("link", { name: /profile/i });
		expect(profileLink).not.toHaveClass("active");
	});

	test("does not mark any link active on non-matching dashboard child route", () => {
		renderUserMenuIntegration("/dashboard/user/settings");

		const profileLink = screen.getByRole("link", { name: /profile/i });
		const ordersLink = screen.getByRole("link", { name: /orders/i });

		expect(profileLink).not.toHaveClass("active");
		expect(ordersLink).not.toHaveClass("active");
	});
});
