// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Register from "./Register";
import * as validationHelpers from "../../helpers/validation";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
	success: jest.fn(),
	error: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

jest.mock("../../components/Layout", () => ({ children }) => (
	<div data-testid="layout-mock">{children}</div>
));

describe("Register - Integration Tests", () => {
	const typeAllFields = (
		{
			name = "John Doe",
			email = "test@example.com",
			password = "password123",
			phone = "+14155552671",
			address = "123 Test Street",
			dob = "2000-01-01",
			answer = "football",
		} = {},
	) => {
		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: name },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
			target: { value: email },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
			target: { value: password },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: phone },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: address },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
			target: { value: dob },
		});
		fireEvent.change(screen.getByPlaceholderText("What is Your Favorite sports"), {
			target: { value: answer },
		});
	};

	const renderRegister = () =>
		render(
			<MemoryRouter initialEntries={["/register"]}>
				<Routes>
					<Route path="/register" element={<Register />} />
				</Routes>
			</MemoryRouter>,
		);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
		mockNavigate.mockReset();
	});

	describe("The Happy Path (End-to-End Registration)", () => {
		test("submits valid payload, shows success toast, and navigates to /login", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
					message: "ok",
				},
			});

			renderRegister();
			typeAllFields();
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
					name: "John Doe",
					email: "test@example.com",
					password: "password123",
					phone: "+14155552671",
					address: "123 Test Street",
					DOB: "2000-01-01",
					answer: "football",
				});
			});

			expect(toast.success).toHaveBeenCalledWith("Register Successfully, please login");
			expect(mockNavigate).toHaveBeenCalledWith("/login");
		});
	});

	describe("Validation / Negative Paths (Guardrails)", () => {
		test("empty name shows toast.error and blocks axios.post", async () => {
			renderRegister();
			typeAllFields({ name: "" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Name should be 1 to 100 characters");
			});
			expect(axios.post).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		test("invalid email shows toast.error and blocks axios.post", async () => {
			const emailSpy = jest.spyOn(validationHelpers, "isValidEmail");

			renderRegister();
			typeAllFields({ email: "not-an-email" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(emailSpy).toHaveBeenCalledWith("not-an-email");
				expect(toast.error).toHaveBeenCalledWith("Invalid Email");
			});
			expect(axios.post).not.toHaveBeenCalled();
			expect(mockNavigate).not.toHaveBeenCalled();
		});

		test("short password shows toast.error and blocks axios.post", async () => {
			const passwordSpy = jest.spyOn(validationHelpers, "isPasswordLongEnough");

			renderRegister();
			typeAllFields({ password: "123" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(passwordSpy).toHaveBeenCalledWith("123", 6);
				expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters long");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("invalid phone shows toast.error and blocks axios.post", async () => {
			const phoneSpy = jest.spyOn(validationHelpers, "isValidPhone").mockReturnValue(false);

			renderRegister();
			typeAllFields({ phone: "+14155552671" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(phoneSpy).toHaveBeenCalledWith("+14155552671");
				expect(toast.error).toHaveBeenCalledWith("Phone number must be in E.164 format");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("invalid calendar DOB shows toast.error and blocks axios.post", async () => {
			jest.spyOn(validationHelpers, "isValidDOBFormat").mockReturnValue(true);
			const dobStrictSpy = jest.spyOn(validationHelpers, "isValidDOBStrict").mockReturnValue(false);

			renderRegister();
			typeAllFields({ dob: "2000-01-01" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(dobStrictSpy).toHaveBeenCalledWith("2000-01-01");
				expect(toast.error).toHaveBeenCalledWith("Date of Birth must be a valid date");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("missing answer shows toast.error and blocks axios.post", async () => {
			renderRegister();
			typeAllFields({ answer: "" });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Answer is required");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("future DOB shows toast.error and blocks axios.post", async () => {
			const futureDob = "2099-12-31";
			const futureSpy = jest.spyOn(validationHelpers, "isDOBNotFuture");

			renderRegister();
			typeAllFields({ dob: futureDob });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(futureSpy).toHaveBeenCalledWith(futureDob);
				expect(toast.error).toHaveBeenCalledWith("Date of Birth cannot be a future date");
			});
			expect(axios.post).not.toHaveBeenCalled();
		});

		test("backend success=false shows backend message and does not navigate", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: false,
					message: "Email already exists",
				},
			});

			renderRegister();
			typeAllFields();
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => expect(axios.post).toHaveBeenCalled());
			expect(toast.error).toHaveBeenCalledWith("Email already exists");
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	describe("Sanitization Contract", () => {
		test("trims/lowercases payload before axios.post", async () => {
			axios.post.mockResolvedValueOnce({
				data: {
					success: true,
				},
			});

			renderRegister();
			typeAllFields({
				name: "  JOHN DOE  ",
				email: "  TEST@EXAMPLE.COM  ",
				answer: "  BASKETBALL  ",
			});
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(axios.post).toHaveBeenCalledWith(
					"/api/v1/auth/register",
					expect.objectContaining({
						name: "JOHN DOE",
						email: "test@example.com",
						answer: "basketball",
					}),
				);
			});
		});

		test("submit button is disabled while request is in-flight and re-enabled afterward", async () => {
			let resolveRequest;
			const pendingRequest = new Promise((resolve) => {
				resolveRequest = resolve;
			});
			axios.post.mockReturnValueOnce(pendingRequest);

			renderRegister();
			typeAllFields();

			const submitButton = screen.getByRole("button", { name: /register/i });
			expect(submitButton).not.toBeDisabled();

			fireEvent.click(submitButton);

			await waitFor(() => expect(submitButton).toBeDisabled());

			resolveRequest({
				data: {
					success: true,
				},
			});

			await waitFor(() => expect(submitButton).not.toBeDisabled());
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("logs error without leaking plaintext password into console output", async () => {
			const plainPassword = "VerySecretPassword!";
			const apiError = new Error("Network Error");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(apiError);

			renderRegister();
			typeAllFields({ password: plainPassword });
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(apiError));
			const consolePayload = JSON.stringify(consoleSpy.mock.calls);
			expect(consolePayload).not.toContain(plainPassword);
			consoleSpy.mockRestore();
		});

		test("uses backend error message when axios rejects with response.data.message", async () => {
			const apiError = {
				response: {
					data: {
						message: "Email already exists",
					},
				},
			};
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(apiError);

			renderRegister();
			typeAllFields();
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(apiError);
				expect(toast.error).toHaveBeenCalledWith("Email already exists");
			});
			expect(mockNavigate).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});

		test("uses strict fallback message when axios rejects without response/message", async () => {
			const unknownError = {};
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.post.mockRejectedValueOnce(unknownError);

			renderRegister();
			typeAllFields();
			fireEvent.click(screen.getByRole("button", { name: /register/i }));

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(unknownError);
				expect(toast.error).toHaveBeenCalledWith("Something went wrong");
			});
			expect(mockNavigate).not.toHaveBeenCalled();
			consoleSpy.mockRestore();
		});
	});
});
