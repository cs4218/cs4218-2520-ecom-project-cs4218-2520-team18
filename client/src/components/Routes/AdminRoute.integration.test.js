// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminRoute from "./AdminRoute";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import AdminDashboard from "../../pages/admin/AdminDashboard";

jest.mock("axios", () => ({
	get: jest.fn(),
	defaults: {
		headers: {
			common: {},
		},
	},
}));

describe("AdminRoute - Integration Tests", () => {
	const setAuthStorage = (authValue) => {
		if (!authValue) {
			localStorage.removeItem("auth");
			return;
		}
		localStorage.setItem("auth", JSON.stringify(authValue));
	};

	const renderProtectedAdminTree = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={["/admin-dashboard"]}>
							<Routes>
								<Route path="/" element={<AdminRoute />}>
									<Route path="admin-dashboard" element={<div data-testid="admin-protected-content">Admin Dashboard</div>} />
								</Route>
							</Routes>
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	const renderProtectedAdminDashboard = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={["/admin-dashboard"]}>
							<Routes>
								<Route path="/" element={<AdminRoute />}>
									<Route path="admin-dashboard" element={<AdminDashboard />} />
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

	describe("The Happy Path (Admin Access Granted)", () => {
		test("admin auth context with valid token grants access to AdminDashboard component", async () => {
			setAuthStorage({
				user: {
					name: "Admin User",
					email: "admin.user@example.com",
					phone: "+14155552671",
					role: 1,
				},
				token: "valid-admin-token",
			});
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				if (url === "/api/v1/auth/admin-auth") {
					return Promise.resolve({ data: { ok: true } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminDashboard();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "valid-admin-token",
						}),
					}),
				);
			});

			await waitFor(() => {
				expect(screen.getByText("Admin Name : Admin User")).toBeInTheDocument();
				expect(screen.getByText("Admin Email : admin.user@example.com")).toBeInTheDocument();
				expect(screen.getByText("Admin Contact : +14155552671")).toBeInTheDocument();
			});
		});

		test("verified admin token triggers auth check and renders protected child via Outlet", async () => {
			setAuthStorage({ user: { name: "Admin Test", role: 1 }, token: "valid-admin-token" });
			axios.get.mockResolvedValueOnce({ data: { ok: true } });

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "valid-admin-token",
						}),
					}),
				);
			});

			await waitFor(() => {
				expect(screen.getByTestId("admin-protected-content")).toBeInTheDocument();
			});
			expect(screen.queryByText(/redirecting to you in/i)).not.toBeInTheDocument();
		});

		test("keeps Spinner while admin auth request is pending, then opens gate on ok=true", async () => {
			setAuthStorage({ user: { name: "Admin Test", role: 1 }, token: "valid-admin-token" });
			let resolveRequest;
			const pendingRequest = new Promise((resolve) => {
				resolveRequest = resolve;
			});
			axios.get.mockReturnValueOnce(pendingRequest);

			renderProtectedAdminTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();

			resolveRequest({ data: { ok: true } });

			await waitFor(() => {
				expect(screen.getByTestId("admin-protected-content")).toBeInTheDocument();
			});
		});

		test("admin token in Authorization header format matches the token from auth context", async () => {
			const adminToken = "admin-bearer-token-12345";
			setAuthStorage({
				user: { name: "Token Admin", email: "token.admin@example.com", role: 1 },
				token: adminToken,
			});
			axios.get.mockResolvedValueOnce({ data: { ok: true } });

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: adminToken,
						}),
					}),
				);
			});

			await waitFor(() => {
				expect(screen.getByTestId("admin-protected-content")).toBeInTheDocument();
			});
		});
	});

	describe("Validation / Negative Paths (Admin Access Denied)", () => {
		test("missing auth context token denies AdminDashboard and keeps Spinner fallback", async () => {
			setAuthStorage({
				user: {
					name: "No Token Admin",
					email: "notoken.admin@example.com",
					phone: "+14155552672",
					role: 1,
				},
			});

			renderProtectedAdminDashboard();

			expect(axios.get).not.toHaveBeenCalled();
			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByText("Admin Name : No Token Admin")).not.toBeInTheDocument();
			expect(screen.queryByText("Admin Email : notoken.admin@example.com")).not.toBeInTheDocument();
		});

		test("no token renders Spinner immediately and bypasses admin-auth network call", async () => {
			setAuthStorage(null);

			renderProtectedAdminTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
			await waitFor(() => {
				expect(axios.get).not.toHaveBeenCalled();
			});
		});

		test("undefined token also short-circuits and skips backend admin-auth call", async () => {
			setAuthStorage({ user: { name: "Undefined Token Admin", role: 1 } });

			renderProtectedAdminTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
			expect(axios.get).not.toHaveBeenCalled();
		});

		test("backend rejection (ok=false) keeps admin gate closed on Spinner", async () => {
			setAuthStorage({ user: { name: "Rejected Admin", role: 0 }, token: "non-admin-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/admin-auth") {
					return Promise.resolve({ data: { ok: false } });
				}
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "non-admin-token",
						}),
					}),
				);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
		});

		test("regular user token (role=0) with valid token gets rejected by admin-auth", async () => {
			setAuthStorage({
				user: { name: "Regular User", email: "user@example.com", role: 0 },
				token: "regular-user-token",
			});
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/admin-auth") {
					return Promise.resolve({ data: { ok: false } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "regular-user-token",
						}),
					}),
				);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
		});

		test("network crash is caught and safely falls back to Spinner without admin content", async () => {
			setAuthStorage({ user: { name: "Network Error Admin", role: 1 }, token: "valid-admin-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/admin-auth") {
					return Promise.reject(new Error("Network Error"));
				}
				if (url === "/api/v1/category/get-category") {
					return Promise.resolve({ data: { category: [] } });
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
		});

		test("401 unauthorized response keeps admin gate closed", async () => {
			setAuthStorage({ user: { name: "Unauthorized Admin", role: 1 }, token: "invalid-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/admin-auth") {
					const error = new Error("Unauthorized");
					error.response = { status: 401, data: { message: "Unauthorized Access" } };
					return Promise.reject(error);
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith(
					"/api/v1/auth/admin-auth",
					expect.objectContaining({
						headers: expect.objectContaining({
							Authorization: "invalid-token",
						}),
					}),
				);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
		});

		test("403 forbidden response (non-admin user) blocks access and shows Spinner", async () => {
			setAuthStorage({ user: { name: "Forbidden User", role: 0 }, token: "user-token" });
			axios.get.mockImplementation((url) => {
				if (url === "/api/v1/auth/admin-auth") {
					const error = new Error("Forbidden");
					error.response = { status: 403, data: { message: "Forbidden Access" } };
					return Promise.reject(error);
				}
				return Promise.resolve({ data: {} });
			});

			renderProtectedAdminTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
		});
	});

	describe("Security / Authorization Contract", () => {
		test("component does not leak admin content before auth verification completes", async () => {
			setAuthStorage({ user: { name: "Pending Admin", role: 1 }, token: "pending-token" });
			let resolveAuth;
			const authPromise = new Promise((resolve) => {
				resolveAuth = resolve;
			});
			axios.get.mockReturnValueOnce(authPromise);

			const { container } = renderProtectedAdminTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(container.textContent).not.toContain("Admin Dashboard");
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();

			resolveAuth({ data: { ok: true } });

			await waitFor(() => {
				expect(screen.getByTestId("admin-protected-content")).toBeInTheDocument();
			});
		});

		test("empty token string is treated as missing token and skips auth call", async () => {
			setAuthStorage({ user: { name: "Empty Token Admin", role: 1 }, token: "" });

			renderProtectedAdminTree();

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("admin-protected-content")).not.toBeInTheDocument();
			expect(axios.get).not.toHaveBeenCalled();
		});
	});
});
