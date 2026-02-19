// Loh Ze Qing Norbert, A0277473R

import { updateProfileController } from "./userController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

jest.mock("../models/userModel.js");
jest.mock("../helpers/authHelper.js");

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

describe("updateProfileController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { _id: "user123" },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should update user profile successfully with all fields", async () => {
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      // Email and answer should not be updated
      const updatedUserData = {
        _id: "user123",
        name: "Updated Name",
        email: "old@example.com",
        phone: "+12345678900",
        DOB: "2000-01-02",
        address: "456 New St",
        password: "newhashedpassword",
      };
      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = {
        name: "Updated Name",
        password: "newpassword123",
        phone: "+1234567890",
        DOB: "2000-01-02",
        address: "456 New St",
      };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Updated Name",
          password: "newhashedpassword",
          phone: "+1234567890",
          DOB: "2000-01-02",
          address: "456 New St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    it("should update user profile successfully with only name field", async () => {
      const existingUser = {
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      };

      // Email and answer should not be updated
      const updatedUserData = { ...existingUser, name: "Updated Name" };
      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = { name: "Updated Name" };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Updated Name",
          password: "oldhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    it("should update user profile successfully with only password field", async () => {
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
        ...existingUser,
        password: "newhashedpassword",
      };

      req.body = { password: "newpassword123" };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      const { password, ...updatedUserDataSensitive } = updatedUserData;

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).toHaveBeenCalledWith("newpassword123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Old Name",
          password: "newhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    describe("should accept valid phone numbers and update profile", () => {
      const validPhones = ["123456789012345", "+11234567890"];
      test.each(validPhones)(
        "should update profile with valid phone number: %s",
        async (phone) => {
          const existingUser = {
            _id: "user123",
            name: "Old Name",
            email: "old@example.com",
            phone: "+0987654321",
            DOB: "2000-01-01",
            address: "123 Old St",
            password: "oldhashedpassword",
          };

          const updatedUserData = { ...existingUser, phone };

          const { password, ...updatedUserDataSensitive } = updatedUserData;

          req.body = { phone };

          userModel.findById.mockResolvedValue(existingUser);
          userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

          await updateProfileController(req, res);

          expect(userModel.findById).toHaveBeenCalledWith("user123");
          expect(hashPassword).not.toHaveBeenCalled();
          expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "user123",
            {
              name: "Old Name",
              password: "oldhashedpassword",
              phone: phone,
              DOB: "2000-01-01",
              address: "123 Old St",
            },
            { new: true },
          );
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Profile Updated Successfully",
            updatedUser: updatedUserDataSensitive,
          });
        },
      );
    });

    it("should update user profile successfully with only address field", async () => {
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
        ...existingUser,
        address: "456 New St",
      };

      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = { address: "456 New St" };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Old Name",
          password: "oldhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "456 New St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    it("should update user profile successfully with only DOB field", async () => {
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
        ...existingUser,
        DOB: "2000-01-02",
      };

      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = { DOB: "2000-01-02" };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).not.toHaveBeenCalled();
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Old Name",
          password: "oldhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-02",
          address: "123 Old St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    it("should not update email even if provided in request body", async () => {
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
        ...existingUser,
        name: "Updated Name",
      };

      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = {
        name: "Updated Name",
        email: "newemail@example.com", // Attempting to change email
      };

      userModel.findById.mockResolvedValue(existingUser);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      // Verify that email was NOT included in the update
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Updated Name",
          password: "oldhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          // Note: NO email field here
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
      // Verify the returned user still has the old email
      expect(updatedUserDataSensitive.email).toBe("old@example.com");
    });
  });

  describe("Empty Fields", () => {
    it("should return error 400 if name is empty string", async () => {
      req.body.name = "";

      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Existing Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name cannot be empty",
      });
    });

    it("should return error 400 if phone is empty string", async () => {
      req.body.phone = "";

      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Existing Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Phone cannot be empty",
      });
    });

    it("should return error 400 if address is empty string", async () => {
      req.body.address = "";

      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Existing Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Address cannot be empty",
      });
    });

    it("should return error 400 if DOB is empty string", async () => {
      req.body.DOB = "";

      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Existing Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "DOB cannot be empty",
      });
    });

    it("should return error 400 if password is empty string", async () => {
      req.body.password = "";

      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Existing Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password cannot be empty",
      });
    });
  });

  describe("Input Validation", () => {
    it("should return error if password is less than 6 characters", async () => {
      req.body = {
        password: "12345",
      };

      await updateProfileController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    });

    it("should return error if password is exactly 6 characters", async () => {
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
        ...existingUser,
        password: "newhashedpassword",
      };

      const { password, ...updatedUserDataSensitive } = updatedUserData;

      req.body = { password: "123456" };

      userModel.findById.mockResolvedValue(existingUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

      await updateProfileController(req, res);

      expect(userModel.findById).toHaveBeenCalledWith("user123");
      expect(hashPassword).toHaveBeenCalledWith("123456");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "user123",
        {
          name: "Old Name",
          password: "newhashedpassword",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
        },
        { new: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updatedUserDataSensitive,
      });
    });

    describe("Phone number validation edge cases", () => {
      const invalidPhones = [
        "abcdefghij",
        "123-456-7890",
        "(123) 456-7890",
        "+1 (123) 456-7890",
        "123.456.7890",
        "123 456 7890",
        "!@#$%^&*()",
      ];

      test.each(invalidPhones)(
        "should return error for invalid phone number: %s",
        async (phone) => {
          req.body = { phone };

          await updateProfileController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid Phone Number",
          });
        },
      );
    });

    describe("DOB validation edge cases", () => {
      const invalidDOBs = ["invalid-date"];

      test.each(invalidDOBs)(
        "should return error for invalid DOB: %s",
        async (DOB) => {
          req.body = { DOB };
          await updateProfileController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid DOB format. Please use YYYY-MM-DD",
          });
          expect(userModel.findById).not.toHaveBeenCalled();
        },
      );

      test("should return error if DOB is in the future", async () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        req.body = { DOB: futureDate.toISOString().split("T")[0] };
        await updateProfileController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid or future DOB",
        });
        expect(userModel.findById).not.toHaveBeenCalled();
      });
    });

    describe("Whitespace handling", () => {
      it("should trim whitespace from name", async () => {
        const existingUser = {
          _id: "user123",
          name: "Old Name",
          email: "old@example.com",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          password: "oldhashedpassword",
        };

        const updatedUserData = { ...existingUser, name: "New Name" };
        const { password, ...updatedUserDataSensitive } = updatedUserData;

        req.body = { name: "   New Name   " };

        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

        await updateProfileController(req, res);

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "user123",
          {
            name: "New Name",
            password: "oldhashedpassword",
            phone: "+0987654321",
            DOB: "2000-01-01",
            address: "123 Old St",
          },
          { new: true },
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: updatedUserDataSensitive,
        });
      });

      it("should trim whitespace from address", async () => {
        const existingUser = {
          _id: "user123",
          name: "Old Name",
          email: "old@example.com",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          password: "oldhashedpassword",
        };

        const updatedUserData = { ...existingUser, address: "456 New St" };
        const { password, ...updatedUserDataSensitive } = updatedUserData;

        req.body = { address: "   456 New St   " };

        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

        await updateProfileController(req, res);

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "user123",
          {
            name: "Old Name",
            password: "oldhashedpassword",
            phone: "+0987654321",
            DOB: "2000-01-01",
            address: "456 New St",
          },
          { new: true },
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: updatedUserDataSensitive,
        });
      });

      it("should trim whitespace from phone", async () => {
        const existingUser = {
          _id: "user123",
          name: "Old Name",
          email: "old@example.com",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          password: "oldhashedpassword",
        };

        const updatedUserData = { ...existingUser, phone: "+1234567890" };
        const { password, ...updatedUserDataSensitive } = updatedUserData;

        req.body = { phone: "   +1234567890   " };
        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

        await updateProfileController(req, res);

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "user123",
          {
            name: "Old Name",
            password: "oldhashedpassword",
            phone: "+1234567890",
            DOB: "2000-01-01",
            address: "123 Old St",
          },
          { new: true },
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: updatedUserDataSensitive,
        });
      });

      it("should trim whitespace from DOB", async () => {
        const existingUser = {
          _id: "user123",
          name: "Old Name",
          email: "old@example.com",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          password: "oldhashedpassword",
        };

        const updatedUserData = { ...existingUser, DOB: "1990-12-31" };
        const { password, ...updatedUserDataSensitive } = updatedUserData;

        req.body = { DOB: "   1990-12-31   " };

        userModel.findById.mockResolvedValue(existingUser);
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

        await updateProfileController(req, res);

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "user123",
          {
            name: "Old Name",
            password: "oldhashedpassword",
            phone: "+0987654321",
            DOB: "1990-12-31",
            address: "123 Old St",
          },
          { new: true },
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: updatedUserDataSensitive,
        });
      });

      it('should not trim whitespace from password', async () => {
        const existingUser = {
          _id: "user123",
          name: "Old Name",
          email: "old@example.com",
          phone: "+0987654321",
          DOB: "2000-01-01",
          address: "123 Old St",
          password: "oldhashedpassword",
        };

        const updatedUserData = { ...existingUser, password: "newhashedpasswordWithSpaces" };
        const { password, ...updatedUserDataSensitive } = updatedUserData;

        req.body = { password: "   newpassword123   " };

        userModel.findById.mockResolvedValue(existingUser);
        hashPassword.mockResolvedValue("newhashedpasswordWithSpaces");
        userModel.findByIdAndUpdate.mockResolvedValue(updatedUserData);

        await updateProfileController(req, res);

        expect(userModel.findById).toHaveBeenCalledWith("user123");
        // Verify hashPassword was called with the password INCLUDING whitespace
        expect(hashPassword).toHaveBeenCalledWith("   newpassword123   ");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          "user123",
          {
            name: "Old Name",
            password: "newhashedpasswordWithSpaces", // The HASHED result, not the raw password
            phone: "+0987654321",
            DOB: "2000-01-01",
            address: "123 Old St",
          },
          { new: true },
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          message: "Profile Updated Successfully",
          updatedUser: updatedUserDataSensitive,
        });
      });
    });
  });

  describe("Robustness Tests", () => {
    it("should return error 400 if request body is empty", async () => {
      req.body = {};
      userModel.findById.mockResolvedValue({
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });
      userModel.findByIdAndUpdate.mockResolvedValue({
        _id: "user123",
        name: "Old Name",
        email: "old@example.com",
        phone: "+0987654321",
        DOB: "2000-01-01",
        address: "123 Old St",
        password: "oldhashedpassword",
      });

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Request body is empty",
      });
    });

    describe("Null and Undefined Field Validation", () => {
      const fields = ["name", "phone", "DOB", "address", "password"];
      fields.forEach((field) => {
        it(`should return error 400 if ${field} is null`, async () => {
          req.body = { [field]: null };

          await updateProfileController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: `Invalid input. ${field} cannot be null.`,
          });
        });
      });
    });
  });

  describe("Error Handling Tests", () => {
    it("should return error 500 if database error occurs", async () => {
      const error = new Error("Database error");
      req.body = { name: "Updated Name" }; // Need non-empty body to pass initial validation
      userModel.findById.mockRejectedValue(error);

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating profile",
        error: error,
      });
    });

    describe("Error Logging Tests", () => {
      it("should log error if database error occurs", async () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        const error = new Error("Database error");
        req.body = { name: "Updated Name" }; // Need non-empty body to pass initial validation
        userModel.findById.mockRejectedValue(error);

        await updateProfileController(req, res);

        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should return error 400 if user does not exist", async () => {
      req.body = { name: "Updated Name" }; // Need non-empty body to pass initial validation
      userModel.findById.mockResolvedValue(null);

      await updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "User not found",
      });
    });
  });
});


