// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PrivateRoute from "./Private";
import { AuthProvider } from "../../context/auth";

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
				<MemoryRouter initialEntries={["/dashboard"]}>
					<Routes>
						<Route path="/" element={<PrivateRoute />}>
							<Route path="dashboard" element={<div data-testid="protected-content">Protected Dashboard</div>} />
						</Route>
					</Routes>
				</MemoryRouter>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	describe("The Happy Path (Access Granted)", () => {
		test("verified token triggers auth check and renders protected child via Outlet", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "valid-token" });
			axios.get.mockResolvedValueOnce({ data: { ok: true } });

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
				expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
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
			axios.get.mockResolvedValueOnce({ data: { ok: false } });

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
		});

		test("network crash is caught and safely falls back to Spinner", async () => {
			setAuthStorage({ user: { name: "Test User" }, token: "valid-token" });
			axios.get.mockRejectedValueOnce(new Error("Network Error"));

			renderProtectedTree();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledTimes(1);
			});

			expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
			expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
		});
	});
});
