import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import Register from "./Register";

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

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout-mock" data-title={title}>{children}</div>
));

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

describe("Register Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should register the user successfully", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({ data: { category: [] } });

    const { getByText, getByPlaceholderText } = render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<Register />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });

    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(
      "Register Successfully, please login",
    );
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should display error message on failed registration", async () => {
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

    fireEvent.change(getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
      target: { value: "Football" },
    });

    fireEvent.click(getByText("REGISTER"));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(errorMessage);
  });

  describe("Input Handling", () => {
    it("should update state on input change", () => {
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

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
    it("should prevent submission for invalid email", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "invalid-email" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Invalid Email");
      });
    });

    it("should prevent submission for invalid name", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Name is required");
      });
    });

    it("should prevent submission for invalid password", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Password must be at least 6 characters long",
        );
      });
    });

    it("should prevent submission for invalid phone number", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "invalid-phone" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Phone number must be in E.164 format",
        );
      });
    });

    it("should prevent submission for invalid DOB", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "+1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "invalid-dob" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Date of Birth must be a valid date",
        );
      });
    });

    it("should prevent submission for non-existent DOB (e.g. Feb 30)", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "+1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      const dobInput = getByPlaceholderText("Enter Your DOB");
      Object.defineProperty(dobInput, 'value', { value: '2021-02-30', writable: true });
      fireEvent.change(dobInput, { target: { value: '2021-02-30' } });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Date of Birth must be a valid date",
        );
      });
    });

    it("should prevent submission for future DOB", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDOB = futureDate.toISOString().split("T")[0];

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "+1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: futureDOB },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Date of Birth cannot be a future date",
        );
      });
    });

    it("should prevent submission for empty answer", async () => {
      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "+1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Answer is required");
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle network error gracefully", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network Error"));
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // fill required fields so the form submits and triggers the network error
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });

      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Network Error");
    });

    it('should use default error message if no message is provided', async () => {
      axios.post.mockRejectedValueOnce(new Error());
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // fill required fields so the form submits and triggers the error
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });

    it("should log errors to console", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      axios.post.mockRejectedValueOnce(new Error("Test Error"));
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      // fill required fields so the form submits and triggers the error
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });

      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => expect(axios.post).toHaveBeenCalled());
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe("UX Tests", () => {
    it("should disable submit button while submitting", async () => {
      axios.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "John Doe" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "1234567890" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "123 Street" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "Football" },
      });
      fireEvent.click(getByText("REGISTER"));

      await waitFor(() => expect(getByText("REGISTER")).toBeDisabled());

      await waitFor(() => expect(axios.post).toHaveBeenCalled());

      await waitFor(() => expect(getByText("REGISTER")).not.toBeDisabled());
    });
  });

  describe("Whitespace and lowercase Handling", () => {
    it("should trim whitespace from inputs before submission", async () => {
      axios.post.mockResolvedValueOnce({ data: { success: true } });
      axios.get.mockResolvedValueOnce({ data: { category: [] } });

      const { getByText, getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(getByPlaceholderText("Enter Your Name"), {
        target: { value: "  John Doe  " },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "  TEST@example.com  " },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Password"), {
        target: { value: "password123" },
      }); // Password should not be trimmed
      fireEvent.change(getByPlaceholderText("Enter Your Phone"), {
        target: { value: "  +1234567890  " },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Address"), {
        target: { value: "  123 Street  " },
      });
      // date inputs in jsdom don't accept surrounding whitespace, provide trimmed value
      fireEvent.change(getByPlaceholderText("Enter Your DOB"), {
        target: { value: "2000-01-01" },
      });
      fireEvent.change(getByPlaceholderText("What is Your Favorite sports"), {
        target: { value: "  Football  " },
      });
      fireEvent.click(getByText("REGISTER"));

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
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
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
    it('should set the document title to "Register - Ecommerce App"', async () => {
      render(
        <MemoryRouter initialEntries={["/register"]}>
          <Routes>
            <Route path="/register" element={<Register />} />
          </Routes>
        </MemoryRouter>,
      );
      const layout = document.querySelector("[data-testid='layout-mock']");
      expect(layout).toHaveAttribute("data-title", "Register - Ecommerce App");
    });
  });
});
