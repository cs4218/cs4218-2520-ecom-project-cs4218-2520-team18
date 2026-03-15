// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

jest.mock("axios", () => ({
	defaults: {
		headers: {
			common: {},
		},
	},
}));

const AuthReader = () => {
	const [auth] = useAuth();
	return (
		<>
			<div data-testid="user-display">{auth.user?.name || "No User"}</div>
			<div data-testid="token-display">{auth.token || "No Token"}</div>
		</>
	);
};

const AuthMutator = () => {
	const [, setAuth] = useAuth();

	return (
		<>
			<button
				data-testid="login-btn"
				onClick={() =>
					setAuth({
						user: { name: "Mock User" },
						token: "mock-token",
					})
				}
			>
				Login
			</button>
			<button
				data-testid="logout-empty-btn"
				onClick={() =>
					setAuth((prev) => ({
						...prev,
						token: "",
					}))
				}
			>
				LogoutEmpty
			</button>
			<button
				data-testid="logout-null-btn"
				onClick={() =>
					setAuth((prev) => ({
						...prev,
						token: null,
					}))
				}
			>
				LogoutNull
			</button>
		</>
	);
};

const SilentChild = () => <div data-testid="safe-child">Dashboard Loaded</div>;

describe("AuthProvider - Integration Tests", () => {
	let getItemSpy;

	beforeEach(() => {
		jest.clearAllMocks();
		globalThis.localStorage.clear();
		axios.defaults.headers.common = {};
		getItemSpy = jest.spyOn(Storage.prototype, "getItem");
	});

	afterEach(() => {
		getItemSpy.mockRestore();
	});

	describe("The Happy Path (Mount & Sync)", () => {
		test("hydrates from localStorage on mount and syncs axios Authorization header", async () => {
			globalThis.localStorage.setItem(
				"auth",
				JSON.stringify({
					user: { name: "Stored User" },
					token: "stored-token",
				}),
			);

			render(
				<AuthProvider>
					<AuthReader />
				</AuthProvider>,
			);

			expect(getItemSpy).toHaveBeenCalledWith("auth");

			await waitFor(() => {
				expect(screen.getByTestId("user-display")).toHaveTextContent("Stored User");
				expect(screen.getByTestId("token-display")).toHaveTextContent("stored-token");
				expect(axios.defaults.headers.common["Authorization"]).toBe("stored-token");
			});
		});

		test("updates context + axios header in real-time on login action", async () => {
			render(
				<AuthProvider>
					<AuthReader />
					<AuthMutator />
				</AuthProvider>,
			);

			expect(screen.getByTestId("user-display")).toHaveTextContent("No User");
			expect(screen.getByTestId("token-display")).toHaveTextContent("No Token");

			act(() => {
				screen.getByTestId("login-btn").click();
			});

			await waitFor(() => {
				expect(screen.getByTestId("user-display")).toHaveTextContent("Mock User");
				expect(screen.getByTestId("token-display")).toHaveTextContent("mock-token");
				expect(axios.defaults.headers.common["Authorization"]).toBe("mock-token");
			});
		});
	});

	describe("Validation / Negative Paths", () => {
		test("handles empty localStorage without crash and keeps default auth state", async () => {
			render(
				<AuthProvider>
					<AuthReader />
				</AuthProvider>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("user-display")).toHaveTextContent("No User");
				expect(screen.getByTestId("token-display")).toHaveTextContent("No Token");
			});
		});

		test("swallows malformed localStorage JSON, logs error, and does not crash", async () => {
			globalThis.localStorage.setItem("auth", "{ bad_json: ");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			expect(() => {
				render(
					<AuthProvider>
						<AuthReader />
					</AuthProvider>,
				);
			}).not.toThrow();

			await waitFor(() => {
				expect(screen.getByTestId("user-display")).toHaveTextContent("No User");
				expect(screen.getByTestId("token-display")).toHaveTextContent("No Token");
			});

			expect(consoleSpy).toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});

	describe("Sanitization Contract", () => {
		test("overwrites Authorization header when token is set to empty string", async () => {
			render(
				<AuthProvider>
					<AuthMutator />
				</AuthProvider>,
			);

			act(() => {
				screen.getByTestId("login-btn").click();
			});

			await waitFor(() => {
				expect(axios.defaults.headers.common["Authorization"]).toBe("mock-token");
			});

			act(() => {
				screen.getByTestId("logout-empty-btn").click();
			});

			await waitFor(() => {
				expect(axios.defaults.headers.common["Authorization"]).toBe("");
			});
		});

		test("overwrites Authorization header when token becomes null", async () => {
			render(
				<AuthProvider>
					<AuthMutator />
				</AuthProvider>,
			);

			act(() => {
				screen.getByTestId("login-btn").click();
			});

			await waitFor(() => {
				expect(axios.defaults.headers.common["Authorization"]).toBe("mock-token");
			});

			act(() => {
				screen.getByTestId("logout-null-btn").click();
			});

			await waitFor(() => {
				expect(axios.defaults.headers.common["Authorization"]).toBeNull();
			});
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("renders children while not leaking token into DOM by default", async () => {
			globalThis.localStorage.setItem(
				"auth",
				JSON.stringify({
					user: { name: "Silent User" },
					token: "top-secret-token",
				}),
			);

			const { container } = render(
				<AuthProvider>
					<SilentChild />
				</AuthProvider>,
			);

			await waitFor(() => {
				expect(screen.getByTestId("safe-child")).toHaveTextContent("Dashboard Loaded");
			});

			expect(container.textContent).not.toContain("top-secret-token");
			expect(container.textContent).not.toContain("Silent User");
			expect(axios.defaults.headers.common["Authorization"]).toBe("top-secret-token");
		});
	});
});
