import { registerController } from "./authController";
import userModel from "../models/userModel";
import { hashPassword } from "./../helpers/authHelper.js";

//REGISTER CONTROLLER
jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");

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
        dob: "2000-01-01",
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
    req.body.dob = "";

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
      dob: "2000-01-01",
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
        dob: "2000-01-01",
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
        async (dob) => {
          req.body.dob = dob;
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
        req.body.dob = futureDate.toISOString().split("T")[0];

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
      dob: "2000-01-01",
      answer: "testanswer",
    };

    const mockSave = jest.fn().mockResolvedValue({ _doc: mockSavedUser });
    userModel.mockImplementation(() => ({ save: mockSave }));

    await registerController(req, res);

    const sentResponse = res.send.mock.calls[0][0];

    expect(sentResponse.user).not.toHaveProperty("password");
    expect(sentResponse.user).not.toHaveProperty("answer");
  });
});
