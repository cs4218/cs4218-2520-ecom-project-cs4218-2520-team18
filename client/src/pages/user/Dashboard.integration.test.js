// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import Dashboard from "./Dashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

describe("Dashboard - Integration Tests", () => {
	const renderDashboardIntegration = (initialPath = "/dashboard/user") =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={[initialPath]}>
							<Routes>
								<Route path="/dashboard/user" element={<Dashboard />} />
								<Route path="/dashboard/user/profile" element={<div data-testid="profile-page">Profile Page Content</div>} />
								<Route path="/dashboard/user/orders" element={<div data-testid="orders-page">Orders Page Content</div>} />
							</Routes>
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		axios.get.mockReset();
		axios.get.mockResolvedValue({ data: { category: [] } });
	});

	test("integrates AuthContext + Layout + UserMenu and renders full dashboard profile", async () => {
		const mockUser = {
			name: "Norbert Loh",
			email: "norbert@u.nus.edu",
			address: "School of Computing, Singapore",
		};

		localStorage.setItem(
			"auth",
			JSON.stringify({ user: mockUser, token: "valid-session-token" }),
		);

		renderDashboardIntegration();

		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Norbert Loh" })).toBeInTheDocument();
			expect(screen.getByText("norbert@u.nus.edu")).toBeInTheDocument();
			expect(screen.getByText("School of Computing, Singapore")).toBeInTheDocument();
		});

		expect(screen.getByText("🛒 Virtual Vault")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();
	});

	test("handles missing user data gracefully without crashing", async () => {
		localStorage.setItem("auth", JSON.stringify({ user: null, token: "" }));

		const { container } = renderDashboardIntegration();

		await waitFor(() => {
			expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
		});

		expect(screen.getByRole("link", { name: /profile/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /orders/i })).toBeInTheDocument();

		const h3Elements = container.querySelectorAll("h3");
		expect(h3Elements.length).toBeGreaterThanOrEqual(3);
		expect(screen.queryByText("Norbert Loh")).not.toBeInTheDocument();
		expect(screen.queryByText("undefined")).not.toBeInTheDocument();
		expect(screen.queryByText("null")).not.toBeInTheDocument();
	});

	test("navigates to Profile page when UserMenu Profile link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "User", email: "user@example.com", address: "123 Test St" },
				token: "valid-session-token",
			}),
		);

		renderDashboardIntegration();

		const profileLink = await screen.findByRole("link", { name: /profile/i });
		fireEvent.click(profileLink);

		expect(screen.getByTestId("profile-page")).toBeInTheDocument();
		expect(screen.getByText("Profile Page Content")).toBeInTheDocument();
	});

	test("navigates to Orders page when UserMenu Orders link is clicked", async () => {
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "User", email: "user@example.com", address: "123 Test St" },
				token: "valid-session-token",
			}),
		);

		renderDashboardIntegration();

		const ordersLink = await screen.findByRole("link", { name: /orders/i });
		fireEvent.click(ordersLink);

		expect(screen.getByTestId("orders-page")).toBeInTheDocument();
		expect(screen.getByText("Orders Page Content")).toBeInTheDocument();
	});
});
