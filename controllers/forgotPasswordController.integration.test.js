// Loh Ze Qing Norbert, A0277473R

import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authHelper from "../helpers/authHelper.js";
import * as validationHelper from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";
import { forgotPasswordController } from "./forgotPasswordController.js";

jest.setTimeout(30000);

describe("forgotPasswordController - Integration Tests", () => {
	let mongoServer;
	let userCounter = 0;

	const createResponse = () => ({
		status: jest.fn().mockReturnThis(),
		send: jest.fn(),
	});

	const createSeedUser = async (overrides = {}) => {
		userCounter += 1;
		const plainPassword = overrides.password ?? "OldPassword123";
		const hashedPassword = await authHelper.hashPassword(plainPassword);

		return userModel.create({
			name: "Forgot Password User",
			email: `forgot.integration.${userCounter}@example.com`,
			password: hashedPassword,
			phone: "+14155552671",
			address: "123 Integration Street",
			answer: "myanswer",
			DOB: "2000-01-01",
			role: 0,
			...overrides,
			password: hashedPassword,
		});
	};

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		const mongoUri = mongoServer.getUri();
		await mongoose.connect(mongoUri, {
			dbName: "forgot-password-controller-integration-tests",
		});
	});

	beforeEach(async () => {
		await userModel.deleteMany({});
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await mongoose.connection.dropDatabase();
		await mongoose.connection.close();
		await mongoServer.stop();
	});

	describe("Specific Handshakes (External Dependencies)", () => {
		test("uses sanitized email/answer in findOne, then hashes and updates by _id", async () => {
			const user = await createSeedUser({
				email: "user@example.com",
				answer: "answer",
			});

			const req = {
				body: {
					email: "  USER@EXAMPLE.COM  ",
					answer: "  ANSWER  ",
					newPassword: "NewPassword123",
				},
			};
			const res = createResponse();

			const validateEmailSpy = jest.spyOn(validationHelper, "validateEmail");
			const validatePasswordSpy = jest.spyOn(validationHelper, "validatePassword");
			const findOneSpy = jest.spyOn(userModel, "findOne");
			const hashSpy = jest.spyOn(authHelper, "hashPassword");
			const updateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

			await forgotPasswordController(req, res);

			expect(validateEmailSpy).toHaveBeenCalledWith("user@example.com");
			expect(validatePasswordSpy).toHaveBeenCalledWith("NewPassword123");
			expect(findOneSpy).toHaveBeenCalledWith({
				email: "user@example.com",
				answer: "answer",
			});
			expect(hashSpy).toHaveBeenCalledWith("NewPassword123");
			expect(updateSpy).toHaveBeenCalledWith(
				user._id,
				expect.objectContaining({ password: expect.any(String) }),
			);
			expect(hashSpy.mock.invocationCallOrder[0]).toBeLessThan(updateSpy.mock.invocationCallOrder[0]);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith({
				success: true,
				message: "Password Reset Successfully",
			});
		});
	});

	describe("The Happy Path", () => {
		test("resets password end-to-end and persists hashed update", async () => {
			const user = await createSeedUser({
				email: "happy.path@example.com",
				answer: "blue",
			});

			const req = {
				body: {
					email: "happy.path@example.com",
					answer: "blue",
					newPassword: "BrandNewPass123",
				},
			};
			const res = createResponse();

			await forgotPasswordController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.send).toHaveBeenCalledWith({
				success: true,
				message: "Password Reset Successfully",
			});

			const updatedUser = await userModel.findById(user._id);
			expect(updatedUser).not.toBeNull();
			expect(updatedUser.password).not.toBe("BrandNewPass123");
			expect(updatedUser.password).not.toBe(user.password);
			const matches = await bcrypt.compare("BrandNewPass123", updatedUser.password);
			expect(matches).toBe(true);
		});
	});

	describe("Validation / Negative Paths", () => {
		test.each([
			["email", "Email is required"],
			["answer", "Answer is required"],
			["newPassword", "New password is required"],
		])("returns 400 for missing %s", async (field, expectedMessage) => {
			const body = {
				email: "user@example.com",
				answer: "answer",
				newPassword: "Password123",
			};
			delete body[field];

			const req = { body };
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");
			const hashSpy = jest.spyOn(authHelper, "hashPassword");

			await forgotPasswordController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({ success: false, message: expectedMessage });
			expect(findOneSpy).not.toHaveBeenCalled();
			expect(hashSpy).not.toHaveBeenCalled();
		});

		test("returns 400 when validateEmail rejects input", async () => {
			const req = {
				body: {
					email: "bad-email",
					answer: "answer",
					newPassword: "Password123",
				},
			};
			const res = createResponse();

			const emailSpy = jest.spyOn(validationHelper, "validateEmail").mockReturnValue(false);
			const findOneSpy = jest.spyOn(userModel, "findOne");

			await forgotPasswordController(req, res);

			expect(emailSpy).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Answer",
			});
			expect(findOneSpy).not.toHaveBeenCalled();
		});

		test("returns 400 when validatePassword rejects short password", async () => {
			const req = {
				body: {
					email: "user@example.com",
					answer: "answer",
					newPassword: "123",
				},
			};
			const res = createResponse();

			const passwordSpy = jest.spyOn(validationHelper, "validatePassword").mockReturnValue(false);
			const findOneSpy = jest.spyOn(userModel, "findOne");

			await forgotPasswordController(req, res);

			expect(passwordSpy).toHaveBeenCalledWith("123");
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "New password must be at least 6 characters long",
			});
			expect(findOneSpy).not.toHaveBeenCalled();
		});

		test("returns 400 when email/answer combination does not exist", async () => {
			const req = {
				body: {
					email: "missing@example.com",
					answer: "wronganswer",
					newPassword: "Password123",
				},
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");
			const hashSpy = jest.spyOn(authHelper, "hashPassword");

			await forgotPasswordController(req, res);

			expect(findOneSpy).toHaveBeenCalledWith({
				email: "missing@example.com",
				answer: "wronganswer",
			});
			expect(hashSpy).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Answer",
			});
		});
	});

	describe("Sanitization Contract", () => {
		test("finds user despite leading/trailing spaces and uppercase email/answer", async () => {
			const user = await createSeedUser({
				email: "sanitize.user@example.com",
				answer: "myanswer",
			});

			const req = {
				body: {
					email: "  SANITIZE.USER@EXAMPLE.COM  ",
					answer: "  MYANSWER  ",
					newPassword: "AnotherPassword123",
				},
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");

			await forgotPasswordController(req, res);

			expect(findOneSpy).toHaveBeenCalledWith({
				email: "sanitize.user@example.com",
				answer: "myanswer",
			});
			expect(res.status).toHaveBeenCalledWith(200);

			const updatedUser = await userModel.findById(user._id);
			const matches = await bcrypt.compare("AnotherPassword123", updatedUser.password);
			expect(matches).toBe(true);
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("stores hash instead of plaintext after successful reset", async () => {
			const user = await createSeedUser({
				email: "security.hash@example.com",
				answer: "securityanswer",
			});

			const req = {
				body: {
					email: "security.hash@example.com",
					answer: "securityanswer",
					newPassword: "TopSecret789",
				},
			};
			const res = createResponse();

			await forgotPasswordController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const updatedUser = await userModel.findById(user._id);
			expect(updatedUser.password).not.toBe("TopSecret789");

			const matches = await bcrypt.compare("TopSecret789", updatedUser.password);
			expect(matches).toBe(true);
		});

		test("returns 500 payload including raw error when database throws", async () => {
			const req = {
				body: {
					email: "error.leak@example.com",
					answer: "answer",
					newPassword: "Password123",
				},
			};
			const res = createResponse();
			const dbError = new Error("Simulated DB failure");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			jest.spyOn(userModel, "findOne").mockRejectedValue(dbError);

			await forgotPasswordController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error in Forgot Password",
				error: dbError,
			});

			consoleSpy.mockRestore();
		});
	});
});
