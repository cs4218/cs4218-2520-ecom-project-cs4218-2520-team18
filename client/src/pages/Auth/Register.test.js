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
      ["invalid-email", "Invalid Email", "email"],
      ["", "Name should be 1 to 100 characters", "name"],
      ["123", "Password must be at least 6 characters long", "password"],
      ["invalid-phone", "Phone number must be in E.164 format", "phone"],
      ["invalid-dob", "Date of Birth must be a valid date", "dob"],
      ["", "Answer is required", "answer"],
    ])(
      "should prevent submission for invalid %s - %s",
      async (invalidValue, expectedError, fieldType) => {
        // Arrange
        axios.get.mockResolvedValueOnce({ data: { category: [] } });
        
        const { getByText, getByPlaceholderText } = render(
          <MemoryRouter initialEntries={["/register"]}>
            <Routes>
              <Route path="/register" element={<Register />} />
            </Routes>
          </MemoryRouter>,
        );

        // Act
        const formData = {
          name: "John Doe",
          email: "test@example.com",
          password: "password123",
          phone: "+1234567890",
          address: "123 Street",
          dob: "2000-01-01",
          answer: "Football",
        };

        formData[fieldType] = invalidValue;
        fillForm(getByPlaceholderText, formData);
        fireEvent.click(getByText("REGISTER"));

        // Assert
        await waitFor(() => {
          expect(axios.post).not.toHaveBeenCalled();
          expect(toast.error).toHaveBeenCalledWith(expectedError);
        });
      }
    );

    it("should prevent submission for non-existent DOB (e.g., Feb 30)", async () => {
      // Arrange
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
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "+1234567890",
        address: "123 Street",
        dob: "2021-02-30",
        answer: "Football",
      });
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Date of Birth must be a valid date",
        );
      });
    });

    it("should prevent submission for future DOB", async () => {
      // Arrange
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDOB = futureDate.toISOString().split("T")[0];

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
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "+1234567890",
        address: "123 Street",
        dob: futureDOB,
        answer: "Football",
      });
      fireEvent.click(getByText("REGISTER"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "Date of Birth cannot be a future date",
        );
      });
    });
  });

  describe("Email Validation - EP & BVA", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["valid@example.com", true, "Valid"],
        ["test@mail.example.co.uk", true, "Valid subdomain"],
        ["test.user+123@example.com", true, "Valid special chars"],
        ["plainaddress", false, "Missing @"],
        ["@missingusername.com", false, "Missing local"],
        ["username@.com", false, "Missing domain"],
        ["username@com", false, "Invalid format"],
      ])(
        "should validate email %p correctly (%s)",
        async (email, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: email,
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith("Invalid Email");
            }
          });
        },
      );
    });

    describe("BVA - Edge Cases", () => {
      test.each([
        ["username@domain..com", false, "Double dots"],
        ["#$%^&*()@example.com", false, "Invalid chars"],
        ["email@example@example.com", false, "Multiple @"],
        ["", false, "Empty"],
      ])(
        "should validate email %p correctly (%s)",
        async (email, shouldSucceed, description) => {
          // Arrange
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
            name: "John Doe",
            email: email,
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            expect(axios.post).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Invalid Email");
          });
        },
      );
    });
  });

  describe("Name Validation - EP & BVA", () => {
    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["John Doe", true, "Valid"],
        ["John Michael Smith", true, "Valid multi-word"],
        ["José García", true, "Valid with accents"],
        ["Mary-Jane", true, "Valid with hyphen"],
        ["O'Brien", true, "Valid with apostrophe"],
      ])(
        "should validate name %p correctly (%s)",
        async (name, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: name,
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
            }
          });
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["A", true, "At minimum boundary (1 char)"],
        ["", false, "Below minimum boundary (0 chars)"],
        ["A".repeat(100), true, "At maximum boundary (100 chars)"],
        ["A".repeat(101), false, "Above maximum boundary (101 chars)"],
      ])(
        "should validate name %p correctly (%s)",
        async (name, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: name,
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith("Name should be 1 to 100 characters");
            }
          });
        },
      );
    });

    describe("BVA - Edge Cases", () => {
      test.each([
        ["  ", false, "Spaces only"],
      ])(
        "should validate name %p correctly (%s)",
        async (name, shouldSucceed, description) => {
          // Arrange
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
            name: name,
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            expect(axios.post).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith("Name should be 1 to 100 characters");
          });
        },
      );
    });
  });

  describe("Password Validation - EP & BVA", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["12345678", true, "Valid"],
        ["P@ssw0rd!", true, "Special chars"],
      ])(
        "should validate password %p correctly (%s)",
        async (password, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: password,
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Password must be at least 6 characters long",
              );
            }
          });
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["123456", true, "At minimum boundary"],
        ["12345", false, "Below minimum boundary"],
      ])(
        "should validate password %p correctly (%s)",
        async (password, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: password,
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Password must be at least 6 characters long",
              );
            }
          });
        },
      );
    });

    describe("BVA - Edge Cases", () => {
      test.each([
        ["a".repeat(1000), true, "Very long"],
        ["  pass123  ", true, "Spaces preserved"],
        ["", false, "Empty"],
      ])(
        "should validate password %p correctly (%s)",
        async (password, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: password,
            phone: "+1234567890",
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Password must be at least 6 characters long",
              );
            }
          });
        },
      );
    });
  });

  describe("Phone Validation - EP & BVA", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["+14155552671", true, "Valid"],
        ["14155552671", true, "Valid numeric"],
        ["+012345678", false, "Invalid leading zero"],
      ])(
        "should validate phone %p correctly (%s)",
        async (phone, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: "password123",
            phone: phone,
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Phone number must be in E.164 format",
              );
            }
          });
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["+", false, "Minimal invalid"],
        ["+12", true, "Lower boundary"],
        ["12", true, "Lower boundary"],
        ["123", true, "Just above minimum"],
        ["+123", true, "Just above minimum"],
        ["1", false, "Below minimum boundary"],
        ["+1", false, "Below minimum boundary"],
        ["2".repeat(14), true, "Just below maximum"],
        ["+" + "2".repeat(14), true, "Just below maximum"],
        ["1" + "2".repeat(14), true, "At maximum boundary"],
        ["+" + "1" + "2".repeat(14), true, "At maximum boundary"],
        ["1" + "2".repeat(15), false, "Above maximum boundary"],
      ])(
        "should validate phone %p correctly (%s)",
        async (phone, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: "password123",
            phone: phone,
            address: "123 Street",
            dob: "2000-01-01",
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Phone number must be in E.164 format",
              );
            }
          });
        },
      );
    });
  });

  describe("DOB Validation - EP & BVA", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["2023-01-01", true, "Valid format"],
        ["1990-12-31", true, "Valid"],
        ["2023-02-30", false, "Invalid day for month"],
      ])(
        "should validate DOB %p correctly (%s)",
        async (dob, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: dob,
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Date of Birth must be a valid date",
              );
            }
          });
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["2023-13-32", false, "Above range"],
        ["2000-00-01", false, "Below range"],
      ])(
        "should validate DOB %p correctly (%s)",
        async (dob, shouldSucceed, description) => {
          // Arrange
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
            name: "John Doe",
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: dob,
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            expect(axios.post).not.toHaveBeenCalled();
            expect(toast.error).toHaveBeenCalledWith(
              "Date of Birth must be a valid date",
            );
          });
        },
      );
    });

    describe("BVA - Edge Cases", () => {
      test.each([
        ["1900-01-01", true, "Very old date"],
        ["2020-02-29", true, "Leap year Feb 29"],
        ["01-01-2023", false, "Wrong format"],
        ["2023/01/01", false, "Wrong separator"],
        ["23-01-01", false, "Invalid format"],
        [" 2023-01-01", false, "Leading whitespace"],
        ["2023-01-01 ", false, "Trailing whitespace"],
        ["a2023-01-01", false, "Invalid chars"],
        ["2021-02-29", false, "Invalid leap year"],
        ["2000-01-01 12:00:00", false, "Timestamp"],
      ])(
        "should validate DOB %p correctly (%s)",
        async (dob, shouldSucceed, description) => {
          // Arrange
          axios.get.mockResolvedValueOnce({ data: { category: [] } });
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({ data: { success: true } });
          }

          const { getByText, getByPlaceholderText } = render(
            <MemoryRouter initialEntries={["/register"]}>
              <Routes>
                <Route path="/register" element={<Register />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fillForm(getByPlaceholderText, {
            name: "John Doe",
            email: "test@example.com",
            password: "password123",
            phone: "+1234567890",
            address: "123 Street",
            dob: dob,
            answer: "Football",
          });
          fireEvent.click(getByText("REGISTER"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "Date of Birth must be a valid date",
              );
            }
          });
        },
      );
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
