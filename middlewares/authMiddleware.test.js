// Loh Ze Qing Norbert, A0277473R

import { requireSignIn, isAdmin } from "./authMiddleware.js";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

// Mock dependencies
jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

describe("Auth Middleware Comprehensive Unit Tests", () => {
  let req, res, next;
  const originalEnv = process.env;

  // Helper to setup user mock
  const setupMockUser = (overrides = {}) => {
    const mockUser = {
      _id: "mock_id_123",
      role: 1,
      ...overrides,
    };
    userModel.findById.mockResolvedValue(mockUser);
    return mockUser;
  };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, JWT_SECRET: "test_secret_key" };

    req = {
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Environment Configuration Tests (Edge Cases)", () => {
    let consoleSpy;
    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("should return 401 if JWT_SECRET is missing", async () => {
      // Arrange
      const token = "valid-token";
      req.headers.authorization = `Bearer ${token}`;
      process.env.JWT_SECRET = undefined;
      JWT.verify.mockImplementation(() => {
        throw new Error("secretOrPublicKey must be provided");
      });

      // Act
      await requireSignIn(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("requireSignIn Middleware", () => {
    describe("Successful Authorization", () => {
      test("should verify token and call next() when 'Bearer ' prefix is present", async () => {
        // Arrange
        const token = "valid-token";
        req.headers.authorization = `Bearer ${token}`;
        const decodedUser = { _id: "user123" };
        JWT.verify.mockReturnValue(decodedUser);

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(JWT.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
        expect(req.user).toEqual(decodedUser);
        expect(next).toHaveBeenCalled();
      });

      test("should verify token and call next() when 'Bearer ' prefix is missing", async () => {
        // Arrange
        const token = "raw-token-without-prefix";
        req.headers.authorization = token;
        const decodedUser = { _id: "user123" };
        JWT.verify.mockReturnValue(decodedUser);

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(JWT.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
        expect(req.user).toEqual(decodedUser);
        expect(next).toHaveBeenCalled();
      });
    });

    describe("JWT Verification Error Handling (With console.error mocking)", () => {
      beforeEach(() => {
        // Only mock console.error for JWT verification error cases
        jest.spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        console.error.mockRestore();
      });

      test("should return 401 if header has double spaces (BVA)", async () => {
        // Arrange
        req.headers.authorization = "Bearer  token";
        JWT.verify.mockImplementation(() => {
          throw new Error("JWT must be provided");
        });

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });

      test("should return 401 if authorization header is whitespace-only (Edge Case)", async () => {
        // Arrange
        req.headers.authorization = "   ";
        JWT.verify.mockImplementation(() => {
          throw new Error("JWT must be provided");
        });

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });

      test("should return 401 if authorization header has leading/trailing spaces (Edge Case)", async () => {
        // Arrange
        const token = "valid-token";
        req.headers.authorization = `  Bearer ${token}  `;
        JWT.verify.mockImplementation(() => {
          throw new Error("JWT must be provided");
        });

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      });
    });

    test("should handle case-insensitive 'bearer' prefix (EP)", async () => {
      // Arrange
      const token = "valid-token";
      req.headers.authorization = `bearer ${token}`;
      const decodedUser = { _id: "user123" };
      JWT.verify.mockReturnValue(decodedUser);

      // Act
      await requireSignIn(req, res, next);

      // Assert
      expect(JWT.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(decodedUser);
      expect(next).toHaveBeenCalled();
    });

    test("should return 401 if authorization header is just the word 'Bearer' (BVA)", async () => {
      // Arrange
      req.headers.authorization = "Bearer";

      // Act
      await requireSignIn(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authorization header is invalid",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should return 401 if authorization header is just lowercase 'bearer' (BVA)", async () => {
      // Arrange
      req.headers.authorization = "bearer";

      // Act
      await requireSignIn(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authorization header is invalid",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    test("should return 401 if authorization header is just uppercase 'BEARER' (BVA)", async () => {
      // Arrange
      req.headers.authorization = "BEARER";

      // Act
      await requireSignIn(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Authorization header is invalid",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    describe("Error Handling", () => {
      let consoleSpy;
      beforeEach(() => {
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      });
      afterEach(() => consoleSpy.mockRestore());

      test("should return 401 if authorization header is missing", async () => {
        // Arrange
        req.headers.authorization = undefined;

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Authorization header is invalid",
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });

      test("should return 401 and log error when JWT verification fails", async () => {
        // Arrange
        req.headers.authorization = "Bearer expired-token";
        const error = new Error("jwt expired");
        JWT.verify.mockImplementation(() => {
          throw error;
        });

        // Act
        await requireSignIn(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(consoleSpy).toHaveBeenCalledWith(error);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Unauthorized Access",
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
  
  describe("isAdmin Middleware", () => {
    describe("Successful Authorization", () => {
      test("should call next() if user is found and has role 1 (Admin)", async () => {
        // Arrange
        req.user = { _id: "admin_id" };
        setupMockUser({ role: 1 });

        // Act
        await isAdmin(req, res, next);

        // Assert
        expect(userModel.findById).toHaveBeenCalledWith("admin_id");
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe("Authorization Failures", () => {
      test("should return 401 if req.user is missing", async () => {
        // Arrange
        req.user = undefined;

        // Act
        await isAdmin(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Authentication required" }),
        );
        expect(next).not.toHaveBeenCalled();
      });

      test.each([
        ["Regular User (Role 0)", { role: 0 }],
        ["Unknown Role (Role 2)", { role: 2 }],
        ["String Role '1'", { role: "1" }],
        ["Role Missing", { role: undefined }],
        ["User Not Found", null],
      ])("should return 403 for %s", async (_, userValue) => {
        // Arrange
        req.user = { _id: "user_id" };
        userModel.findById.mockResolvedValue(userValue);

        // Act
        await isAdmin(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({ message: "Unauthorized Access" }),
        );
        expect(next).not.toHaveBeenCalled();
      });
    });

    describe("System Error Handling", () => {
      let consoleSpy;
      beforeEach(() => {
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      });
      afterEach(() => consoleSpy.mockRestore());

      test("should return 500 if database throws an error", async () => {
        // Arrange
        req.user = { _id: "valid_id" };
        const dbError = new Error("Database connection failed");
        userModel.findById.mockRejectedValue(dbError);

        // Act
        await isAdmin(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(consoleSpy).toHaveBeenCalledWith(dbError);
        expect(res.send).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            message: "Error in Auth Middleware",
            error: dbError,
          }),
        );
        expect(next).not.toHaveBeenCalled();
      });
    });
  });
});
