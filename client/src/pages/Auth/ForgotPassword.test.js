// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";
import * as validationHelpers from "../../helpers/validation";

// Mocking axios.post
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../helpers/validation");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout-mock" data-title={title}>{children}</div>
));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("ForgotPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { category: [] } });
    // Mock validation helpers to pass by default
    validationHelpers.isValidEmail.mockReturnValue(true);
    validationHelpers.isPasswordLongEnough.mockReturnValue(true);
  });

  it("renders forgot password form", () => {
    // Arrange & Act
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert
    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(
      getByPlaceholderText("Enter Your Security Answer"),
    ).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your New Password")).toBeInTheDocument();
    expect(getByText("RESET PASSWORD")).toBeInTheDocument();
  });
  it("inputs should be initially empty", () => {
    // Arrange & Act
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert
    expect(getByText("Forgot Password")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email").value).toBe("");
    expect(getByPlaceholderText("Enter Your Security Answer").value).toBe("");
    expect(getByPlaceholderText("Enter Your New Password").value).toBe("");
  });
  describe("Form Submission", () => {
    it("should submit the form successfully", async () => {
      // Arrange
      axios.post.mockResolvedValue({
        data: { success: true, message: "Password reset successful" },
      });

      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@example.com",
            answer: "test answer",
            newPassword: "newpassword123",
          },
        );
        expect(toast.success).toHaveBeenCalledWith("Password reset successful");
        expect(mockNavigate).toHaveBeenCalledWith("/login");
      });
    });

    it("should handle form submission failure", async () => {
      // Arrange
      axios.post.mockResolvedValue({
        data: { success: false, message: "Password reset failed" },
      });

      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@example.com",
            answer: "test answer",
            newPassword: "newpassword123",
          },
        );
        expect(toast.error).toHaveBeenCalledWith("Password reset failed");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe("Input Validation - Empty Fields", () => {
    it("should show error when email is empty", async () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Email is required");
      });
    });

    it("should show error when answer is empty", async () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Security answer is required");
      });
    });

    it("should show error when newPassword is empty", async () => {
      // Arrange
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("New password is required");
      });
    });
  });

  describe("Validation Tests - Mocked Helpers", () => {
    test.each([
      ["isValidEmail", false, "Invalid email format"],
      [
        "isPasswordLongEnough",
        false,
        "New password must be at least 6 characters long",
      ],
    ])(
      "should prevent submission when %s returns false",
      async (validationFunction, returnValue, expectedError) => {
        // Arrange
        validationHelpers[validationFunction].mockReturnValue(returnValue);

        const { getByPlaceholderText, getByText } = render(
          <MemoryRouter initialEntries={["/forgot-password"]}>
            <Routes>
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Routes>
          </MemoryRouter>,
        );

        // Act
        fireEvent.change(getByPlaceholderText("Enter Your Email"), {
          target: { value: "test@example.com" },
        });
        fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
          target: { value: "test answer" },
        });
        fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
          target: { value: "newpassword123" },
        });
        fireEvent.click(getByText("RESET PASSWORD"));

        // Assert
        await waitFor(() => {
          expect(axios.post).not.toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith(expectedError);
        });
      },
    );
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

    it("should handle network or server errors gracefully", async () => {
      // Arrange
      axios.post.mockRejectedValue(new Error("Network Error"));
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@example.com",
            answer: "test answer",
            newPassword: "newpassword123",
          },
        );
        expect(toast.error).toHaveBeenCalledWith("Network Error");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("should log error and show generic message if error has no message", async () => {
      // Arrange
      axios.post.mockRejectedValue(new Error());
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "test answer" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@example.com",
            answer: "test answer",
            newPassword: "newpassword123",
          },
        );
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
        expect(toast.error).toHaveBeenCalledWith(
          "An unexpected error occurred",
        );
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
