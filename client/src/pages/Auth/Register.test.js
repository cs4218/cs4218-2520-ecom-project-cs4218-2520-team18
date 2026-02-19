// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";
import * as validationHelpers from "../../helpers/validation";

// Mocking dependencies
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../helpers/validation");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]), // Mock useAuth hook to return null state and a mock function for setAuth
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]), // Mock useCart hook to return null state and a mock function
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]), // Mock useSearch hook to return null state and a mock function
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
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

// Helper function to fill form with data
const fillForm = (getByPlaceholderText, formData) => {
  const {
    name = "John Doe",
    email = "test@example.com",
    password = "password123",
    phone = "1234567890",
    address = "123 Street",
    dob = "2000-01-01",
    answer = "Football",
  } = formData;

  if (name !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: name },
    });
  }
  if (email !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: email },
    });
  }
  if (password !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: password },
    });
  }
  if (phone !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: phone },
    });
  }
  if (address !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: address },
    });
  }
  if (dob !== undefined) {
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: dob },
    });
  }
  if (answer !== undefined) {
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: answer },
    });
  }
};

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock all validation helpers to pass by default (Happy Path)
    validationHelpers.isValidEmail.mockReturnValue(true);
    validationHelpers.isPasswordLongEnough.mockReturnValue(true);
    validationHelpers.isValidPhone.mockReturnValue(true);
    validationHelpers.isValidDOBFormat.mockReturnValue(true);
    validationHelpers.isValidDOBStrict.mockReturnValue(true);
    validationHelpers.isDOBNotFuture.mockReturnValue(true);
  });

  describe("Successful Registration", () => {
    it("should register the user successfully", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(
        "Register Successfully, please login",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  describe("Registration Error Handling", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should display error message on failed registration", async () => {
      // Arrange
      const errorMessage = "Email already exists";
      axios.post.mockResolvedValueOnce({ data: { success: false, message: errorMessage } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });

    it("should handle network error gracefully", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Network Error"));
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Network Error");
    });

    it("should use default error message if no message is provided", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error());
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  describe("Console Error Logging", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("should log errors to console on registration failure", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Test Error"));
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("Input Handling", () => {
    it("should update state on input change", () => {
      // Arrange
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act & Assert
      const nameInput = getByPlaceholderText("Enter Your Name");
      fireEvent.change(nameInput, { target: { value: "John Doe" } });
      expect(nameInput.value).toBe("John Doe");

      const emailInput = getByPlaceholderText("Enter Your Email");
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      expect(emailInput.value).toBe("test@example.com");

      const passwordInput = getByPlaceholderText("Enter Your Password");
      fireEvent.change(passwordInput, { target: { value: "password123" } });
      expect(passwordInput.value).toBe("password123");

      const phoneInput = getByPlaceholderText("Enter Your Phone");
      fireEvent.change(phoneInput, { target: { value: "1234567890" } });
      expect(phoneInput.value).toBe("1234567890");

      const addressInput = getByPlaceholderText("Enter Your Address");
      fireEvent.change(addressInput, { target: { value: "123 Street" } });
      expect(addressInput.value).toBe("123 Street");

      const dobInput = getByPlaceholderText("Enter Your DOB");
      fireEvent.change(dobInput, { target: { value: "2000-01-01" } });
      expect(dobInput.value).toBe("2000-01-01");

      const answerInput = getByPlaceholderText("What is Your Favorite sports");
      fireEvent.change(answerInput, { target: { value: "Football" } });
      expect(answerInput.value).toBe("Football");
    });
  });

  describe("Validation Tests", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test.each([
      ["isValidEmail", false, "Invalid Email"],
      ["isPasswordLongEnough", false, "Password must be at least 6 characters long"],
      ["isValidPhone", false, "Phone number must be in E.164 format"],
      ["isValidDOBFormat", false, "Date of Birth must be a valid date"],
      ["isValidDOBStrict", false, "Date of Birth must be a valid date"],
      ["isDOBNotFuture", false, "Date of Birth cannot be a future date"],
    ])(
      "should prevent submission when %s returns false",
      async (validationFunction, returnValue, expectedError) => {
        // Arrange
        validationHelpers[validationFunction].mockReturnValue(returnValue);
        axios.get.mockResolvedValueOnce({ data: { category: [] } });

        const { getByText, getByPlaceholderText } = render(
          <MemoryRouter initialEntries={["/register"]}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>,
        );

        // Act
        fillForm(getByPlaceholderText, {});
        fireEvent.click(getByText("REGISTER"));

        // Assert
        await waitFor(() => {
          expect(axios.post).not.toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith(expectedError);
        });
      }
    );
  });

  describe("Email Validation - Mocked", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should allow submission when isValidEmail returns true", async () => {
      // Arrange
      validationHelpers.isValidEmail.mockReturnValue(true);
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    test("should prevent submission when isValidEmail returns false", async () => {
      // Arrange
      validationHelpers.isValidEmail.mockReturnValue(false);
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Invalid Email");
      });
    });
  });

  describe("Phone Validation - Mocked", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should allow submission when isValidPhone returns true", async () => {
      // Arrange
      validationHelpers.isValidPhone.mockReturnValue(true);
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    test("should prevent submission when isValidPhone returns false", async () => {
      // Arrange
      validationHelpers.isValidPhone.mockReturnValue(false);
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Phone number must be in E.164 format");
      });
    });
  });

  describe("DOB Validation - Mocked", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should allow submission when DOB validation passes", async () => {
      // Arrange
      validationHelpers.isValidDOBFormat.mockReturnValue(true);
      validationHelpers.isValidDOBStrict.mockReturnValue(true);
      validationHelpers.isDOBNotFuture.mockReturnValue(true);
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });
    });

    test("should prevent submission when isValidDOBFormat returns false", async () => {
      // Arrange
      validationHelpers.isValidDOBFormat.mockReturnValue(false);
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Date of Birth must be a valid date");
      });
    });

    test("should prevent submission when isValidDOBStrict returns false (invalid calendar date)", async () => {
      // Arrange
      validationHelpers.isValidDOBFormat.mockReturnValue(true);
      validationHelpers.isValidDOBStrict.mockReturnValue(false);
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, { dob: "2021-02-30" });
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Date of Birth must be a valid date");
      });
    });

    test("should prevent submission when isDOBNotFuture returns false", async () => {
      // Arrange
      validationHelpers.isValidDOBFormat.mockReturnValue(true);
      validationHelpers.isValidDOBStrict.mockReturnValue(true);
      validationHelpers.isDOBNotFuture.mockReturnValue(false);
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Date of Birth cannot be a future date");
      });
    });
  });

  describe("UX Tests", () => {
    it("should disable submit button while submitting", async () => {
      // Arrange
      axios.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { success: true } }), 500)),
      );

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {});
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => expect(getByText("REGISTER")).toBeDisabled());

      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      await waitFor(() => expect(getByText("REGISTER")).not.toBeDisabled());
    });
  });

  describe("Whitespace and lowercase Handling", () => {
    it("should trim whitespace from inputs before submission", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Act
      fillForm(getByPlaceholderText, {
        name: "  John Doe  ",
        email: "  TEST@example.com  ",
        password: "password123",
        phone: "  +1234567890  ",
        address: "  123 Street  ",
        dob: "2000-01-01",
        answer: "  Football  ",
      });
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
          name: "John Doe",
          email: "test@example.com",
          password: "password123",
          phone: "+1234567890",
          address: "123 Street",
          DOB: "2000-01-01",
          answer: "football",
        }),
      );
    });
  });

  describe("Input type and placeholder tests", () => {
    it("should have correct input types and placeholders", () => {
      // Arrange & Act
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      expect(getByPlaceholderText("Enter Your Name").type).toBe("text");
      expect(getByPlaceholderText("Enter Your Email").type).toBe("email");
      expect(getByPlaceholderText("Enter Your Password").type).toBe("password");
      expect(getByPlaceholderText("Enter Your Phone").type).toBe("text");
      expect(getByPlaceholderText("Enter Your Address").type).toBe("text");
      expect(getByPlaceholderText("Enter Your DOB").type).toBe("date");
      expect(getByPlaceholderText("What is Your Favorite sports").type).toBe(
        "text",
      );
    });
  });

  describe("Layout Title", () => {
    it("should set the document title to 'Register - Ecommerce App'", async () => {
      // Arrange & Act
      render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      const layout = document.querySelector("[data-testid='layout-mock']");
      expect(layout).toHaveAttribute("data-title", "Register - Ecommerce App");
    });
  });
});
