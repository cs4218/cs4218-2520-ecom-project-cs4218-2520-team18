// Loh Ze Qing Norbert, A0277473R

import userModel from "../models/userModel.js";
import { forgotPasswordController } from "./forgotPasswordController.js";
import { hashPassword } from "../helpers/authHelper.js";
import { validateEmail, validatePassword } from "../helpers/validationHelper.js";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("../helpers/validationHelper.js");

describe("forgotPasswordController Comprehensive Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    // Arrange - Setup common request and response objects
    req = {
      body: {
        email: "test@example.com",
        answer: "testanswer",
        newPassword: "newPassword123",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();

    // Default helpers to true (Happy Path)
    validateEmail.mockReturnValue(true);
    validatePassword.mockReturnValue(true);
  });

  describe("Field Existence & Trimming", () => {
    test.each([
      ["email", "", "Email is required"],
      ["email", "  ", "Email is required"],
      ["email", undefined, "Email is required"],
      ["answer", "", "Answer is required"],
      ["answer", "  ", "Answer is required"],
      ["answer", undefined, "Answer is required"],
      ["newPassword", "", "New password is required"],
    ])("should return 400 if %s is %p", async (field, value, message) => {
      // Arrange
      if (value === undefined) delete req.body[field];
      else req.body[field] = value;

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message })
      );

      expect(userModel.findOne).not.toHaveBeenCalled();
      expect(hashPassword).not.toHaveBeenCalled();
    });
  });

  describe("Validation & Normalization", () => {
    test("should return 400 if validateEmail returns false", async () => {
      // Arrange
      validateEmail.mockReturnValue(false);

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Email or Answer" })
      );
    });

    test("should return 400 if validatePassword returns false", async () => {
      // Arrange
      validatePassword.mockReturnValue(false);

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "New password must be at least 6 characters long" })
      );
    });

    test("should normalize email and answer before database query", async () => {
      // Arrange
      req.body.email = "  USER@Example.Com  ";
      req.body.answer = "  MyAnswer  ";
      userModel.findOne.mockResolvedValue(null);

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "user@example.com",
        answer: "myanswer",
      });
    });
  });

  describe("Business Logic & Security", () => {
    test("should return 400 if user/answer combo not found (Security)", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Email or Answer" })
      );
      expect(hashPassword).not.toHaveBeenCalled();
    });

    test("should successfully reset password (Happy Path)", async () => {
      // Arrange
      const mockUser = { _id: "user123", email: "test@example.com" };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashed_new_pw");

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(userModel.findOne).toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith("newPassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("user123", {
        password: "hashed_new_pw",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password Reset Successfully",
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

    test("should handle database failures gracefully", async () => {
      // Arrange
      userModel.findOne.mockRejectedValue(new Error("DB Error"));

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in Forgot Password" })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should handle hashing failures", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ _id: "123" });
      hashPassword.mockRejectedValue(new Error("Hash Fail"));

      // Act
      await forgotPasswordController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Error in Forgot Password" })
      );
    });
  });
});