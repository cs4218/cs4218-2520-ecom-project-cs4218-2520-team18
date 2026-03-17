// Loh Ze Qing Norbert, A0277473R

import React from "react";
import {
	render,
	screen,
	fireEvent,
	waitFor,
	createEvent,
} from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Login from "./Login";
import { AuthProvider, useAuth } from "../../context/auth";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
	success: jest.fn(),
	error: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({ children }) => (
	<div data-testid="layout-mock">{children}</div>
));

describe("Login - Integration Tests", () => {
	let getItemSpy;
	let setItemSpy;

	const AuthStateProbe = () => {
		const [auth] = useAuth();
		return (
			<>
				<div data-testid="auth-user">{auth?.user?.name || "NO_USER"}</div>
				<div data-testid="auth-token">{auth?.token ? "TOKEN_PRESENT" : "NO_TOKEN"}</div>
			</>
		);
	};

	const LocationProbe = () => {
		const location = useLocation();
		return <div data-testid="location-path">{location.pathname}</div>;
	};

	const typeCredentials = (email = "test@test.com", password = "password123") => {
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: email },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: password },
		});
	};

	const renderLogin = (initialEntries = ["/login"]) =>
		render(
			<AuthProvider>
				<MemoryRouter initialEntries={initialEntries}>
					<AuthStateProbe />
					<LocationProbe />
					<Routes>
						<Route path="/login" element={<Login />} />
						<Route path="/" element={<div>HOME_PAGE</div>} />
						<Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
					</Routes>
				</MemoryRouter>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
		localStorage.clear();
		getItemSpy = jest.spyOn(Storage.prototype, "getItem");
		setItemSpy = jest.spyOn(Storage.prototype, "setItem");
	});

	describe("The Happy Path (End-to-End Login)", () => {
		test("Login - AuthContext handshake updates context state and axios auth header", async () => {
			const token = "contextHandshakeToken";
			const mockUser = { _id: "u-auth", name: "Auth Handshake User", email: "auth@test.com" };
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Login successful",
					user: mockUser,
					token,
				},
			});

			renderLogin();
			expect(screen.getByTestId("auth-user")).toHaveTextContent("NO_USER");
			expect(screen.getByTestId("auth-token")).toHaveTextContent("NO_TOKEN");

			typeCredentials("auth@test.com", "password123");
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => {
				expect(screen.getByTestId("auth-user")).toHaveTextContent("Auth Handshake User");
				expect(screen.getByTestId("auth-token")).toHaveTextContent("TOKEN_PRESENT");
			});

			expect(axios.defaults.headers.common.Authorization).toBe(token);
			expect(setItemSpy).toHaveBeenCalledWith(
				"auth",
				JSON.stringify({
					success: true,
					message: "Login successful",
					user: mockUser,
					token,
				}),
			);
		});

		test("submits credentials, updates auth state, persists session, toasts success, and navigates home", async () => {
			const mockUser = { _id: "u1", name: "Mock User", email: "test@test.com" };
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Login successful",
					user: mockUser,
					token: "mockToken",
				},
			});

			renderLogin();
			typeCredentials();
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => {
				expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
					email: "test@test.com",
					password: "password123",
				});
			});

			expect(getItemSpy).toHaveBeenCalledWith("auth");
			await waitFor(() => {
				expect(screen.getByTestId("auth-user")).toHaveTextContent("Mock User");
				expect(screen.getByTestId("auth-token")).toHaveTextContent("TOKEN_PRESENT");
			});
			expect(setItemSpy).toHaveBeenCalledWith(
				"auth",
				JSON.stringify({
					success: true,
					message: "Login successful",
					user: mockUser,
					token: "mockToken",
				}),
			);
			expect(toast.success).toHaveBeenCalledWith(
				"Login successful",
				expect.objectContaining({
					duration: expect.any(Number),
				}),
			);
			await waitFor(() => {
				expect(screen.getByTestId("location-path")).toHaveTextContent("/");
				expect(screen.getByText("HOME_PAGE")).toBeInTheDocument();
			});
			expect(screen.queryByText("mockToken")).not.toBeInTheDocument();
		});

		test("redirects to location.state when present instead of default home", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Login successful",
					user: { _id: "u2", name: "Another User" },
					token: "redirectToken",
				},
			});

			renderLogin([{ pathname: "/login", state: "/dashboard" }]);
			typeCredentials("redirect@test.com", "password123");
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => {
				expect(screen.getByTestId("location-path")).toHaveTextContent("/dashboard");
				expect(screen.getByText("DASHBOARD_PAGE")).toBeInTheDocument();
			});
		});
	});

	describe("Validation / Negative Paths", () => {
		test("shows toast.error and avoids state/storage/nav when API returns success=false", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: false,
					message: "Invalid credentials",
				},
			});

			renderLogin();
			typeCredentials();
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid credentials"));
			expect(setItemSpy).not.toHaveBeenCalled();
			expect(screen.getByTestId("auth-user")).toHaveTextContent("NO_USER");
			expect(screen.getByTestId("auth-token")).toHaveTextContent("NO_TOKEN");
			expect(screen.getByTestId("location-path")).toHaveTextContent("/login");
		});

		test("shows backend error message for axios rejected response error", async () => {
			const apiError = {
				response: {
					data: {
						message: "Invalid Email or Password",
					},
				},
			};
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(apiError);

			renderLogin();
			typeCredentials();
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid Email or Password"));
			expect(consoleSpy).toHaveBeenCalledWith(apiError);
			consoleSpy.mockRestore();
		});

		test("uses strict fallback 'Something went wrong' when error has no response or message", async () => {
			const unknownError = {};
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(unknownError);

			renderLogin();
			typeCredentials();
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"));
			expect(consoleSpy).toHaveBeenCalledWith(unknownError);
			consoleSpy.mockRestore();
		});
	});

	describe("Sanitization Contract", () => {
		test("form submit triggers preventDefault to avoid page reload", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Login successful",
					user: { _id: "u3", name: "Prevent Default User" },
					token: "preventToken",
				},
			});

			const { container } = renderLogin();
			typeCredentials();
			const form = container.querySelector("form");
			const submitEvent = createEvent.submit(form);
			submitEvent.preventDefault = jest.fn();

			fireEvent(form, submitEvent);

			expect(submitEvent.preventDefault).toHaveBeenCalledTimes(1);
			await waitFor(() => expect(axios.post).toHaveBeenCalled());
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("logs error object without leaking plaintext local password in console payload", async () => {
			const localPassword = "SuperSecretPass!";
			const networkError = new Error("Network down");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(networkError);

			renderLogin();
			typeCredentials("security@test.com", localPassword);
			fireEvent.click(screen.getByRole("button", { name: /login/i }));

			await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
			const serializedCalls = JSON.stringify(consoleSpy.mock.calls);
			expect(serializedCalls).not.toContain(localPassword);
			consoleSpy.mockRestore();
		});

		test("renders children/form while handling token flow silently", () => {
			renderLogin();

			expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
			expect(screen.queryByText(/mockToken|redirectToken|preventToken/i)).not.toBeInTheDocument();
		});
	});
});
