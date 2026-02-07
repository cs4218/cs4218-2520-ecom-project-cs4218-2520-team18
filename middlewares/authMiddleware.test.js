import { requireSignIn, isAdmin } from "./authMiddleware.js";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

jest.mock("jsonwebtoken");
jest.mock("../models/userModel.js");

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

describe("Auth Middleware", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            headers: { authorization: "Bearer test-token" },
            user: { _id: "user-id-123" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe("requireSignIn", () => {
        describe("Happy Path", () => {
            it("should verify token and call next()", async () => {
                const decodedToken = { _id: "user-id-123" };
                JWT.verify.mockReturnValue(decodedToken);

                await requireSignIn(req, res, next);

                expect(JWT.verify).toHaveBeenCalledWith(
                    "test-token",
                    process.env.JWT_SECRET
                );
                expect(req.user).toEqual(decodedToken);
                expect(next).toHaveBeenCalled();
            });
        });

        describe("Error logging", () => {
            it("should handle invalid token by sending 401 response", async () => {
                const consoleSpy = jest.spyOn(console, "error").mockImplementation();
                const error = new Error("Invalid token");
                JWT.verify.mockImplementation(() => {
                    throw error;
                });

                await requireSignIn(req, res, next);

                expect(consoleSpy).toHaveBeenCalledWith(error);
                consoleSpy.mockRestore();
            });
        });

        describe("Invalid Input", () => {
            it("should return 401 if token is invalid or expired", async () => {
                const error = new Error("Invalid token");
                JWT.verify.mockImplementation(() => {
                    throw error;
                });

                await requireSignIn(req, res, next);

                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    error,
                    message: "Unauthorized Access",
                });
            });
        });

        describe("Authorization header", () => {
            it("should return 401 if authorization header is missing", async () => {
                req.headers.authorization = undefined;

                await requireSignIn(req, res, next);

                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Authorization header is invalid",
                });
                expect(next).not.toHaveBeenCalled();
            });

            // Certain testing tools may or may not include the "Bearer " prefix
            it("should correctly extract token when 'Bearer ' prefix is present", async () => {
                const token = "test-token";
                req.headers.authorization = "Bearer " + token;
                const decodedToken = { _id: "user-id-123" };
                JWT.verify.mockReturnValue(decodedToken);

                await requireSignIn(req, res, next);

                expect(JWT.verify).toHaveBeenCalledWith(
                    token,
                    process.env.JWT_SECRET
                );
                expect(next).toHaveBeenCalled();
            });

            it("should still work if 'Bearer ' prefix is missing (optional but recommended)", async () => {
                const token = "test-token";
                req.headers.authorization = token;
                const decodedToken = { _id: "user-id-123" };
                JWT.verify.mockReturnValue(decodedToken);

                await requireSignIn(req, res, next);

                expect(JWT.verify).toHaveBeenCalledWith(
                    token,
                    process.env.JWT_SECRET
                );
                expect(next).toHaveBeenCalled();
            });

            it("should return 401 if the authorization header is just the word 'Bearer'", async () => {
                const token = "Bearer";
                const error = new Error("Invalid token");
                req.headers.authorization = token;
                JWT.verify.mockImplementation(() => {
                    throw error;
                });

                await requireSignIn(req, res, next);

                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.send).toHaveBeenCalledWith({
                    success: false,
                    message: "Authorization header is invalid",
                });
                expect(next).not.toHaveBeenCalled();
            });
        })
    })
});

describe("isAdmin", () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            user: { _id: "user-id-123" },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe("Happy Path", () => {
        it("should call next() if user is admin", async () => {
            const user = { _id: "user-id-123", role: 1 };
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(userModel.findById).toHaveBeenCalledWith("user-id-123");
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
            expect(res.send).not.toHaveBeenCalled();
        });
    });

    describe('Authorization Failure', () => {
        it("should return 403 if user is not admin (role 0)", async () => {
            const user = { _id: "user-id-123", role: 0 };
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 if user is not admin (role 2)", async () => {
            const user = { _id: "user-id-123", role: 2 };
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should return 500 if userModel.findById throws an error', async () => {
            const error = new Error("Database error");
            userModel.findById.mockRejectedValue(error);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error,
                message: "Error in Auth Middleware",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should return 403 if user is empty', async () => {
            const user = {};
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 if user is not found", async () => {
            userModel.findById.mockResolvedValue(null);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 401 if user is undefined", async () => {
            req.user = undefined;

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Authentication required",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 if role is undefined", async () => {
            const user = { _id: "user-id-123" };
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });

        it("should return 403 if role is a string '1' (strict equality check)", async () => {
            const user = { _id: "user-id-123", role: "1" };
            userModel.findById.mockResolvedValue(user);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized Access",
            });
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe("Error Logging", () => {
        it("should log the error if userModel.findById throws an error", async () => {
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
            const error = new Error("Database error");
            userModel.findById.mockRejectedValue(error);

            await isAdmin(req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error,
                message: "Error in Auth Middleware",
            });
            expect(consoleSpy).toHaveBeenCalledWith(error);
            consoleSpy.mockRestore();
        });
    });
});
