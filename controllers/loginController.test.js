import JWT from "jsonwebtoken";
import { comparePassword } from "../helpers/authHelper.js";
import userModel from "../models/userModel.js";
import { loginController } from "./loginController.js";

jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe("loginController", () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {
        email: "test@example.com",
        password: "password",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe("Happy Path", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        _id: "testuserid",
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword",
        phone: "+1234567890",
        address: "123 Test St",
        DOB: "2000-01-01",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("testtoken");

      await loginController(req, res);

      expect(userModel.findOne).toHaveBeenCalledWith({ email: req.body.email });
      expect(comparePassword).toHaveBeenCalledWith(req.body.password, mockUser.password);
      expect(JWT.sign).toHaveBeenCalledWith(
        { _id: mockUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login Successful",
          token: "testtoken",
          user: {
            _id: "testuserid",
            name: "Test User",
            email: "test@example.com",
            phone: "+1234567890",
            address: "123 Test St",
            DOB: "2000-01-01",
            role: 0,
          },
        })
      );
    });

    it('should exclude password and sensitive info from response', async () => {
      const mockUser = {
        _id: "testuserid",
        name: "Test User",
        email: "test@example.com",
        password: "hashedpassword",
        phone: "+1234567890",
        address: "123 Test St",
        DOB: "2000-01-01",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("testtoken");

      await loginController(req, res);

      const sentResponse = res.send.mock.calls[0][0];

      expect(sentResponse.user).not.toHaveProperty("password");
      expect(sentResponse.user).not.toHaveProperty("answer");
    });
  });

  describe('Validation Test', () => {
    // Error message should be generic to prevent user enumeration
    it('should return error if email is missing', async () => {
      req.body.email = "";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if password is missing', async () => {
      req.body.password = "";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if both email and password are missing', async () => {
      req.body.email = "";
      req.body.password = "";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if email is undefined', async () => {
      delete req.body.email;

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if password is undefined', async () => {
      delete req.body.password;

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if both email and password are undefined', async () => {
      delete req.body.email;
      delete req.body.password;

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if email is white space', async () => {
      req.body.email = " ";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });
  });

  describe('White Space Test', () => {
    it('should trim leading/trailing spaces from email and login successfully', async () => {
      req.body.email = "   test@example.com   ";
      req.body.password = "password";

      const mockUser = {
        _id: "testid",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("testtoken");

      await loginController(req, res);

      // Verify that the email is trimmed
      expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login Successful",
        })
      );
    });

    it('should NOT trim leading/trailing spaces from password and login successfully', async () => {
      req.body.email = "test@example.com";
      req.body.password = "   password   ";

      const mockUser = {
        _id: "testid",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("testtoken");

      await loginController(req, res);

      expect(comparePassword).toHaveBeenCalledWith("   password   ", "hashedpassword");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login Successful",
        })
      );
    });

    it('should trim leading/trailing spaces from both email and password and login successfully', async () => {
      req.body.email = "   test@example.com   ";
      req.body.password = "   password   ";

      const mockUser = {
        _id: "testid",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("testtoken");

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login Successful",
        })
      );
    });
  });

  describe('Authentication Test', () => {
    it('should return error if email is not found', async () => {
      req.body.email = "test@example.com";
      req.body.password = "password";

      userModel.findOne.mockResolvedValue(null);

      await loginController(req, res);

      // Use 400 to not leak information about whether the email exists or not
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if password is incorrect', async () => {
      req.body.email = "test@example.com";
      req.body.password = "password";

      const mockUser = {
        _id: "testid",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });

    it('should return error if both email and password are incorrect', async () => {
      req.body.email = "test@example.com";
      req.body.password = "password";

      const mockUser = {
        _id: "testid",
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        answer: "testanswer",
        role: 0,
      };

      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(false);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        })
      );
    });
  });

  describe('Error Handling Test', () => {
    it('should return error if database connection fails', async () => {
      const dbError = new Error("Database connection failed");
      userModel.findOne.mockRejectedValue(dbError);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Login",
          error: dbError,
        })
      );
    });

    it('should handle password comparison errors', async () => {
      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        password: "hashedpassword",
      };
      const compareError = new Error("Password comparison failed");
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockRejectedValue(compareError);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Login",
        })
      );
    });

    it('should handle JWT token signing errors', async () => {
      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        password: "hashedpassword",
      };
      const tokenError = new Error("Token signing failed");
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockRejectedValue(tokenError);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Login",
        })
      );
      jest
    });
  });

  describe('Invalid format validation Test', () => {
    describe('Email format validation Test', () => {
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
        req.body.password = "password";

        await loginController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Invalid Email or Password",
          })
        );
      });
    });
  });

  describe('Case Sensitivity Test', () => {
    describe('Email normalisation Test', () => {
      it('should normalize email to lowercase before querying', async () => {
        req.body.email = "TEST@EXAMPLE.COM";
        req.body.password = "password";
        const mockUser = {
          _id: "testid",
          name: "Test User",
          email: "test@example.com",
          password: "hashedpassword",
          phone: "+1234567890",
          address: "123 Test St",
          DOB: "2000-01-01",
          answer: "testanswer",
          role: 0,
        };
        userModel.findOne.mockResolvedValue(mockUser);
        comparePassword.mockResolvedValue(true);
        JWT.sign.mockResolvedValue("testtoken");

        await loginController(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "Login Successful",
          })
        );
      });
    });

    describe('Password case sensitivity Test', () => {
      it('should treat password as case sensitive', async () => {
        req.body.email = "test@example.com";
        req.body.password = "Password123";

        const mockUser = {
          _id: "testid",
          name: "Test User",
          email: "test@example.com",
          password: "hashedpassword123",
          phone: "+1234567890",
          address: "123 Test St",
          DOB: "2000-01-01",
          answer: "testanswer",
          role: 0,
        };
        userModel.findOne.mockResolvedValue(mockUser);
        comparePassword.mockResolvedValue(false);

        await loginController(req, res);

        expect(comparePassword).toHaveBeenCalledWith(
          "Password123",
          mockUser.password
        );
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Invalid Email or Password",
          })
        );
      });
    });
  });

  describe('Error Logging Tests', () => {
    it('should log error to console when login fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      const error = new Error('Database error');
      userModel.findOne.mockRejectedValue(error);

      await loginController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        error
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
