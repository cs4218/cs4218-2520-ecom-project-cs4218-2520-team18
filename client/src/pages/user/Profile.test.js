// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Profile from "./Profile";
import { useAuth } from "../../context/auth";
import axios from "axios";
import toast from "react-hot-toast";
import * as validationHelpers from "../../helpers/validation";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../helpers/validation");

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
  const setupUser = (overrides = {}) => {
    const mockUser = {
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      DOB: "1990-01-01",
      address: "123 Test St",
      ...overrides,
    };
    const mockSetAuth = jest.fn();
    useAuth.mockReturnValue([
      { user: mockUser, token: "test-token" },
      mockSetAuth,
    ]);
    return { mockUser, mockSetAuth };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Mock validation helpers to pass by default
    validationHelpers.isValidPhone.mockReturnValue(true);
    validationHelpers.isValidDOBFormat.mockReturnValue(true);
    validationHelpers.isValidDOBStrict.mockReturnValue(true);
    validationHelpers.isDOBNotFuture.mockReturnValue(true);
    validationHelpers.isPasswordLongEnough.mockReturnValue(true);
  });

  describe("Rendering", () => {
    it("renders the profile form with user data", () => {
      // Arrange
      const { mockUser } = setupUser();

      // Act
      render(<Profile />);
      // Assert
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
      // Arrange
      const { mockUser } = setupUser();

      // Act
      render(<Profile />);

      // Assert
      expect(screen.getByDisplayValue(mockUser.email)).toBeDisabled();
    });

    it("password field should be empty", () => {
      // Arrange
      setupUser();

      // Act
      render(<Profile />);

      // Assert
      expect(screen.getByPlaceholderText("Enter Your Password")).toHaveValue(
        "",
      );
    });
  });

  describe("Successful Profile Update", () => {
    it("should update profile successfully - name", async () => {
      // Arrange
      const { mockUser, mockSetAuth } = setupUser();

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ user: mockUser, token: "test-token" }),
      );
      const updatedUser = { ...mockUser, name: "Updated User" };
      axios.put.mockResolvedValue({ data: { updatedUser } });

      render(<Profile />);

      // Act
      fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
        target: { value: "Updated User" },
      });
      fireEvent.click(screen.getByText(/update/i));

      // Assert
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
  });

  describe("Error Handling", () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("should handle missing auth.user without throwing", async () => {
      // Arrange
      useAuth.mockReturnValue([{}, jest.fn()]);

      // Act
      render(<Profile />);

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("");
        expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue("");
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
      // Arrange
      const { mockUser } = setupUser();
      render(<Profile />);

      // Act
      axios.put.mockRejectedValue(new Error("API Error"));
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
      });
    });

    it("should log error to console", async () => {
      // Arrange
      const { mockUser } = setupUser();

      render(<Profile />);

      // Act
      axios.put.mockRejectedValue(new Error("API Error"));
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    it("should show generic error message on API failure if error message is not available", async () => {
      // Arrange
      setupUser();
      render(<Profile />);

      // Act
      axios.put.mockRejectedValue({});
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
      });
    });

    it("should show server message when API responds with success:false and message", async () => {
      // Arrange
      const { mockUser } = setupUser({ phone: "+1234567890" });
      render(<Profile />);

      // Act
      axios.put.mockResolvedValue({
        data: { success: false, message: "Request body is empty" },
      });
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Request body is empty");
      });
    });

    it("should show fallback message when API responds success:false without message", async () => {
      // Arrange
      const { mockUser } = setupUser({ phone: "+1234567890" });
      render(<Profile />);

      // Act
      axios.put.mockResolvedValue({ data: { success: false } });
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
      });
    });

    it("should show API returned error message when response contains error", async () => {
      // Arrange
      const { mockUser, mockSetAuth } = setupUser();
      render(<Profile />);

      // Act
      axios.put.mockResolvedValue({ data: { error: "Some API error" } });
      fireEvent.click(screen.getByText(/update/i));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Some API error");
        expect(mockSetAuth).not.toHaveBeenCalled();
        expect(localStorage.setItem).not.toHaveBeenCalled();
      });
    });
  });

  describe("Validation - Mocked Helpers", () => {
    describe("Phone Validation Helper", () => {
      it("should show error when isValidPhone returns false", async () => {
        // Arrange
        setupUser();
        validationHelpers.isValidPhone.mockReturnValue(false);
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
          expect(axios.put).not.toHaveBeenCalled();
        });
      });

      it("should proceed to API call when isValidPhone returns true", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify({ user: mockUser, token: "test-token" }),
        );
        const updatedUser = { ...mockUser };
        axios.put.mockResolvedValue({ data: { updatedUser } });
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });
      });
    });

    describe("DOB Format Validation Helper", () => {
      it("should show error when isValidDOBFormat returns false", async () => {
        // Arrange
        setupUser();
        validationHelpers.isValidDOBFormat.mockReturnValue(false);
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
          expect(axios.put).not.toHaveBeenCalled();
        });
      });

      it("should proceed to API call when isValidDOBFormat returns true", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify({ user: mockUser, token: "test-token" }),
        );
        const updatedUser = { ...mockUser };
        axios.put.mockResolvedValue({ data: { updatedUser } });
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });
      });
    });

    describe("DOB Strict Validation Helper", () => {
      it("should show error when isValidDOBStrict returns false", async () => {
        // Arrange
        setupUser();
        validationHelpers.isValidDOBStrict.mockReturnValue(false);
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
          expect(axios.put).not.toHaveBeenCalled();
        });
      });

      it("should proceed to API call when isValidDOBStrict returns true", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify({ user: mockUser, token: "test-token" }),
        );
        const updatedUser = { ...mockUser };
        axios.put.mockResolvedValue({ data: { updatedUser } });
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });
      });
    });

    describe("DOB Future Date Validation Helper", () => {
      it("should show error when isDOBNotFuture returns false", async () => {
        // Arrange
        setupUser();
        validationHelpers.isDOBNotFuture.mockReturnValue(false);
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
          expect(axios.put).not.toHaveBeenCalled();
        });
      });

      it("should proceed to API call when isDOBNotFuture returns true", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify({ user: mockUser, token: "test-token" }),
        );
        const updatedUser = { ...mockUser };
        axios.put.mockResolvedValue({ data: { updatedUser } });
        render(<Profile />);

        // Act
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });
      });
    });

    describe("Password Length Validation Helper", () => {
      it("should show error when isPasswordLongEnough returns false", async () => {
        // Arrange
        setupUser();
        validationHelpers.isPasswordLongEnough.mockReturnValue(false);
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "short" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalled();
          expect(axios.put).not.toHaveBeenCalled();
        });
      });

      it("should proceed to API call when isPasswordLongEnough returns true", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue(
          JSON.stringify({ user: mockUser, token: "test-token" }),
        );
        const updatedUser = { ...mockUser };
        axios.put.mockResolvedValue({ data: { updatedUser } });
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "validPassword" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });
      });
    });
  });

  describe("Input Validation - EP & BVA", () => {
    describe("Name Validation", () => {
      it("should show error when name is empty", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Name should be 1 to 100 characters");
        });
      });

      it("should not show error when name is valid", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Name should be 1 to 100 characters");
        });
      });

      it("should show error when name is whitespace-only", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "   " },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Name should be 1 to 100 characters");
        });
      });

      it("should allow single character name (BVA lower boundary)", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "A" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Name should be 1 to 100 characters");
        });
      });

      it("should show error when name exceeds 100 characters (BVA upper boundary)", async () => {
        // Arrange
        setupUser();
        const longName = "A".repeat(101);
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: longName },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith('Name should be 1 to 100 characters');
        });
      });

      it("should allow exactly 100 character name (BVA upper boundary inclusive)", async () => {
        // Arrange
        setupUser();
        const exactName = "A".repeat(100);
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: exactName },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith('Name should be 1 to 100 characters');
        });
      });
    });

    describe("Phone Validation", () => {
      it("should show error when phone is empty", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(
          screen.getByPlaceholderText("Enter Your Phone Number"),
          {
            target: { value: "" },
          },
        );
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Phone number is required");
        });
      });

      it("should not show error when phone is valid", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(
          screen.getByPlaceholderText("Enter Your Phone Number"),
          {
            target: { value: "6581234567" },
          },
        );
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Phone number is required");
        });
      });
    });

    describe("DOB Validation", () => {
      it("should show error when DOB is empty", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith(
            "Date of Birth is required",
          );
        });
      });

      it("should not show error when DOB is valid", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your DOB"), {
          target: { value: "1990-01-01" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Date of Birth is required",
          );
        });
      });
    });

    describe("Password Validation", () => {
      it("should not show error when password is empty (no change)", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith(
            "Password must be at least 6 characters",
          );
        });
      });

      it("should not trim password", async () => {
        // Arrange
        const { mockUser } = setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
          target: { value: " 123456 " },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
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
    });

    describe("Address Validation", () => {
      it("should show error when address is empty", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Address is required");
        });
      });

      it("should not show error when address is valid", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "456 Updated St" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Address is required");
        });
      });

      it("should show error when address is whitespace-only", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "    " },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).toHaveBeenCalledWith("Address is required");
        });
      });

      it("should allow single character address (BVA lower boundary)", async () => {
        // Arrange
        setupUser();
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: "5" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Address is required");
        });
      });

      it("should allow very long address (BVA upper boundary)", async () => {
        // Arrange
        setupUser();
        const longAddress = "123 Very Long Street ".repeat(10);
        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
          target: { value: longAddress },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(toast.error).not.toHaveBeenCalledWith("Address is required");
        });
      });
    });

    describe("Input Trimming", () => {
      it("should trim name and address but not password", async () => {
        // Arrange
        const { mockUser } = setupUser();
        render(<Profile />);

        // Act
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

        // Assert
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
  });

  describe("Input Type and Attributes", () => {
    it("should have correct placeholders and attributes for form fields", () => {
      // Arrange
      setupUser();

      // Act
      render(<Profile />);

      // Assert
      const nameInput = screen.getByPlaceholderText("Enter Your Name");
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute("type", "text");

      const emailInput = screen.getByPlaceholderText("Enter Your Email");
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toBeDisabled();

      const phoneInput = screen.getByPlaceholderText("Enter Your Phone Number");
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

  describe("Fragile Logic Edge Cases", () => {
    describe("localStorage Crash - Edge Case", () => {
      let consoleErrorSpy;

      beforeEach(() => {
        consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});
      });

      afterEach(() => {
        consoleErrorSpy.mockRestore();
      });

      it("should handle null localStorage gracefully (localStorage is empty)", async () => {
        // Arrange
        const { mockUser, mockSetAuth } = setupUser();
        localStorageMock.getItem.mockReturnValue(null);

        axios.put.mockResolvedValue({
          data: { updatedUser: { ...mockUser, name: "Updated User" } },
        });

        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
        });
      });

      it("should handle malformed localStorage JSON gracefully", async () => {
        // Arrange
        const { mockUser } = setupUser();
        localStorageMock.getItem.mockReturnValue("invalid-json{{{");

        axios.put.mockResolvedValue({
          data: { updatedUser: { ...mockUser, name: "Updated User" } },
        });

        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith("Profile Update Failed");
        });
      });

      it("should safely update localStorage when auth structure is valid", async () => {
        // Arrange
        const { mockUser, mockSetAuth } = setupUser();
        const validAuthData = JSON.stringify({
          user: mockUser,
          token: "test-token",
        });
        localStorageMock.getItem.mockReturnValue(validAuthData);

        const updatedUser = { ...mockUser, name: "Updated User" };
        axios.put.mockResolvedValue({ data: { updatedUser } });

        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(localStorage.setItem).toHaveBeenCalledWith(
            "auth",
            JSON.stringify({
              user: updatedUser,
              token: "test-token",
            }),
          );
          expect(toast.success).toHaveBeenCalledWith(
            "Profile Updated Successfully",
          );
        });
      });
    });

    describe("UX Tests", () => {
      it("should disable update button while API call is in progress", async () => {
        // Arrange
        const { mockUser, mockSetAuth } = setupUser();
        const validAuthData = JSON.stringify({
          user: mockUser,
          token: "test-token",
        });
        localStorageMock.getItem.mockReturnValue(validAuthData);

        const updatedUser = { ...mockUser, name: "Updated User" };
        axios.put.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    data: { updatedUser },
                  }),
                500,
              ),
            ),
        );

        render(<Profile />);

        // Act
        fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
          target: { value: "Updated User" },
        });
        fireEvent.click(screen.getByText(/update/i));

        // Assert
        await waitFor(() => {
          expect(screen.getByText(/update/i)).toBeDisabled();
        });

        await waitFor(() => {
          expect(axios.put).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(screen.getByText(/update/i)).not.toBeDisabled();
        });
      });
    });
  });
});
