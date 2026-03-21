// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import ForgotPassword from "./ForgotPassword";
import * as validationHelpers from "../../helpers/validation";

jest.mock("axios");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

describe("ForgotPassword - Integration Tests", () => {
	let toastSuccessSpy;
	let toastErrorSpy;

	const typeFields = (
		{
			email = "test@test.com",
			answer = "blue",
			newPassword = "newpassword123",
		} = {},
	) => {
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Email/i), {
			target: { value: email },
		});
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Security Answer/i), {
			target: { value: answer },
		});
		fireEvent.change(screen.getByPlaceholderText(/Enter Your New Password/i), {
			target: { value: newPassword },
		});
	};

	const renderForgotPassword = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter initialEntries={["/forgot-password"]}>
							<Routes>
								<Route path="/forgot-password" element={<ForgotPassword />} />
							</Routes>
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
		mockNavigate.mockReset();
		toastSuccessSpy = jest.spyOn(toast, "success").mockImplementation(() => {});
		toastErrorSpy = jest.spyOn(toast, "error").mockImplementation(() => {});
		axios.get.mockResolvedValue({ data: { category: [] } });
	});

	describe("The Happy Path (End-to-End Reset)", () => {
		test("submits valid payload, shows success toast, and navigates to /login", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Password Reset Successfully",
				},
			});

			renderForgotPassword();
			typeFields();
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
					email: "test@test.com",
					answer: "blue",
					newPassword: "newpassword123",
				});
			});

			expect(toastSuccessSpy).toHaveBeenCalledWith("Password Reset Successfully");
			expect(mockNavigate).toHaveBeenCalledWith("/login");
		});
	});

	describe("Validation / Negative Paths (Guardrails)", () => {
		test("empty fields trigger required toast and block axios.post", async () => {
			renderForgotPassword();
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Email is required");
			});
			expect(axios.post).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		test("invalid email format triggers toast and blocks network call", async () => {
			const emailSpy = jest.spyOn(validationHelpers, "isValidEmail");

			renderForgotPassword();
			typeFields({ email: "not-an-email" });
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(emailSpy).toHaveBeenCalledWith("not-an-email");
				expect(toastErrorSpy).toHaveBeenCalledWith("Invalid email format");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("missing security answer triggers toast and blocks network call", async () => {
			renderForgotPassword();
			typeFields({ answer: "" });
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Security answer is required");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("missing new password triggers toast and blocks network call", async () => {
			renderForgotPassword();
			typeFields({ newPassword: "" });
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("New password is required");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("short password triggers toast and blocks network call", async () => {
			const passwordSpy = jest.spyOn(validationHelpers, "isPasswordLongEnough");

			renderForgotPassword();
			typeFields({ newPassword: "123" });
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(passwordSpy).toHaveBeenCalledWith("123");
				expect(toastErrorSpy).toHaveBeenCalledWith("New password must be at least 6 characters long");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("server success=false shows backend message and does not navigate", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: false,
					message: "Wrong Email or Answer",
				},
			});

			renderForgotPassword();
			typeFields();
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => expect(axios.post).toHaveBeenCalled());
			expect(toastErrorSpy).toHaveBeenCalledWith("Wrong Email or Answer");
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe("Sanitization Contract", () => {
		test("trims and lowercases email/answer before axios.post", async () => {
			const emailSpy = jest.spyOn(validationHelpers, "isValidEmail");
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "Password Reset Successfully",
				},
			});

			renderForgotPassword();
			typeFields({
				email: " TEST@EXAMPLE.com ",
				answer: " Blue ",
				newPassword: "newpassword123",
			});
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(emailSpy).toHaveBeenCalledWith("test@example.com");
				expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
					email: "test@example.com",
					answer: "blue",
					newPassword: "newpassword123",
				});
			});
		});

		test("reset button is disabled while request is in-flight and re-enabled afterward", async () => {
			let resolveRequest;
			const pendingRequest = new Promise((resolve) => {
				resolveRequest = resolve;
			});
			axios.post.mockReturnValueOnce(pendingRequest);

			renderForgotPassword();
			typeFields();

			const button = screen.getByRole("button", { name: /reset password/i });
			expect(button).not.toBeDisabled();

			fireEvent.click(button);

			await waitFor(() => expect(button).toBeDisabled());

			resolveRequest({
				data: {
					success: true,
					message: "Password Reset Successfully",
				},
			});

			await waitFor(() => expect(button).not.toBeDisabled());
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("logs network error without leaking plaintext password in console output", async () => {
			const plainPassword = "VerySecretPassword!";
			const apiError = new Error("Network Error");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(apiError);

			renderForgotPassword();
			typeFields({ newPassword: plainPassword });
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(apiError));
			const consolePayload = JSON.stringify(consoleSpy.mock.calls);
			expect(consolePayload).not.toContain(plainPassword);
			expect(toastErrorSpy).toHaveBeenCalledWith("Network Error");
			consoleSpy.mockRestore();
		});

		test("uses strict fallback error message when error has no response and no message", async () => {
			const unknownError = {};
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(unknownError);

			renderForgotPassword();
			typeFields();
			fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(unknownError);
				expect(toastErrorSpy).toHaveBeenCalledWith("An unexpected error occurred");
			});
			consoleSpy.mockRestore();
		});
	});
});
