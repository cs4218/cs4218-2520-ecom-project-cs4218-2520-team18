// Billy Ho Cheng En, A0252588R

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import Users from "./Users";
import { AuthProvider } from "../../context/auth";

jest.mock("axios");

jest.mock("../../components/Layout", () => ({ children, title }) => (
	<div data-testid="layout" data-title={title}>
		{children}
	</div>
));

jest.mock("../../components/AdminMenu", () => () => (
	<div data-testid="admin-menu">Admin Menu</div>
));

// Suppress console warnings for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
	console.log = jest.fn();
	console.error = jest.fn();
});
afterAll(() => {
	console.log = originalConsoleLog;
	console.error = originalConsoleError;
});

const renderUsersPage = (initialPath = "/dashboard/admin/users") => {
	return render(
		<MemoryRouter initialEntries={[initialPath]}>
			<AuthProvider>
				<Routes>
					<Route path="/dashboard/admin/users" element={<Users />} />
				</Routes>
			</AuthProvider>
		</MemoryRouter>
	);
};

const mockUsers = [
	{
		_id: "user1",
		name: "John Doe",
		email: "john@example.com",
		phone: "+1234567890",
		role: 0,
	},
	{
		_id: "user2",
		name: "Jane Admin",
		email: "jane@example.com",
		phone: "+0987654321",
		role: 1,
	},
	{
		_id: "user3",
		name: "Bob Regular",
		email: "bob@example.com",
		phone: "+1122334455",
		role: 0,
	},
];

describe("Users Page - Integration Tests", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.setItem(
			"auth",
			JSON.stringify({
				user: { name: "Admin", role: 1 },
				token: "valid-token",
			})
		);
	});

	afterEach(() => {
		localStorage.clear();
	});

	describe("Component Rendering", () => {
		test("should render Layout with correct title", async () => {
			axios.get.mockResolvedValue({ data: { users: [] } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByTestId("layout")).toBeInTheDocument();
			});

			expect(screen.getByTestId("layout")).toHaveAttribute(
				"data-title",
				"Dashboard - All Users"
			);
		});

		test("should render AdminMenu component", async () => {
			axios.get.mockResolvedValue({ data: { users: [] } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
			});
		});

		test("should render 'All Users' heading", async () => {
			axios.get.mockResolvedValue({ data: { users: [] } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("All Users")).toBeInTheDocument();
			});
		});
	});

	describe("Data Fetching", () => {
		test("should fetch users from API on mount", async () => {
			axios.get.mockResolvedValue({ data: { users: mockUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-users");
			});
		});

		test("should handle API errors gracefully", async () => {
			const error = new Error("Network Error");
			axios.get.mockRejectedValue(error);
			renderUsersPage();

			await waitFor(() => {
				expect(console.log).toHaveBeenCalledWith(error);
			});
		});
	});

	describe("User Display", () => {
		test("should display all users after fetching", async () => {
			axios.get.mockResolvedValue({ data: { users: mockUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
				expect(screen.getByText("Jane Admin")).toBeInTheDocument();
				expect(screen.getByText("Bob Regular")).toBeInTheDocument();
			});
		});

		test("should display user emails", async () => {
			axios.get.mockResolvedValue({ data: { users: mockUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("john@example.com")).toBeInTheDocument();
				expect(screen.getByText("jane@example.com")).toBeInTheDocument();
				expect(screen.getByText("bob@example.com")).toBeInTheDocument();
			});
		});

		test("should display user phone numbers", async () => {
			axios.get.mockResolvedValue({ data: { users: mockUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("+1234567890")).toBeInTheDocument();
				expect(screen.getByText("+0987654321")).toBeInTheDocument();
				expect(screen.getByText("+1122334455")).toBeInTheDocument();
			});
		});

		test("should display empty state when no users exist", async () => {
			axios.get.mockResolvedValue({ data: { users: [] } });
			renderUsersPage();

			await waitFor(() => {
				expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-users");
			});

			expect(screen.getByText("All Users")).toBeInTheDocument();
			// Should not display any user data
			expect(screen.queryByText("john@example.com")).not.toBeInTheDocument();
		});

		test("should display users in a table format", async () => {
			axios.get.mockResolvedValue({ data: { users: mockUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByRole("table")).toBeInTheDocument();
			});

			// Check table headers exist
			expect(screen.getByText(/name/i)).toBeInTheDocument();
			expect(screen.getByText(/email/i)).toBeInTheDocument();
			expect(screen.getByText(/phone/i)).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		test("should handle users with missing phone number", async () => {
			const usersWithMissingPhone = [
				{
					_id: "user1",
					name: "No Phone User",
					email: "nophone@example.com",
					phone: "",
					role: 0,
				},
			];
			axios.get.mockResolvedValue({ data: { users: usersWithMissingPhone } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("No Phone User")).toBeInTheDocument();
				expect(screen.getByText("nophone@example.com")).toBeInTheDocument();
			});
		});

		test("should handle single user", async () => {
			const singleUser = [mockUsers[0]];
			axios.get.mockResolvedValue({ data: { users: singleUser } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("John Doe")).toBeInTheDocument();
			});

			expect(screen.queryByText("Jane Admin")).not.toBeInTheDocument();
		});

		test("should handle large number of users", async () => {
			const manyUsers = Array.from({ length: 50 }, (_, i) => ({
				_id: `user${i}`,
				name: `User ${i}`,
				email: `user${i}@example.com`,
				phone: `+100000000${i.toString().padStart(2, "0")}`,
				role: i % 2,
			}));
			axios.get.mockResolvedValue({ data: { users: manyUsers } });
			renderUsersPage();

			await waitFor(() => {
				expect(screen.getByText("User 0")).toBeInTheDocument();
				expect(screen.getByText("User 49")).toBeInTheDocument();
			});
		});
	});
});
