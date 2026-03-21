// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PrivateRoute from "./Private";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import Dashboard from "../../pages/user/Dashboard";

jest.mock("axios");

describe("PrivateRoute - Integration Tests", () => {
	const setAuthStorage = (authValue) => {
		if (!authValue) {
			localStorage.removeItem("auth");
			return;
		}
		localStorage.setItem("auth", JSON.stringify(authValue));
	};

	const renderProtectedTree = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={["/dashboard"]}>
							<Routes>
								<Route path="/" element={<PrivateRoute />}>
									<Route path="dashboard" element={<div data-testid="protected-content">Protected Dashboard</div>} />
								</Route>
							</Routes>
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	const renderProtectedDashboard = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={["/dashboard"]}>
							<Routes>
								<Route path="/" element={<PrivateRoute />}>
									<Route path="dashboard" element={<Dashboard />} />
								</Route>
							</Routes>
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		axios.get.mockImplementation((url) => {
			if (url === "/api/v1/category/get-category") {
				return Promise.resolve({ data: { category: [] } });
			}
			return Promise.resolve({ data: { ok: true } });
		});
	});

	describe("The Happy Path (Access Granted)", () => {
		test("auth context with valid token grants access to Dashboard component", async () => {
			setAuthStorage({
				user: {
					name: "Dashboard User",
					email: "dashboard.user@example.com",
					address: "123 Dashboard Street",
				},
				token: "valid-token",
			});
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				if (url === "/api/v1/auth/user-auth") {
					return Promise.resolve({ data: { ok: true } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedDashboard();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/user-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "valid-token",
						}),
					}),
				);
			});

			await waitFor(() => {
				expect(screen.getByRole("heading", { name: "Dashboard User" })).toBeInTheDocument();
				expect(screen.getByText("dashboard.user@example.com")).toBeInTheDocument();
				expect(screen.getByText("123 Dashboard Street")).toBeInTheDocument();
				expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
				expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
			});
		});

		test("verified token triggers auth check and renders protected child via Outlet", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "valid-token" });
			axios.get.mockResolvedValueOnce({ data: { ok: true } });

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/user-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "valid-token",
						}),
					}),
				);
			});

			await waitFor(() => {
				expect(screen.getByTestId("protected-content")).toBeInTheDocument();
			});
			expect(screen.queryByText(/redirecting to you in/i)).not.toBeInTheDocument();
		});

		test("keeps Spinner while auth request is pending, then opens gate on ok=true", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "valid-token" });
			let resolveRequest;
			const pendingRequest = new Promise((resolve) => {
				resolveRequest = resolve;
			});
			axios.get.mockReturnValueOnce(pendingRequest);

			renderProtectedTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();

			resolveRequest({ data: { ok: true } });

			await waitFor(() => {
				expect(screen.getByTestId("protected-content")).toBeInTheDocument();
			});
		});
	});

	describe("Validation / Negative Paths (Access Denied)", () => {
		test("missing auth context token denies Dashboard and keeps Spinner fallback", async () => {
			setAuthStorage({
				user: {
					name: "Denied User",
					email: "denied.user@example.com",
					address: "No Access Street",
				},
			});

			renderProtectedDashboard();

			expect(axios.get).not.toHaveBeenCalled();
			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByText("Denied User")).not.toBeInTheDocument();
			expect(screen.queryByText("denied.user@example.com")).not.toBeInTheDocument();
		});

		test("no token renders Spinner immediately and bypasses network call", async () => {
			setAuthStorage(null);

			renderProtectedTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
			await waitFor(() => {
				expect(axios.get).not.toHaveBeenCalled();
			});
		});

		test("undefined token also short-circuits and skips backend call", async () => {
			setAuthStorage({ user: { name: "No Token User" } });

			renderProtectedTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
			expect(axios.get).not.toHaveBeenCalled();
		});

		test("backend rejection (ok=false) keeps gate closed on Spinner", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "forged-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/user-auth") {
					return Promise.resolve({ data: { ok: false } });
				}
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
		});

		test("network crash is caught and safely falls back to Spinner", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "valid-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/user-auth") {
					return Promise.reject(new Error("Network Error"));
				}
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
		});
	});
});
