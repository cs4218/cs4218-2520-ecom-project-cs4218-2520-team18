// Loh Ze Qing Norbert, A0277473R

import { updateProfileController } from "./userController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";
import {
  validatePhoneE164,
  validatePassword,
  validateDOB,
  validateDOBNotFuture,
} from "../helpers/validationHelper.js";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("../helpers/validationHelper.js");

describe("updateProfileController Comprehensive Unit Tests", () => {
  let req, res;

  beforeEach(() => {
    // Arrange - Reset request and response objects
    req = {
      user: { _id: "user123" },
      body: {
        name: "Updated User",
        password: "password123",
        phone: "+1234567890",
        DOB: "2000-01-01",
        address: "123 Updated St",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();

    // Default validation helpers to return true (Happy Path default)
    validatePhoneE164.mockReturnValue(true);
    validatePassword.mockReturnValue(true);
    validateDOB.mockReturnValue(true);
    validateDOBNotFuture.mockReturnValue(true);
  });

  describe("Empty Request Body", () => {
    test("should return 400 if request body is empty", async () => {
      // Arrange
      req.body = {};

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "Request body is empty" })
      );
    });
  });

  describe("Null Field Validation", () => {
    test.each([
      ["name", "Name cannot be null"],
      ["password", "Password cannot be null"],
      ["phone", "Phone cannot be null"],
      ["address", "Address cannot be null"],
      ["DOB", "DOB cannot be null"],
    ])(
      "should return 400 if %s is null",
      async (field, _message) => {
        // Arrange
        req.body = { [field]: null };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: `Invalid input. ${field} cannot be null.`,
          })
        );
      }
    );
  });

  describe("Required Field Validation & Trimming", () => {
    test.each([
      ["name", "", "Name cannot be empty"],
      ["password", "", "Password cannot be empty"],
      ["phone", "", "Phone cannot be empty"],
      ["address", "", "Address cannot be empty"],
      ["DOB", "", "DOB cannot be empty"],
      ["name", " ", "Name cannot be empty"],
      ["phone", " ", "Phone cannot be empty"],
      ["address", " ", "Address cannot be empty"],
      ["DOB", " ", "DOB cannot be empty"],
    ])(
      "should return 400 if %s is '%s'",
      async (field, value, _message) => {
        // Arrange
        req.body = { [field]: value };

        // Act
        await updateProfileController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: _message,
          })
        );
      }
    );
  });

  describe("Format Validation Logic (Mocked Helpers)", () => {
    test("should return 400 if validatePassword returns false", async () => {
      // Arrange
      validatePassword.mockReturnValue(false);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Password must be at least 6 characters long",
        })
      );
    });

    test("should return 400 if validatePhoneE164 returns false", async () => {
      // Arrange
      validatePhoneE164.mockReturnValue(false);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Phone Number" })
      );
    });

    test("should return 400 if validateDOB returns false", async () => {
      // Arrange
      validateDOB.mockReturnValue(false);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid DOB format. Please use YYYY-MM-DD",
        })
      );
    });

    test("should return 400 if validateDOBNotFuture returns false", async () => {
      // Arrange
      validateDOBNotFuture.mockReturnValue(false);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or future DOB" })
      );
    });
  });

  describe("Update Profile Logic & Security", () => {
    test("should return 404 if user does not exist", async () => {
      // Arrange
      userModel.findById.mockResolvedValue(null);
      req.body = { name: "Updated Name" };

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "User not found" })
      );
    });

    test("should successfully update user profile with all fields (Happy Path)", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      const updatedUserData = {
        _id: "user123",
        name: "Updated User",
        email: "old@example.com",
        phone: "+1234567890",
        DOB: "2000-01-01",
        address: "123 Updated St",
        password: "newhashedpassword",
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        expect.objectContaining({
          name: "Updated User",
          password: "newhashedpassword",
          phone: "+1234567890",
          DOB: "2000-01-01",
          address: "123 Updated St",
        }),
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile Updated Successfully",
        })
      );

      // Verify password is not included in response
      const responseData = res.send.mock.calls[0][0];
      expect(responseData.updatedUser.password).toBeUndefined();
    });

    test("should successfully update only name field (partial update)", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      const updatedUserData = { ...existingUser, name: "Updated User" };

      req.body = { name: "Updated User" };
      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should not update email even if provided in request body", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      const updatedUserData = { ...existingUser, name: "Updated User" };

      req.body = {
        name: "Updated User",
        email: "newemail@example.com", // Attempting to change email
      };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      // Act
      await updateProfileController(req, res);

      // Assert
      const callArgs = userModel.findByIdAndUpdate.mock.calls[0][1];
      expect(callArgs.email).toBeUndefined();
    });
  });

  describe("Normalization & Data Integrity", () => {
    test("should trim all input fields before validation (except password)", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      req.body = {
        name: "  Updated User  ",
        phone: "  +1234567890  ",
        address: "  123 Updated St  ",
        DOB: "  2000-01-01  ",
      };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(existingUser);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(validatePhoneE164).toHaveBeenCalledWith("+1234567890");
      expect(validateDOB).toHaveBeenCalledWith("2000-01-01");
    });

    test("should not trim password field", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      req.body = { password: "  password123  " };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("hashed");
      userModel.findByIdAndUpdate.mockResolvedValue(existingUser);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("  password123  ");
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

    test("should handle database lookup failures gracefully", async () => {
      // Arrange
      const error = new Error("DB Error");
      req.body = { name: "Updated Name" };
      userModel.findById.mockRejectedValue(error);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should handle hashing failures", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      const error = new Error("Hash Fail");
      req.body = { password: "newpassword123" };
      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockRejectedValue(error);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating profile",
        })
      );
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    test("should handle database update failures", async () => {
      // Arrange
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      const error = new Error("Update Error");
      req.body = { name: "Updated Name" };
      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockRejectedValue(error);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});


