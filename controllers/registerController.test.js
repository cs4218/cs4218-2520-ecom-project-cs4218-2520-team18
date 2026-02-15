import userModel from "../models/userModel.js";
import { registerController } from "./registerController.js";
import { hashPassword } from "../helpers/authHelper.js";
import {
  validateEmail,
  validatePhoneE164,
  validatePassword,
  validateDOB,
  validateDOBNotFuture,
} from "../helpers/validationHelper.js";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("../helpers/validationHelper.js");

describe("registerController Comprehensive Unit Tests", () => {
  let req, res;

  // Helper to mock the "new userModel().save()" pattern
  const setupMockUser = (data) => {
    const mockDoc = {
      ...data,
      _id: "mock_id_123",
      _doc: { ...data, _id: "mock_id_123" },
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    };
    userModel.mockImplementation(() => mockDoc);
    return mockDoc;
  };

  beforeEach(() => {
    // Arrange - Reset request and response objects
    req = {
      body: {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        phone: "+1234567890",
        DOB: "2000-01-01",
        address: "123 Test St",
        answer: "testanswer",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();

    // Default validation helpers to return true (Happy Path default)
    validateEmail.mockReturnValue(true);
    validatePhoneE164.mockReturnValue(true);
    validatePassword.mockReturnValue(true);
    validateDOB.mockReturnValue(true);
    validateDOBNotFuture.mockReturnValue(true);
  });

  describe("Required Field Validation & Trimming", () => {
    test.each([
      ["name", "", "Name is Required"],
      ["email", "", "Email is Required"],
      ["password", "", "Password is Required"],
      ["phone", "", "Phone no. is Required"],
      ["address", "", "Address is Required"],
      ["DOB", "", "DOB is Required"],
      ["answer", "", "Answer is Required"],
      ["name", " ", "Name is Required"], 
      ["email", " ", "Email is Required"],
      ["phone", " ", "Phone no. is Required"],
      ["address", " ", "Address is Required"],
      ["DOB", " ", "DOB is Required"],
      ["answer", " ", "Answer is Required"],
    ])(
      "should return 400 if %s is '%s'",
      async (field, value, message) => {
        // Arrange
        req.body[field] = value;

        // Act
        await registerController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message })
        );
      }
    );

    test("should handle missing fields in req.body (undefined values)", async () => {
      // Arrange
      delete req.body.name;

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Name is Required" })
      );
    });
  });

  describe("Format Validation Logic (Mocked Helpers)", () => {
    test("should return 400 if validateEmail returns false", async () => {
      // Arrange
      validateEmail.mockReturnValue(false);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Email Format" })
      );
    });

    test("should return 400 if validatePhoneE164 returns false", async () => {
      // Arrange
      validatePhoneE164.mockReturnValue(false);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Phone Number" })
      );
    });

    test("should return 400 if validatePassword returns false", async () => {
      // Arrange
      validatePassword.mockReturnValue(false);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Password must be at least 6 characters long",
        })
      );
    });

    test("should return 400 if name exceeds 100 characters", async () => {
      // Arrange
      req.body.name = "A".repeat(101);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Name must be less than 100 characters",
        })
      );
    });

    test("should return 400 if validateDOB returns false", async () => {
      // Arrange
      validateDOB.mockReturnValue(false);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid DOB or format. Please use YYYY-MM-DD",
        })
      );
    });

    test("should return 400 if validateDOBNotFuture returns false", async () => {
      // Arrange
      validateDOBNotFuture.mockReturnValue(false);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or future DOB" })
      );
    });
  });

  describe("Registration Logic & Security", () => {
    test("should return 200 if user email already exists", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ email: "test@example.com" });

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Already registered, please login",
        })
      );
    });

    test("should successfully register a new user (Happy Path)", async () => {
      // Arrange
      const hashedPassword = "hashed_password_123";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue(hashedPassword);
      
      const mockSavedDoc = setupMockUser({
        ...req.body,
        password: hashedPassword,
        email: req.body.email.toLowerCase(),
      });

      // Act
      await registerController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Registered Successfully",
          user: expect.objectContaining({
            email: "test@example.com",
            _id: "mock_id_123",
          }),
        })
      );

      // Verify Sensitive Data Exclusion
      const responseData = res.send.mock.calls[0][0];
      expect(responseData.user.password).toBeUndefined();
      expect(responseData.user.answer).toBeUndefined();
    });
  });

  describe("Normalization & Data Integrity", () => {
    test("should lowercase email and answer, but preserve name and address casing", async () => {
      // Arrange
      req.body.email = "  UPPER@example.com  ";
      req.body.answer = "  SECRET_Answer  ";
      req.body.name = "  John Doe  ";
      req.body.address = "  123 Test Street  ";
      
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed");
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "upper@example.com",
          answer: "secret_answer",
          name: "John Doe",
          address: "123 Test Street"
        })
      );
    });

    test("should ensure password case and whitespace are preserved", async () => {
      // Arrange
      req.body.password = "  Password123  ";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed");
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("  Password123  ");
    });

    test("should ensure trim is applied to all input fields before validation", async () => {
      // Arrange
      req.body = {
        name: "  Name  ",
        email: "  email@test.com  ",
        password: "password",
        phone: "  +12345678  ",
        DOB: "  2000-01-01  ",
        address: "  Address  ",
        answer: "  Answer  "
      };
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed");
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(validatePhoneE164).toHaveBeenCalledWith("+12345678");
      expect(validateDOB).toHaveBeenCalledWith("2000-01-01");
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Name",
          phone: "+12345678",
          DOB: "2000-01-01"
        })
      );
    });
  });

  describe("System Error Handling", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should handle database failures during lookup gracefully", async () => {
      // Arrange
      const error = new Error("DB Error");
      userModel.findOne.mockRejectedValue(error);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    test("should handle hashing failures", async () => {
      // Arrange
      const error = new Error("Hash Fail");
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockRejectedValue(error);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in Registration" })
      );
    });

    test("should handle database save failures", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed");
      const saveError = new Error("Save Error");
      userModel.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(saveError)
      }));

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(saveError);
    });
  });
});