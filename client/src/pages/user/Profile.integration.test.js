// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";
import * as validationHelpers from "../../helpers/validation";

jest.mock("axios");

describe("Profile Component - Integration Tests", () => {
	let setItemSpy;
	let toastSuccessSpy;
	let toastErrorSpy;

	const mockInitialUser = {
		name: "Norbert Loh",
		email: "norbert@u.nus.edu",
		phone: "+6591234567",
		address: "School of Computing, NUS",
		DOB: "2000-01-01",
	};

	const renderProfile = () =>
		render(
			<AuthProvider>
				<CartProvider>
					<SearchProvider>
						<MemoryRouter>
							<Profile />
						</MemoryRouter>
					</SearchProvider>
				</CartProvider>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
		localStorage.clear();
		axios.get.mockReset();
		axios.put.mockReset();
		setItemSpy = jest.spyOn(Storage.prototype, "setItem");
		toastSuccessSpy = jest.spyOn(toast, "success").mockImplementation(() => {});
		toastErrorSpy = jest.spyOn(toast, "error").mockImplementation(() => {});
		axios.get.mockResolvedValue({ data: { category: [] } });

		localStorage.setItem("auth", JSON.stringify({ user: mockInitialUser, token: "valid-token" }));
	});

	afterEach(() => {
		setItemSpy.mockRestore();
	});

	describe("Initialization & Context Integration", () => {
		test("pre-fills form with user data from AuthContext and keeps email disabled", async () => {
			renderProfile();

			await waitFor(() => {
				expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("Norbert Loh");
				expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue("norbert@u.nus.edu");
				expect(screen.getByPlaceholderText("Enter Your Phone Number")).toHaveValue("+6591234567");
				expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue("School of Computing, NUS");
				expect(screen.getByPlaceholderText("Enter Your DOB")).toHaveValue("2000-01-01");
			});

			expect(screen.getByPlaceholderText("Enter Your Email")).toBeDisabled();
			expect(screen.getByText("USER PROFILE")).toBeInTheDocument();
			expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/dashboard/user/orders");
		});
	});

	describe("Form Submission (Happy Path)", () => {
		test("valid submission calls axios, syncs localStorage, and toasts success", async () => {
			const updatedUser = { ...mockInitialUser, name: "Norbert Updated", address: "PGP Residences" };
			axios.put.mockResolvedValueOnce({
				data: { success: true, updatedUser },
			});

			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
					target: { value: "Norbert Updated " },
				});
				fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
					target: { value: "PGP Residences" },
				});
				fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
					target: { value: "newpassword123" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
					name: "Norbert Updated",
					email: "norbert@u.nus.edu",
					password: "newpassword123",
					phone: "+6591234567",
					address: "PGP Residences",
					DOB: "2000-01-01",
				});
			});

			expect(setItemSpy).toHaveBeenCalledWith("auth", expect.stringContaining('"name":"Norbert Updated"'));
			expect(toastSuccessSpy).toHaveBeenCalledWith("Profile Updated Successfully");
		});

		test("update button is disabled while request is in-flight and re-enabled afterward", async () => {
			let resolveRequest;
			const pendingRequest = new Promise((resolve) => {
				resolveRequest = resolve;
			});
			axios.put.mockReturnValueOnce(pendingRequest);

			renderProfile();

			const button = await screen.findByRole("button", { name: /update/i });
			expect(button).not.toBeDisabled();

			fireEvent.click(button);

			await waitFor(() => expect(button).toBeDisabled());

			resolveRequest({
				data: {
					success: true,
					updatedUser: mockInitialUser,
				},
			});

			await waitFor(() => expect(button).not.toBeDisabled());
		});
	});

	describe("Validation & Negative Paths", () => {
		test("blocks submission when name exceeds 100 characters", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
					target: { value: "N".repeat(101) },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Name should be 1 to 100 characters");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when phone is empty", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Phone Number"), {
					target: { value: "" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Phone number is required");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission for invalid phone format", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Phone Number"), {
					target: { value: "invalid-phone" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Phone number must be in E.164 format");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when DOB is empty", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
					target: { value: "" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Date of Birth is required");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when DOB format validator fails", async () => {
			jest.spyOn(validationHelpers, "isValidDOBFormat").mockReturnValue(false);

			renderProfile();
			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Date of Birth must be in YYYY-MM-DD format");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when DOB strict validator fails", async () => {
			jest.spyOn(validationHelpers, "isValidDOBFormat").mockReturnValue(true);
			jest.spyOn(validationHelpers, "isValidDOBStrict").mockReturnValue(false);

			renderProfile();
			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Date of Birth must be in YYYY-MM-DD format");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when DOB is in the future", async () => {
			jest.spyOn(validationHelpers, "isValidDOBFormat").mockReturnValue(true);
			jest.spyOn(validationHelpers, "isValidDOBStrict").mockReturnValue(true);
			jest.spyOn(validationHelpers, "isDOBNotFuture").mockReturnValue(false);

			renderProfile();
			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("DOB cannot be in the future");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when address is empty", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
					target: { value: "   " },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Address is required");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("blocks submission when password is present but too short", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
					target: { value: "123" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toastErrorSpy).toHaveBeenCalledWith("Password must be at least 6 characters");
			});
			expect(axios.put).not.toHaveBeenCalled();
		});

		test("handles backend failure without overwriting auth localStorage", async () => {
			axios.put.mockResolvedValueOnce({
				data: { success: false, error: "Email already in use by another account" },
			});

			renderProfile();

			await waitFor(() => {
				expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("Norbert Loh");
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(axios.put).toHaveBeenCalled();
			});

			expect(toastErrorSpy).toHaveBeenCalledWith("Email already in use by another account");

			const authWrites = setItemSpy.mock.calls.filter((call) => call[0] === "auth");
			expect(authWrites.length).toBe(1);
		});

		test("handles backend success=false with message field", async () => {
			axios.put.mockResolvedValueOnce({
				data: { success: false, message: "Profile validation failed" },
			});

			renderProfile();
			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(axios.put).toHaveBeenCalled();
				expect(toastErrorSpy).toHaveBeenCalledWith("Profile validation failed");
			});
		});

		test("uses default backend failure message when response has no error or message", async () => {
			axios.put.mockResolvedValueOnce({
				data: { success: false },
			});

			renderProfile();
			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(axios.put).toHaveBeenCalled();
				expect(toastErrorSpy).toHaveBeenCalledWith("Profile Update Failed");
			});
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("network failure logs error and does not leak plaintext password in logs", async () => {
			const plainPassword = "mySuperSecretPassword";
			const apiError = new Error("Network Error");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
			axios.put.mockRejectedValueOnce(apiError);

			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
					target: { value: plainPassword },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(consoleSpy).toHaveBeenCalledWith(apiError);
			});

			const consolePayload = JSON.stringify(consoleSpy.mock.calls);
			expect(consolePayload).not.toContain(plainPassword);
			expect(toastErrorSpy).toHaveBeenCalledWith("Profile Update Failed");

			consoleSpy.mockRestore();
		});
	});
});
