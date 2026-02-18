import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

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

  describe("Error Handling", () => {
    let consoleErrorSpy;
    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
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
      axios.post.mockRejectedValue({});
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
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "An unexpected error occurred",
        );
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });

  describe("Input Validation", () => {
    it("should show error if email is empty", async () => {
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
        target: { value: "" },
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
        expect(toast.error).toHaveBeenCalledWith("Email is required");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("should show error if answer is empty", async () => {
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
        target: { value: "" },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "newpassword123" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("Security answer is required");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("should show error if new password is empty", async () => {
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
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith("New password is required");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("should trim and lowercase inputs before submission", async () => {
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
      // Email and answer should be trimmed and lowercased
      fireEvent.change(getByPlaceholderText("Enter Your Email"), {
        target: { value: "  TEST@gmail.com  " },
      });
      fireEvent.change(getByPlaceholderText("Enter Your Security Answer"), {
        target: { value: "  Test Answer  " },
      });
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "  NEWpassword123  " },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/auth/forgot-password",
          {
            email: "test@gmail.com",
            answer: "test answer",
            newPassword: "  NEWpassword123  ",
          },
        );
      });
    });

    it("should prevent submission for invalid email format", async () => {
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
        target: { value: "invalid-email-format" },
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
        expect(toast.error).toHaveBeenCalledWith("Invalid email format");
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it("should prevent submission for a 5 characters new password", async () => {
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
      fireEvent.change(getByPlaceholderText("Enter Your New Password"), {
        target: { value: "short" },
      });
      fireEvent.click(getByText("RESET PASSWORD"));

      // Assert
      await waitFor(() => {
        expect(axios.post).not.toHaveBeenCalled();
        expect(toast.error).toHaveBeenCalledWith(
          "New password must be at least 6 characters long",
        );
        expect(mockNavigate).not.toHaveBeenCalled();
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
        async (email, shouldSucceed, _description) => {
          // Arrange
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({
              data: { success: true, message: "Password reset successful" },
            });
          }

          const { getByPlaceholderText, getByText } = render(
            <MemoryRouter initialEntries={["/forgot-password"]}>
              <Routes>
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Routes>
            </MemoryRouter>,
          );

          // Act
          fireEvent.change(getByPlaceholderText("Enter Your Email"), {
            target: { value: email },
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
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith("Invalid email format");
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
        async (email, _shouldSucceed, _description) => {
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
            target: { value: email },
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
            expect(toast.error).toHaveBeenCalled();
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
        ["newpassword123", true, "Valid"],
        ["P@ssw0rd!", true, "Special chars"],
      ])(
        "should validate password %p correctly (%s)",
        async (password, shouldSucceed, _description) => {
          // Arrange
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({
              data: { success: true, message: "Password reset successful" },
            });
          }

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
            target: { value: password },
          });
          fireEvent.click(getByText("RESET PASSWORD"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "New password must be at least 6 characters long",
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
        async (password, shouldSucceed, _description) => {
          // Arrange
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({
              data: { success: true, message: "Password reset successful" },
            });
          }

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
            target: { value: password },
          });
          fireEvent.click(getByText("RESET PASSWORD"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalledWith(
                "New password must be at least 6 characters long",
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
        async (password, shouldSucceed, _description) => {
          // Arrange
          if (shouldSucceed) {
            axios.post.mockResolvedValueOnce({
              data: { success: true, message: "Password reset successful" },
            });
          }

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
            target: { value: password },
          });
          fireEvent.click(getByText("RESET PASSWORD"));

          // Assert
          await waitFor(() => {
            if (shouldSucceed) {
              expect(axios.post).toHaveBeenCalled();
            } else {
              expect(axios.post).not.toHaveBeenCalled();
              expect(toast.error).toHaveBeenCalled();
            }
          });
        },
      );
    });
  });

  describe("Input type and placeholder attributes", () => {
    it("should have correct input types and placeholders", () => {
      // Arrange & Act
      const { getByPlaceholderText } = render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      const emailInput = getByPlaceholderText("Enter Your Email");
      const answerInput = getByPlaceholderText("Enter Your Security Answer");
      const newPasswordInput = getByPlaceholderText("Enter Your New Password");
      expect(emailInput).toHaveAttribute("type", "email");
      expect(answerInput).toHaveAttribute("type", "text");
      expect(newPasswordInput).toHaveAttribute("type", "password");
    });
  });

  describe("UX Tests", () => {
    it("should disable the reset button while submitting", async () => {
      // Arrange
      axios.post.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve({ data: { success: true } }), 500)),
      );

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
      const resetButton = getByText("RESET PASSWORD");
      fireEvent.click(resetButton);

      // Assert
      expect(resetButton).toBeDisabled();

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(resetButton).not.toBeDisabled();
      });
    });
  });

  describe("Layout Title", () => {
    it("should set the document title to 'Forgot Password - Ecommerce App'", () => {
      render(
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <Routes>
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </MemoryRouter>,
      );
      const layout = document.querySelector("[data-testid='layout-mock']");
      expect(layout).toHaveAttribute("data-title", "Forgot Password - Ecommerce App");
    });
  });
});
