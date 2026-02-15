import { hashPassword } from "../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import { forgotPasswordController } from "./forgotPasswordController.js";

jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe('forgotPasswordController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        answer: "testanswer",
        newPassword: "newpassword",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should reset password successfully with valid credentials', async () => {
      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        answer: "testanswer",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: req.body.email, answer: req.body.answer });
      expect(hashPassword).toHaveBeenCalledWith(req.body.newPassword);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(mockUser._id, {
        password: "newhashedpassword",
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

  describe('Validation Tests - Missing Fields', () => {
    it('should return error if email is empty', async () => {
      req.body.email = "";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email is required",
        })
      );
    });

    it('should return error if answer is empty', async () => {
      req.body.answer = "";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Answer is required",
        })
      );
    });

    it('should return error if new password is empty', async () => {
      req.body.newPassword = "";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "New password is required",
        })
      );
    });

    it('should return error if email is undefined', async () => {
      delete req.body.email;

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email is required",
        })
      );
    });

    it('should return error if answer is undefined', async () => {
      delete req.body.answer;

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Answer is required",
        })
      );
    });

    it('should return error if new password is undefined', async () => {
      delete req.body.newPassword;

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "New password is required",
        })
      );
    });
  });

  describe('Validation Tests - White-space Fields', () => {
    it('should return error if email is white-space', async () => {
      req.body.email = " ";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email is required",
        })
      );
    });

    it('should return error if answer is white-space', async () => {
      req.body.answer = " ";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Answer is required",
        })
      );
    });
  });

  describe('Validation Tests - Invalid Format', () => {
    describe('Invalid Email Format', () => {
      const invalidEmail = [
        "plainaddress",
        "@missingusername.com",
        "username@.com",
        "username@com",
        "username@domain..com",
        "#$%^&*()@example.com",
        "Joe Smith <email@example.com>",
        "email@example@example.com",
        "email@example.com (email)",
      ];

      test.each(invalidEmail)('should return error if email format is invalid', async (email) => {
        req.body.email = email;

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Invalid Email or Answer",
          })
        );
      });
    });

    describe('Password Format Tests', () => {
      it('should return error for new password shorter than 6 characters', async () => {
        req.body.newPassword = "12345";

        await forgotPasswordController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "New password must be at least 6 characters long",
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Input Trimming Tests', () => {
      it('should trim whitespace from email', async () => {
        req.body.email = "   test@gmail.com   ";
        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@gmail.com", answer: "testanswer" });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Invalid Email or Answer",
          })
        );
      });

      it('should trim whitespace from answer', async () => {
        req.body.answer = "   testanswer   ";
        userModel.findOne.mockResolvedValue(null);

        await forgotPasswordController(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com", answer: "testanswer" });
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Invalid Email or Answer",
          })
        );
      });

      it('should NOT trim whitespace from new password', async () => {
        req.body.newPassword = "   newpassword   ";
        const mockUser = {
          _id: "testid",
          email: "test@example.com",
          answer: "testanswer",
        };
        userModel.findOne.mockResolvedValue(mockUser);
        hashPassword.mockResolvedValue("hashednewpassword");
        userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

        await forgotPasswordController(req, res);

        expect(hashPassword).toHaveBeenCalledWith("   newpassword   ");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("testid", {
          password: "hashednewpassword",
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
  });

  describe('Error Handling Tests', () => {
    it('should return error if database query fails', async () => {
      const error = new Error('Database error');
      userModel.findOne.mockRejectedValue(error);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Forgot Password",
        })
      );
    });

    it('should handle errors if password hashing fails', async () => {
      const error = new Error('Password hashing failed');
      hashPassword.mockRejectedValue(error);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Forgot Password",
        })
      );
    });

    it('should handle errors if password update fails', async () => {
      const error = new Error('Password update failed');
      userModel.findOneAndUpdate.mockRejectedValue(error);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Forgot Password",
        })
      );
    });
  });

  describe('Security Tests', () => {
    it('should return 400 if user is not found', async () => {
      userModel.findOne.mockResolvedValue(null);

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Answer",
        })
      );
    });

    it('should return 400 if answer is incorrect', async () => {
      req.body.answer = "wronganswer";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Answer",
        })
      );
    });
  });

  describe('Case Sensitivity', () => {
    it('should be case insensitive for email', async () => {
      req.body.email = "Test@Example.COM";

      const mockUser = {
        _id: "testid",
        email: "test@example.com", // stored in lowercase
        answer: "testanswer",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "testanswer",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password Reset Successfully",
        })
      );
    });

    it('should be case insensitive for answer', async () => {
      req.body.answer = "TestAnswer";

      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        answer: "testanswer",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "testanswer",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password Reset Successfully",
        })
      );
    });

    it('should be case insensitive for email and answer', async () => {
      req.body.email = "Test@Example.COM";
      req.body.answer = "TestAnswer";

      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        answer: "testanswer",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("newhashedpassword");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
        answer: "testanswer",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Password Reset Successfully",
        })
      );
    });

    it('should preserve password case before hashing', async () => {
      req.body.newPassword = "PassWord123";

      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        answer: "testanswer",
      };
      userModel.findOne.mockResolvedValue(mockUser);
      hashPassword.mockResolvedValue("hashedPassWord123");
      userModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      await forgotPasswordController(req, res);

      expect(hashPassword).toHaveBeenCalledWith("PassWord123");
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "testid",
        { password: "hashedPassWord123" }
      );
    });
  });

  describe('Error Logging Tests', () => {
    it('should log error to console when forgot password fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      const error = new Error('Database error');
      userModel.findOne.mockRejectedValue(error);

      await forgotPasswordController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(error);

      consoleErrorSpy.mockRestore();
    });
  });
});
