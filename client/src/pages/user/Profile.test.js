import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import { useAuth } from "../../context/auth";
import axios from "axios";
import toast from "react-hot-toast";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" title={title}>
    {children}
  </div>
));

jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu">User Menu</div>
));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

// Suppress console output during tests
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

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Profile Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe("when user is authenticated", () => {
    it("renders the profile form with user data", () => {
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        DOB: "1990-01-01",
        address: "123 Test St",
      };
      useAuth.mockReturnValue([
        { user: mockUser, token: "test-token" },
        jest.fn(),
      ]);
      render(<Profile />);

      expect(screen.getByTestId("layout")).toHaveAttribute(
        "title",
        "Your Profile",
      );
      expect(screen.getByTestId("user-menu")).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.name)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.email)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.phone)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.DOB)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUser.address)).toBeInTheDocument();
    });

    it("email field should be disabled", () => {
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        DOB: "1990-01-01",
        address: "123 Test St",
      };
      useAuth.mockReturnValue([
        { user: mockUser, token: "test-token" },
        jest.fn(),
      ]);
      render(<Profile />);
      expect(screen.getByDisplayValue(mockUser.email)).toBeDisabled();
    });

    it("password field should be empty", () => {
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        DOB: "1990-01-01",
        address: "123 Test St",
      };
      useAuth.mockReturnValue([
        { user: mockUser, token: "test-token" },
        jest.fn(),
      ]);
      render(<Profile />);
      expect(screen.getByPlaceholderText("Enter Your Password")).toHaveValue(
        "",
      );
    });
  });

  describe("happy path", () => {
    it("should update profile successfully - name", async () => {
      const mockUser = {
        name: "Test User",
        email: "test@example.com",
        phone: "1234567890",
        DOB: "1990-01-01",
        address: "123 Test St",
      };
      const mockSetAuth = jest.fn();
      useAuth.mockReturnValue([
        { user: mockUser, token: "test-token" },
        mockSetAuth,
      ]);

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ user: mockUser, token: "test-token" }),
      );
      const updatedUser = { ...mockUser, name: "Updated User" };
      axios.put.mockResolvedValue({ data: { updatedUser } });

      render(<Profile />);

      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "Updated User" },
      });
      fireEvent.click(screen.getByText(/update/i));

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
          name: "Updated User",
          email: mockUser.email,
          password: "",
          phone: mockUser.phone,
          address: mockUser.address,
        });
        expect(mockSetAuth).toHaveBeenCalledWith(
          expect.objectContaining({ user: updatedUser }),
        );
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "auth",
          JSON.stringify({ user: updatedUser, token: "test-token" }),
        );
        expect(toast.success).toHaveBeenCalledWith(
          "Profile Updated Successfully",
        );
      });
    });

    describe("error handling", () => {
      it("should handle missing auth.user without throwing", async () => {
        useAuth.mockReturnValue([{}, jest.fn()]);
        render(<Profile />);

        await waitFor(() => {
          expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
            "",
          );
          expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue(
            "",
          );
          expect(
            screen.getByPlaceholderText("Enter Your Phone Number"),
          ).toHaveValue("");
          expect(screen.getByPlaceholderText("Enter Your DOB")).toHaveValue("");
          expect(screen.getByPlaceholderText("Enter Your Address")).toHaveValue(
            "",
          );
        });
      });

      it("should handle API error gracefully", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        axios.put.mockRejectedValue(new Error("API Error"));
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
        });
      });

      it("should log error to console", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        const consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});

        render(<Profile />);

        axios.put.mockRejectedValue(new Error("API Error"));
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      it("should show generic error message on API failure if error message is not available", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        axios.put.mockRejectedValue({});
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
        });
      });

      it("should show server message when API responds with success:false and message", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "+1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        axios.put.mockResolvedValue({
          data: { success: false, message: "Request body is empty" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Request body is empty");
        });
      });

      it("should show fallback message when API responds success:false without message", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "+1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        axios.put.mockResolvedValue({ data: { success: false } });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
        });
      });

      it("should show API returned error message when response contains error", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        const mockSetAuth = jest.fn();
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          mockSetAuth,
        ]);

        render(<Profile />);

        axios.put.mockResolvedValue({ data: { error: "Some API error" } });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Some API error");
          expect(mockSetAuth).not.toHaveBeenCalled();
          expect(localStorage.setItem).not.toHaveBeenCalled();
        });
      });
    });

    describe("Input validation", () => {
      it("should not allow empty name", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Name is required");
        });
      });

      it("should allow valid name", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Name is required");
        });
      });

      it("should not allow invalid phone number", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        fireEvent.change(
          screen.getByPlaceholderText("Enter Your Phone Number"),
          {
            target: { value: "invalid-phone" },
          },
        );
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Phone number must be in E.164 format",
          );
        });
      });

      it("should allow valid phone number", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(
          screen.getByPlaceholderText("Enter Your Phone Number"),
          {
            target: { value: "+1234567890" },
          },
        );
        fireEvent.click(screen.getByText(/update/i));
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Phone number must be in E.164 format",
          );
        });
      });

      it("should not allow empty phone number", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(
          screen.getByPlaceholderText("Enter Your Phone Number"),
          {
            target: { value: "" },
          },
        );
        fireEvent.click(screen.getByText(/update/i));
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Phone number is required");
        });
      });

      it("should not allow invalid date of birth", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        const dobInput = screen.getByPlaceholderText("Enter Your DOB");
        // In jsdom input[type=date] enforces browser-level validation and
        // ignores invalid strings. Set type to text to bypass built-in
        // validation so component's client-side validation runs.
        dobInput.setAttribute("type", "text");
        fireEvent.change(dobInput, {
          target: { value: "invalid-dob" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Date of Birth must be in YYYY-MM-DD format",
          );
        });
      });

      it("should not allow future date of birth", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const futureDateString = futureDate.toISOString().split("T")[0];

        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
          target: { value: futureDateString },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Date of Birth cannot be in the future",
          );
        });
      });

      it("should allow valid date of birth", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
          target: { value: "1990-01-01" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Date of Birth must be in YYYY-MM-DD format",
          );
        });
      });

      it("should not allow password less than 6 characters (5 characters)", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "12345" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Password must be at least 6 characters",
          );
        });
      });

      it("should allow valid password (6 characters)", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "123456" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Password must be at least 6 characters",
          );
        });
      });

      it("should allow valid password (more than 6 characters)", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "1234567" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Password must be at least 6 characters",
          );
        });
      });

      it("should allow empty password (no change)", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Password must be at least 6 characters",
          );
        });
      });

      it("should not trim password", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: " 123456 " },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
            name: mockUser.name,
            email: mockUser.email,
            password: " 123456 ",
            phone: mockUser.phone,
            address: mockUser.address,
          });
        });
      });

      it("should not allow empty address", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Address is required");
        });
      });

      it("should allow valid address", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "456 Updated St" },
        });
        fireEvent.click(screen.getByText(/update/i));
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Address is required");
        });
      });

      it("should trim name and address but not password", async () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);

        render(<Profile />);

        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "  Updated User  " },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "  456 Updated St  " },
        });
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: " 123456 " },
        });
        fireEvent.click(screen.getByText(/update/i));

        await waitFor(() => {
          expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
            name: "Updated User",
            email: mockUser.email,
            password: " 123456 ",
            phone: mockUser.phone,
            address: "456 Updated St",
          });
        });
      });
    });

    describe("Input placeholder and attributes", () => {
      it("should have correct placeholders and attributes for form fields", () => {
        const mockUser = {
          name: "Test User",
          email: "test@example.com",
          phone: "1234567890",
          DOB: "1990-01-01",
          address: "123 Test St",
        };
        useAuth.mockReturnValue([
          { user: mockUser, token: "test-token" },
          jest.fn(),
        ]);
        render(<Profile />);

        const nameInput = screen.getByPlaceholderText("Enter Your Name");
        expect(nameInput).toBeInTheDocument();
        expect(nameInput).toHaveAttribute("type", "text");

        const emailInput = screen.getByPlaceholderText("Enter Your Email");
        expect(emailInput).toBeInTheDocument();
        expect(emailInput).toHaveAttribute("type", "email");
        expect(emailInput).toBeDisabled();

        const phoneInput = screen.getByPlaceholderText(
          "Enter Your Phone Number",
        );
        expect(phoneInput).toBeInTheDocument();
        expect(phoneInput).toHaveAttribute("type", "text");

        const dobInput = screen.getByPlaceholderText("Enter Your DOB");
        expect(dobInput).toBeInTheDocument();
        expect(dobInput).toHaveAttribute("type", "date");

        const addressInput = screen.getByPlaceholderText("Enter Your Address");
        expect(addressInput).toBeInTheDocument();
        expect(addressInput).toHaveAttribute("type", "text");
      });
    });
  });
});
