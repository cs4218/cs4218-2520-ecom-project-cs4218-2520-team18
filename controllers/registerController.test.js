import { registerController } from "./registerController.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

// Mock dependencies
jest.mock("../models/userModel.js");
jest.mock("./../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe("registerController Comprehensive Unit Tests", () => {
  let req, res;

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
    // Arrange - Reset request and response objects before each test
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

  describe("Basic Field Requirements", () => {
    test.each([
      ["name", "", "Name is Required"],
      ["email", "", "Email is Required"],
      ["password", "", "Password is Required"],
      ["phone", "", "Phone no. is Required"],
      ["address", "", "Address is Required"],
      ["DOB", "", "DOB is Required"],
      ["answer", "", "Answer is Required"],
      ["name", " ", "Name is Required"], // Whitespace-only cases
      ["email", " ", "Email is Required"],
      ["phone", " ", "Phone no. is Required"],
      ["address", " ", "Address is Required"],
      ["answer", " ", "Answer is Required"],
    ])(
      "should return 400 error for %s input: '%s'",
      async (field, value, message) => {
        // Arrange
        req.body[field] = value;

        // Act
        await registerController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ success: false, message }),
        );
      },
    );
  });

  describe("Input Format & Boundary Validation", () => {
    test("should return 400 if password is < 6 characters", async () => {
      // Arrange
      req.body.password = "12345";

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Password must be at least 6 characters long",
        }),
      );
    });
    
    test("should allow 1 character name (boundary case)", async () => {
      // Arrange
      req.body.name = "A";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should reject name exceeding typical length (e.g. 100 characters)", async () => {
      // Arrange
      req.body.name = "A".repeat(101);
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Name must be less than 100 characters" }),
      );
    });

    test("should accept name exactly 100 characters", async () => {
      // Arrange
      req.body.name = "A".repeat(100);
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return true if password is 6 characters", async () => {
      // Arrange
      req.body.password = "123456";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);
      
      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return true if password is > 6 characters", async () => {
      // Arrange
      req.body.password = "1234567";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);
      
      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // Exhaustive Email Format Testing
    test.each([
      "plainaddress",
      "@missingusername.com",
      "username@.com",
      "username@com",
      "username@domain..com",
      "#$%^&*()@example.com",
      "Joe Smith <email@example.com>",
      "email@example@example.com",
      "email@example.com (email)",
    ])("should reject invalid email format: %s", async (email) => {
      // Arrange
      req.body.email = email;

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Email Format" }),
      );
    });

    // Exhaustive Phone Format Testing
    test.each([
      "abcdefghij",
      "123-456-7890",
      "(123) 456-7890",
      "+1 (123) 456-7890",
      "123.456.7890",
      "123 456 7890",
      "!@#$%^&*()",
    ])("should reject invalid phone format: %s", async (phone) => {
      // Arrange
      req.body.phone = phone;

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Phone Number" }),
      );
    });

    test("should return false for number shorter than 2 digits as invalid (1 digit)", async () => {
      // Arrange
      req.body.phone = "+1";

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Phone Number" }),
      );
    });

    test("should return true for number exactly 2 digits", async () => {
      // Arrange
      req.body.phone = "+12";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);
      
      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return true for number longer than 2 digits (3 digits)", async () => {
      // Arrange
      req.body.phone = "+123";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);
      
      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return true for number with maximum 15 digits", async () => {
      // Arrange
      req.body.phone = "+123456789012345";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return false for number longer than 15 digits", async () => {
      // Arrange
      req.body.phone = "+1234567890123456";

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid Phone Number" }),
      );
    });

    test("should return true for number shorter than 15 digits", async () => {
      // Arrange
      req.body.phone = "+12345678901234";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test("should return true for number with optional leading +", async () => {
      // Arrange
      req.body.phone = "1234567890";
      userModel.findOne.mockResolvedValue(null);
      setupMockUser(req.body);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // Exhaustive DOB Format Testing
    test.each([
      ["invalid-date", "Invalid DOB or format. Please use YYYY-MM-DD"],
      ["2020/01/01", "Invalid DOB or format. Please use YYYY-MM-DD"],
      ["01-01-2000", "Invalid DOB or format. Please use YYYY-MM-DD"],
      ["not-a-date", "Invalid DOB or format. Please use YYYY-MM-DD"],
    ])("should reject invalid DOB format: %s", async (DOB, message) => {
      // Arrange
      req.body.DOB = DOB;

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message }),
      );
    });

    test("should reject if DOB is in the future", async () => {
      // Arrange
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      req.body.DOB = tomorrow.toISOString().split("T")[0];

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid or future DOB" }),
      );
    });

    test("should reject if format is correct but DOB is invalid (e.g. 2020-02-30)", async () => {
      // Arrange
      req.body.DOB = "2020-02-30";

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid DOB or format. Please use YYYY-MM-DD",
        }),
      );
    });
  });

  describe("Registration Logic & Security", () => {
    it("should return 200/conflict if user already exists", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue({ email: "test@example.com" });

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Already registered, please login",
        }),
      );
    });

    it("should successfully register a new user with all valid inputs (Happy Path", async () => {
      // Arrange
      const rawPassword = "password123";
      const hashedPassword = "hashed_safe_password";

      req.body.email = "  UPPERCASE@example.com  ";
      req.body.password = rawPassword;

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue(hashedPassword);

      const mockSavedDoc = {
        _id: "mongo_id_999",
        name: req.body.name,
        email: "uppercase@example.com",
        password: hashedPassword,
        phone: req.body.phone,
        address: req.body.address,
        DOB: req.body.DOB,
        answer: "testanswer",
      };

      const saveSpy = jest.fn().mockResolvedValue({ _doc: mockSavedDoc });
      userModel.mockImplementation((data) => ({
        ...data,
        save: saveSpy,
      }));

      // Act
      await registerController(req, res);

      // Assert
      // Verify Logic Flow
      expect(userModel.findOne).toHaveBeenCalledWith({
        email: "uppercase@example.com",
      });
      expect(hashPassword).toHaveBeenCalledWith(rawPassword);

      // Verify the Model was instantiated with the correct (hashed/normalized) data
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "uppercase@example.com",
          password: hashedPassword,
          name: "Test User",
        }),
      );

      // Verify Response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "User Registered Successfully",
        user: expect.objectContaining({
          _id: "mongo_id_999",
          email: "uppercase@example.com",
        }),
      });

      // Verify Security (Crucial Happy Path Step)
      const responseData = res.send.mock.calls[0][0];
      expect(responseData.user.password).toBeUndefined();
      expect(responseData.user.answer).toBeUndefined();
    });

    it("should not expose sensitive fields in the response", async () => {
      // Arrange
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashed_secret");
      const mockSavedDoc = {
        _id: "id_123",
        ...req.body,
        password: "hashed_secret",
      };
      const mockSave = jest.fn().mockResolvedValue({ _doc: mockSavedDoc });
      userModel.mockImplementation((data) => ({ ...data, save: mockSave }));

      // Act
      await registerController(req, res);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("password123");
      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({ password: "hashed_secret" }),
      );
      expect(res.status).toHaveBeenCalledWith(201);

      // Security Assertions
      const response = res.send.mock.calls[0][0];
      expect(response.user).not.toHaveProperty("password");
      expect(response.user).not.toHaveProperty("answer");
    });
  });

  describe("Data Normalization & Case Preservation", () => {
    test.each([
      ["email", "  TEST@EXAMPLE.COM  ", "test@example.com"],
      ["answer", "  SECRET_ANSWER  ", "secret_answer"],
      ["name", "  John Doe  ", "John Doe"], // Trims but preserves case
      ["address", "  123 Maple St  ", "123 Maple St"], // Trims but preserves case
    ])(
      "should correctly handle %s input: '%s'",
      async (field, input, expected) => {
        // Arrange
        req.body[field] = input;
        userModel.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue("hashed");

        const mockFullDoc = {
          _id: "norm_id",
          name: field === "name" ? expected : "Test User",
          email: field === "email" ? expected : "test@example.com",
          answer: field === "answer" ? expected : "testanswer",
          address: field === "address" ? expected : "123 Test St",
          password: "hashed",
          phone: "1234567890",
          DOB: "2000-01-01",
        };

        const mockSave = jest.fn().mockResolvedValue({ _doc: mockFullDoc });
        userModel.mockImplementation((data) => ({ ...data, save: mockSave }));

        // Act
        await registerController(req, res);

        // Assert
        expect(userModel).toHaveBeenCalledWith(
          expect.objectContaining({ [field]: expected }),
        );
      },
    );

    it("should preserve password case for hashing", async () => {
      // Arrange
      req.body.password = "CaseSensitive123";
      userModel.findOne.mockResolvedValue(null);

      // Act
      await registerController(req, res);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("CaseSensitive123");
    });

    it("should preserve whitespace in password for hashing", async () => {
      // Arrange
      req.body.password = "  password with spaces  ";
      userModel.findOne.mockResolvedValue(null);

      // Act
      await registerController(req, res);

      // Assert
      expect(hashPassword).toHaveBeenCalledWith("  password with spaces  ");
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

    it("should handle database failures during lookup", async () => {
      // Arrange
      const error = new Error("DB Fail");
      userModel.findOne.mockRejectedValue(error);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    it("should handle hashing service failures", async () => {
      // Arrange
      const error = new Error("Hash Fail");
      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockRejectedValue(error);

      // Act
      await registerController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(expect.objectContaining({ error }));
    });
  });
});
