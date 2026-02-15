import JWT from "jsonwebtoken";
import { comparePassword } from "../helpers/authHelper.js";
import { validateEmail } from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";
import { loginController } from "./loginController.js";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("../helpers/validationHelper.js");
jest.mock("jsonwebtoken");

describe("loginController Comprehensive Unit Tests", () => {
  let req, res;
  const originalEnv = process.env;

  const setupMockUser = (overrides = {}) => {
    const mockUser = {
      _id: "mock_id_123",
      name: "Test User",
      email: "test@example.com",
      password: "hashed_password_abc",
      phone: "+1234567890",
      address: "123 Test St",
      DOB: "2000-01-01",
      role: 0,
      answer: "mock_secret_answer",
      ...overrides,
    };
    userModel.findOne.mockResolvedValue(mockUser);
    return mockUser;
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: "test_secret_key" };

    req = {
      body: {
        email: "test@example.com",
        password: "password123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
    validateEmail.mockReturnValue(true);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Input Validation & Normalization", () => {
    test.each([
      ["email", "", "Invalid Email or Password"],
      ["email", " ", "Invalid Email or Password"],
      ["password", "", "Invalid Email or Password"],
    ])("should return 400 if %s is missing", async (field, value) => {
      // Arrange
      req.body[field] = value;

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should normalize email (trim/lowercase) before querying database", async () => {
      // Arrange
      req.body.email = "  USER@Example.Com  ";
      setupMockUser({ email: "user@example.com" });
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("token");

      // Act
      await loginController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "user@example.com" });
    });

    test("should return 400 if validateEmail helper returns false", async () => {
      // Arrange
      setupMockUser();
      comparePassword.mockResolvedValue(true);
      validateEmail.mockReturnValue(false); // Simulate format error

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Email or Password" })
      );
    });
  });

  describe("Authentication Logic", () => {
    test("should return 400 if user does not exist", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 400 if password comparison fails", async () => {
      // Arrange
      setupMockUser();
      comparePassword.mockResolvedValue(false);

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test("should return 200 and JWT on successful login", async () => {
      // Arrange
      const mockUser = setupMockUser();
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("valid_token");

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: "valid_token",
          user: expect.objectContaining({ email: mockUser.email })
        })
      );
    });
  });

  describe("Security Check", () => {
    test("should never include password or answer in the response", async () => {
      // Arrange
      setupMockUser();
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("token");

      // Act
      await loginController(req, res);

      // Assert
      const responseData = res.send.mock.calls[0][0];
      expect(responseData.user).not.toHaveProperty("password");
      expect(responseData.user).not.toHaveProperty("answer");
    });
  });

  describe("System Error Handling", () => {
    let consoleSpy;
    beforeEach(() => { 
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {}); 
    });
    afterEach(() => consoleSpy.mockRestore());

    test("should handle database failures", async () => {
      // Arrange
      userModel.findOne.mockRejectedValue(new Error("DB Error"));

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should handle JWT signing errors", async () => {
      // Arrange
      setupMockUser();
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockImplementation(() => { throw new Error("JWT Error"); });

      // Act
      await loginController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});