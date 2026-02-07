import { registerController, loginController, forgotPasswordController, testController } from "./authController";
import userModel from "../models/userModel";
import JWT from "jsonwebtoken";
import { hashPassword, comparePassword } from "./../helpers/authHelper.js";

//REGISTER CONTROLLER
jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("jsonwebtoken");

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

describe("registerController", () => {
  let req, res;

  // Set up standard request and response objects
  beforeEach(() => {
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
  });

  // Input validation tests
  it("should return error if name is missing", async () => {
    req.body.name = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Name is Required",
    });
  });

  it("should return error if email is missing", async () => {
    req.body.email = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Email is Required",
    });
  });

  it("should return error if password is missing", async () => {
    req.body.password = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Password is Required",
    });
  });

  it("should return error if phone is missing", async () => {
    req.body.phone = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Phone no. is Required",
    });
  });

  it("should return error if address is missing", async () => {
    req.body.address = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Address is Required",
    });
  });

  it("should return error if DOB is missing", async () => {
    req.body.DOB = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "DOB is Required",
    });
  });

  it("should return error if answer is missing", async () => {
    req.body.answer = "";

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Answer is Required",
    });
  });

  // Logic tests
  it("should return error if user email already exists", async () => {
    userModel.findOne.mockResolvedValue({ email: "test@example.com" });

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Already registered, please login",
    });
  });

  it("should register user successfully", async () => {
    userModel.findOne.mockResolvedValue(null);

    hashPassword.mockResolvedValue("hashedpassword");

    const mockUserDoc = {
      _id: "testuserid",
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      address: "123 Test St",
      DOB: "2000-01-01",
      // password and answer will be excluded in response
      password: "hashedpassword",
      answer: "testanswer",
    };
    const mockSave = jest.fn().mockResolvedValue({ _doc: mockUserDoc });

    // Mock the userModel constructor to return an object with a save method
    userModel.mockImplementation(() => ({
      save: mockSave,
    }));

    await registerController(req, res);

    expect(hashPassword).toHaveBeenCalledWith("password123");
    expect(userModel).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({
      success: true,
      message: "User Registered Successfully",
      user: {
        _id: "testuserid",
        name: "Test User",
        email: "test@example.com",
        phone: "+1234567890",
        address: "123 Test St",
        DOB: "2000-01-01",
      },
    });
  });

  // Error handling test
  it("should handle database errors", async () => {
    const errorMessage = new Error("Database error");
    userModel.findOne.mockRejectedValue(errorMessage);

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: errorMessage,
    });
  });

  it("should handle hashing errors", async () => {
    userModel.findOne.mockResolvedValue(null);
    const errorMessage = new Error("Hashing error");
    hashPassword.mockRejectedValue(errorMessage);

    await registerController(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      success: false,
      message: "Error in Registration",
      error: errorMessage,
    });
  });

  // Edge cases

  // 1. Whitespace-only input (should be treated as missing)
  describe("Whitespace-only input validation", () => {
    test("should return error for whitespace-only name", async () => {
      req.body.name = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Name is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });

    test("should return error for whitespace-only email", async () => {
      req.body.email = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });

    test("should return error for whitespace-only password", async () => {
      req.body.password = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });

    test("should return error for whitespace-only phone", async () => {
      req.body.phone = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Phone no. is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });

    test("should return error for whitespace-only address", async () => {
      req.body.address = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Address is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });

    test("should return error for whitespace-only answer", async () => {
      req.body.answer = " ";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Answer is Required",
      });
      expect(userModel).not.toHaveBeenCalled();
    });
  });

  // 2. Input length boundaries
  describe("Input length boundary validation", () => {
    test("should return error for password shorter than 6 characters", async () => {
      req.body.password = "12345";

      await registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Password must be at least 6 characters long",
      });
      expect(userModel).not.toHaveBeenCalled();
    });
  });

  // 3. Invalid format input (not whitespace-only)
  describe("Invalid format validation", () => {
    describe("Email validation edge cases", () => {
      const invalidEmails = [
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

      test.each(invalidEmails)(
        "should return error for invalid email: %s",
        async (email) => {
          req.body.email = email;
          await registerController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid Email Format",
          });
          expect(userModel).not.toHaveBeenCalled();
        },
      );
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
          req.body.phone = phone;

          await registerController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid Phone Number",
          });
          expect(userModel).not.toHaveBeenCalled();
        },
      );
    });

    describe("DOB validation edge cases", () => {
      const invalidDOBs = ["invalid-date"];

      test.each(invalidDOBs)(
        "should return error for invalid DOB: %s",
        async (DOB) => {
          req.body.DOB = DOB;
          await registerController(req, res);

          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Invalid DOB format. Please use YYYY-MM-DD",
          });
          expect(userModel).not.toHaveBeenCalled();
        },
      );

      test("should return error if DOB is in the future", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        req.body.DOB = futureDate.toISOString().split("T")[0];

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Invalid or future DOB",
        });
        expect(userModel).not.toHaveBeenCalled();
      });
    });
  });

  // 3. Valid phone numbers
  describe("should accept valid phone numbers", () => {
    const validPhones = ["123456789012345", "+11234567890"];

    test.each(validPhones)(
      "should accept valid phone number: %s",
      async (phone) => {
        req.body.phone = phone;
        userModel.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue("hashedpassword");
        const mockSave = jest.fn().mockResolvedValue({ _doc: req.body });
        userModel.mockImplementation(() => ({ save: mockSave }));

        await registerController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "User Registered Successfully",
          }),
        );
      },
    );
  });

  describe("Whitespace handling in inputs", () => {
    it("should trim whitespace from name", async () => {
      req.body.name = "   Test User   ";

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test User" }),
      );
    });

    it("should trim whitespace from email", async () => {
      req.body.email = "   test@example.com   ";

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ email: "test@example.com" }),
      );
    });

    it("should trim whitespace from phone", async () => {
      req.body.phone = "   1234567890   ";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "1234567890" }),
      );
    });

    it("should trim whitespace from address", async () => {
      req.body.address = "   123 Test St   ";

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ address: "123 Test St" }),
      );
    });

    it("should trim whitespace from answer", async () => {
      req.body.answer = "   testanswer   ";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ answer: "testanswer" }),
      );
    });
  });

  // Security tests
  it("should not include password or answer in the response", async () => {
    userModel.findOne.mockResolvedValue(null);
    hashPassword.mockResolvedValue("hashedpassword");

    const mockSavedUser = {
      _id: "testuserid",
      name: "Test User",
      email: "test@example.com",
      password: "hashedpassword",
      phone: "+1234567890",
      address: "123 Test St",
      DOB: "2000-01-01",
      answer: "testanswer",
    };

    const mockSave = jest.fn().mockResolvedValue({ _doc: mockSavedUser });
    userModel.mockImplementation(() => ({ save: mockSave }));

    await registerController(req, res);

    const sentResponse = res.send.mock.calls[0][0];

    expect(sentResponse.user).not.toHaveProperty("password");
    expect(sentResponse.user).not.toHaveProperty("answer");
  });

  describe("Case Sensitivity Tests", () => {
    describe('Email normalization', () => {
      it('should normalize email to lowercase', async () => {
        req.body.email = "TEST@EXAMPLE.COM";
        userModel.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue("hashedpassword");
        const mockSave = jest.fn().mockResolvedValue({});
        userModel.mockImplementation(() => ({ save: mockSave }));

        await registerController(req, res);

        expect(userModel).toHaveBeenCalledWith(
          expect.objectContaining({ email: "test@example.com" }),
        );
      });

      it('should detect duplicate emails case-insensitively', async () => {
        req.body.email = "TEST@EXAMPLE.COM";
        userModel.findOne.mockResolvedValue({ email: "test@example.com" });

        await registerController(req, res);

        expect(userModel.findOne).toHaveBeenCalledWith({ email: "test@example.com" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Already registered, please login",
          }),
        );
      });
    });
  });

  describe('Answer normalization', () => {
    it('should normalize answer to lowercase', async () => {
      req.body.answer = "TESTANSWER";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ answer: "testanswer" }),
      );
    });
  });

  describe('Name case preservation', () => {
    it('should preserve name case', async () => {
      req.body.name = "Test User";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Test User" }),
      );
    });
  });

  describe('Address case preservation', () => {
    it('should preserve address case', async () => {
      req.body.address = "123 Test St";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpassword");
      const mockSave = jest.fn().mockResolvedValue({});
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ address: "123 Test St" }),
      );
    });
  });

  describe('Password case preservation', () => {
    it('should preserve password case before hashing', async () => {
      req.body.password = "PassWord123";
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedPassWord123");
      const mockSave = jest.fn().mockResolvedValue({ _doc: {} });
      userModel.mockImplementation(() => ({ save: mockSave }));

      await registerController(req, res);

      expect(hashPassword).toHaveBeenCalledWith("PassWord123");
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "hashedPassWord123"
        })
      );
    });
  });

  describe('Error Logging Tests', () => {
    it('should log error to console when registration fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
      const error = new Error('Database error');
      userModel.findOne.mockRejectedValue(error);

      await registerController(req, res);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
      );
    });

    it('should return error if password is white space', async () => {
      req.body.password = " ";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        }),
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
        }),
      );
    });

    it('should return error if both email and password are white space', async () => {
      req.body.email = " ";
      req.body.password = " ";

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid Email or Password",
        }),
      );
    });
  })

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
        }),
      );
    });

    it('should trim leading/trailing spaces from password and login successfully', async () => {
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

      expect(comparePassword).toHaveBeenCalledWith("password", "hashedpassword");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Login Successful",
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
      );
    });

    it('should handle password comparison errors', async () => {
      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        password: "hashedpassword",
      };
      const compareError = new Error("Password comparison failed")
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockRejectedValue(compareError);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Login",
        }),
      );
    });

    it('should handle JWT token signing errors', async () => {
      const mockUser = {
        _id: "testid",
        email: "test@example.com",
        password: "hashedpassword",
      };
      const tokenError = new Error("Token signing failed")
      userModel.findOne.mockResolvedValue(mockUser);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockRejectedValue(tokenError);

      await loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Login",
        }),
      );
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
          }),
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
          }),
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
        error,
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
      );
    });

    it('should return error if new password is white-space', async () => {
      req.body.newPassword = " ";

      await forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "New password is required",
        }),
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
          }),
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
          }),
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
          }),
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
          }),
        );
      });

      it('should trim whitespace from new password', async () => {
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

        expect(hashPassword).toHaveBeenCalledWith("newpassword");
        expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("testid", {
          password: "hashednewpassword",
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: "Password Reset Successfully",
          }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        }),
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
        { password: "hashedPassWord123" },
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

describe('testController', () => {
  let req, res;

  beforeEach(() => {
    req = {};
    res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should return "Protected Routes" message', () => {
    testController(req, res);

    expect(res.send).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: "Protected route accessed successfully",
    }));
  });

  it('should handle errors gracefully', () => {
    const error = new Error('Unexpected error');
    res.send.mockImplementationOnce(() => {
      throw error;
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    testController(req, res);

    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error in Test",
      })
    );

    consoleErrorSpy.mockRestore();
  });
})
