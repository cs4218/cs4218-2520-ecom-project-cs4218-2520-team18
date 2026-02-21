// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Login from "./Login";
import { useAuth } from "../../context/auth";

// Mocking axios.post
jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]), // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]), // Mock useCart hook to return null state and a mock function
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), // Mock useSearch hook to return null state and a mock function
}));

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
let mockLocationState = { state: null };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocationState,
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout-mock" data-title={title}>
    {children}
  </div>
));

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

describe("Login Component", () => {
  const mockSetAuth = jest.fn();

  beforeEach(() => {
    localStorageMock.clear();
    mockLocationState = { state: null };
    jest.clearAllMocks();

    useAuth.mockReturnValue([{}, mockSetAuth]);
  });

  it("renders login form", () => {
    // Arrange
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert
    expect(getByText("LOGIN FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Password")).toBeInTheDocument();
  });
  it("inputs should be initially empty", () => {
    // Arrange
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    // Assert
    expect(getByText("LOGIN FORM")).toBeInTheDocument();
    expect(getByPlaceholderText("Enter Your Email").value).toBe("");
    expect(getByPlaceholderText("Enter Your Password").value).toBe("");
  });

  it("should allow typing email and password", () => {
    // Arrange
    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    // Act
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });

    // Assert
    expect(getByPlaceholderText("Enter Your Email").value).toBe(
      "test@example.com",
    );
    expect(getByPlaceholderText("Enter Your Password").value).toBe(
      "password123",
    );
  });

  it("should login the user successfully", async () => {
    // Arrange
    const mockResponse = {
      data: {
        success: true,
        user: { id: 1, name: "John Doe", email: "test@example.com" },
        token: "mockToken",
        message: "Login successful",
      },
    };
    axios.post.mockResolvedValueOnce(mockResponse);

    const { getByPlaceholderText, getByText } = render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    // Act
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(getByText("LOGIN"));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Login successful", {
      duration: 5000,
      icon: "🙏",
      style: {
        background: "green",
        color: "white",
      },
    });
    expect(mockSetAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        user: { id: 1, name: "John Doe", email: "test@example.com" },
        token: "mockToken",
      }),
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "auth",
      JSON.stringify(mockResponse.data),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  describe("Error handling", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should display error message on failed login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Invalid credentials" },
      });

      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(getByText("LOGIN"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
      expect(mockSetAuth).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should display generic error message if there is an error without response data", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error());
      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(getByText("LOGIN"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      expect(mockSetAuth).not.toHaveBeenCalled();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe("Input attributes", () => {
    it("Form inputs should have required attribute", () => {
      // Arrange
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      expect(getByPlaceholderText("Enter Your Email")).toHaveAttribute(
        "required",
      );
      expect(getByPlaceholderText("Enter Your Password")).toHaveAttribute(
        "required",
      );
    });
    it('Email input should have type="email"', () => {
      // Arrange
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      expect(getByPlaceholderText("Enter Your Email")).toHaveAttribute(
        "type",
        "email",
      );
    });
    it('Password input should have type="password"', () => {
      // Arrange
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      expect(getByPlaceholderText("Enter Your Password")).toHaveAttribute(
        "type",
        "password",
      );
    });
  });

  describe("Error logging", () => {
    it("should log error to console on failed login", async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      axios.post.mockRejectedValueOnce(new Error("Network Error"));

      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(getByText("LOGIN"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("Navigation after login", () => {
    it("should navigate to the previous location after login if location.state is set", async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          user: { id: 1, name: "John Doe", email: "john.doe@example.com" },
          token: "mockToken",
        },
      };
      axios.post.mockResolvedValueOnce(mockResponse);
      mockLocationState = { state: "/previous-page" };

      const { getByPlaceholderText, getByText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.click(getByText("LOGIN"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(mockNavigate).toHaveBeenCalledWith("/previous-page");
    });
  });

  describe("Forget Password Button", () => {
    it("should have a forget password button that navigates to /forgot-password", () => {
      // Arrange
      const { getByText } = render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );
      const forgetPasswordButton = getByText("Forgot Password");
      expect(forgetPasswordButton).toBeInTheDocument();

      // Act
      fireEvent.click(forgetPasswordButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith("/forgot-password");
    });
  });

  describe("Layout Title", () => {
    it('should set the document title to "Login - Ecommerce App"', () => {
      // Arrange
      render(
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>,
      );
      const layout = document.querySelector("[data-testid='layout-mock']");

      // Assert
      expect(layout).toHaveAttribute("data-title", "Login - Ecommerce App");
    });
  });
});
