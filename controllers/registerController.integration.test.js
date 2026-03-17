// Loh Ze Qing Norbert, A0277473R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authHelper from "../helpers/authHelper.js";
import * as validationHelper from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";
import { registerController } from "./registerController.js";

jest.setTimeout(30000);

describe("registerController - Integration Tests", () => {
	let mongoServer;
	let userCounter = 0;

	const createResponse = () => ({
		status: jest.fn().mockReturnThis(),
		send: jest.fn(),
	});

	const buildValidBody = (overrides = {}) => {
		userCounter += 1;
		return {
			name: "Valid User",
			email: `register.integration.${userCounter}@example.com`,
			password: "Password123",
			phone: "+14155552671",
			address: "123 Integration Street",
			DOB: "2000-01-01",
			answer: "blue",
			...overrides,
		};
	};

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		const mongoUri = mongoServer.getUri();
		await mongoose.connect(mongoUri, {
			dbName: "register-controller-integration-tests",
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

	describe("The Happy Path (Positive Integration)", () => {
		test("registers user with messy valid input and persists normalized values", async () => {
			const req = {
				body: buildValidBody({
					name: "  NAME  ",
					email: "  EMAIL@Example.com  ",
					answer: "  Answer  ",
					phone: "  +14155552671  ",
					address: "  123 Integration Street  ",
					DOB: "  2000-01-01  ",
				}),
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");
			const hashSpy = jest.spyOn(authHelper, "hashPassword");
			const saveSpy = jest.spyOn(userModel.prototype, "save");

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			const payload = res.send.mock.calls[0][0];

			expect(payload).toEqual(
				expect.objectContaining({
					success: true,
					message: "User Registered Successfully",
					user: expect.objectContaining({
						name: "NAME",
						email: "email@example.com",
						_id: expect.anything(),
						createdAt: expect.anything(),
					}),
				}),
			);
			expect(payload.user.password).toBeUndefined();
			expect(payload.user.answer).toBeUndefined();

			expect(findOneSpy).toHaveBeenCalledWith({ email: "email@example.com" });
			expect(hashSpy).toHaveBeenCalledWith("Password123");
			expect(hashSpy.mock.invocationCallOrder[0]).toBeLessThan(saveSpy.mock.invocationCallOrder[0]);

			const persistedUser = await userModel.findOne({ email: "email@example.com" });
			expect(persistedUser).not.toBeNull();
			expect(persistedUser.password).not.toBe("Password123");
			expect(persistedUser.name).toBe("NAME");
			expect(persistedUser.email).toBe("email@example.com");
			expect(persistedUser.answer).toBe("answer");
		});
	});

	describe("Validation & Negative Paths", () => {
		test.each([
			["name", "Name is Required"],
			["email", "Email is Required"],
			["password", "Password is Required"],
			["phone", "Phone no. is Required"],
			["address", "Address is Required"],
			["DOB", "DOB is Required"],
			["answer", "Answer is Required"],
		])("returns 400 with exact required-field message for missing %s", async (field, message) => {
			const body = buildValidBody();
			delete body[field];

			const req = { body };
			const res = createResponse();

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message,
			});
		});

		test("returns 400 and stops when validatePhoneE164 fails", async () => {
			const req = { body: buildValidBody() };
			const res = createResponse();

			jest.spyOn(validationHelper, "validatePhoneE164").mockReturnValue(false);
			const findOneSpy = jest.spyOn(userModel, "findOne");

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Phone Number",
			});
			expect(findOneSpy).not.toHaveBeenCalled();
		});

		test("returns 400 and stops when validateDOB fails", async () => {
			const req = { body: buildValidBody({ DOB: "2000-01-01" }) };
			const res = createResponse();

			jest.spyOn(validationHelper, "validateDOB").mockReturnValue(false);
			const findOneSpy = jest.spyOn(userModel, "findOne");

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid DOB or format. Please use YYYY-MM-DD",
			});
			expect(findOneSpy).not.toHaveBeenCalled();
		});

		test("returns 400 when validateName fails for too-long name", async () => {
			const req = {
				body: buildValidBody({
					name: "A".repeat(101),
				}),
			};
			const res = createResponse();

			jest.spyOn(validationHelper, "validateName").mockReturnValue(false);

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Name must be between 1 and 100 characters",
			});
		});

		test("returns 400 when validateDOBNotFuture fails for future date", async () => {
			const req = {
				body: buildValidBody({ DOB: "2099-12-31" }),
			};
			const res = createResponse();

			jest.spyOn(validationHelper, "validateDOBNotFuture").mockReturnValue(false);

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid or future DOB",
			});
		});

		test("returns 200 already-registered branch when duplicate email exists", async () => {
			const firstReq = {
				body: buildValidBody({ email: "duplicate.user@example.com" }),
			};
			const firstRes = createResponse();

			await registerController(firstReq, firstRes);
			expect(firstRes.status).toHaveBeenCalledWith(201);

			const secondReq = {
				body: buildValidBody({
					email: "  DUPLICATE.USER@EXAMPLE.COM  ",
					name: "Another Name",
				}),
			};
			const secondRes = createResponse();

			await registerController(secondReq, secondRes);

			expect(secondRes.status).toHaveBeenCalledWith(200);
			expect(secondRes.send).toHaveBeenCalledWith({
				success: false,
				message: "Already registered, please login",
			});
		});
	});

	describe("Sanitization Contract", () => {
		test("stores NAME/email@example.com/answer exactly per normalization contract", async () => {
			const req = {
				body: buildValidBody({
					name: "  NAME  ",
					email: "  EMAIL@Example.com  ",
					answer: "  Answer  ",
				}),
			};
			const res = createResponse();

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			const persistedUser = await userModel.findOne({ email: "email@example.com" });
			expect(persistedUser).not.toBeNull();
			expect(persistedUser.name).toBe("NAME");
			expect(persistedUser.email).toBe("email@example.com");
			expect(persistedUser.answer).toBe("answer");
		});
	});

	describe("Security/Privacy Boundaries", () => {
		test("does not leak password hash or answer in success response", async () => {
			const req = {
				body: buildValidBody({ email: "privacy.user@example.com" }),
			};
			const res = createResponse();

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			const payload = res.send.mock.calls[0][0];
			expect(payload.user.password).toBeUndefined();
			expect(payload.user.answer).toBeUndefined();
			expect(payload.user).not.toHaveProperty("password");
			expect(payload.user).not.toHaveProperty("answer");
		});

		test("ignores mass-assignment attempt for role: 1 and persists default role", async () => {
			const req = {
				body: buildValidBody({
					email: "mass.assignment@example.com",
					role: 1,
				}),
			};
			const res = createResponse();

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(201);
			const persistedUser = await userModel.findOne({ email: "mass.assignment@example.com" });
			expect(persistedUser).not.toBeNull();
			expect(persistedUser.role).toBe(0);
		});
	});

	describe("Error Path Contract", () => {
		test("returns 500 on unexpected system failure", async () => {
			const req = {
				body: buildValidBody({ email: "error.path@example.com" }),
			};
			const res = createResponse();
			const dbError = new Error("Database failure");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			jest.spyOn(userModel, "findOne").mockRejectedValue(dbError);

			await registerController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error in Registration",
				error: dbError,
			});

			consoleSpy.mockRestore();
		});
	});
});
