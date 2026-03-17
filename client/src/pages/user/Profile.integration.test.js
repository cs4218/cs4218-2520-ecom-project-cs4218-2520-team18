// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import toast from "react-hot-toast";
import { MemoryRouter } from "react-router-dom";
import Profile from "./Profile";
import { AuthProvider } from "../../context/auth";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
	success: jest.fn(),
	error: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
	<div data-testid="layout-mock">
		<div data-testid="layout-title">{title}</div>
		{children}
	</div>
));

jest.mock("../../components/UserMenu", () => () => <div data-testid="usermenu-mock">UserMenu</div>);

describe("Profile Component - Integration Tests", () => {
	let setItemSpy;

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
				<MemoryRouter>
					<Profile />
				</MemoryRouter>
			</AuthProvider>,
		);

	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		setItemSpy = jest.spyOn(Storage.prototype, "setItem");

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
			expect(screen.getByTestId("layout-title")).toHaveTextContent("Your Profile");
			expect(screen.getByTestId("usermenu-mock")).toBeInTheDocument();
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
				});
			});

			expect(setItemSpy).toHaveBeenCalledWith("auth", expect.stringContaining('"name":"Norbert Updated"'));
			expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully");
		});
	});

	describe("Validation & Negative Paths", () => {
		test("blocks submission for invalid phone format", async () => {
			renderProfile();

			await waitFor(() => {
				fireEvent.change(screen.getByPlaceholderText("Enter Your Phone Number"), {
					target: { value: "invalid-phone" },
				});
			});

			fireEvent.click(screen.getByRole("button", { name: /update/i }));

			await waitFor(() => {
				expect(toast.error).toHaveBeenCalledWith("Phone number must be in E.164 format");
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
				expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters");
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

			expect(toast.error).toHaveBeenCalledWith("Email already in use by another account");

			const authWrites = setItemSpy.mock.calls.filter((call) => call[0] === "auth");
			expect(authWrites.length).toBe(1);
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
			expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");

			consoleSpy.mockRestore();
		});
	});
});
