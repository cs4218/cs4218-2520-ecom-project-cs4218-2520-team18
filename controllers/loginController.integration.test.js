// Loh Ze Qing Norbert, A0277473R

import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authHelper from "../helpers/authHelper.js";
import * as validationHelper from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";
import { loginController } from "./loginController.js";

jest.setTimeout(30000);

describe("loginController - Integration Tests", () => {
	let mongoServer;
	let userCounter = 0;

	const createResponse = () => {
		const res = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn(),
		};
		return res;
	};

	const seedUser = async (overrides = {}) => {
		userCounter += 1;
		const password = overrides.password ?? "Password123";
		const hashedPassword = await authHelper.hashPassword(password);

		const user = await userModel.create({
			name: "Integration User",
			email: `integration.user.${userCounter}@example.com`,
			password: hashedPassword,
			phone: "+14155552671",
			address: "123 Integration Street",
			answer: "blue",
			DOB: "2000-01-01",
			role: 0,
			...overrides,
			password: hashedPassword,
		});

		return { user, plainPassword: password };
	};

	beforeAll(async () => {
		process.env.JWT_SECRET = "integration_jwt_secret";
		mongoServer = await MongoMemoryServer.create();
		const mongoUri = mongoServer.getUri();
		await mongoose.connect(mongoUri, {
			dbName: "login-controller-integration-tests",
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
		test("returns 200 and a valid JWT for registered user with correct credentials", async () => {
			const { user, plainPassword } = await seedUser();
			const req = {
				body: {
					email: user.email,
					password: plainPassword,
				},
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");
			const compareSpy = jest.spyOn(authHelper, "comparePassword");
			const validateEmailSpy = jest.spyOn(validationHelper, "validateEmail");
			const jwtSignSpy = jest.spyOn(JWT, "sign");

			await loginController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const payload = res.send.mock.calls[0][0];

			expect(payload).toEqual(
				expect.objectContaining({
					success: true,
					message: "Login Successful",
					token: expect.any(String),
					user: expect.objectContaining({
						_id: user._id,
						name: user.name,
						email: user.email,
						phone: user.phone,
						address: user.address,
						DOB: user.DOB,
						role: user.role,
					}),
				}),
			);

			const decoded = JWT.verify(payload.token, process.env.JWT_SECRET);
			expect(decoded).toEqual(expect.objectContaining({ _id: user._id.toString() }));

			expect(findOneSpy).toHaveBeenCalledWith({ email: user.email });
			expect(compareSpy).toHaveBeenCalledWith(plainPassword, user.password);
			expect(validateEmailSpy).toHaveBeenCalledWith(user.email);
			expect(jwtSignSpy).toHaveBeenCalled();
		});
	});

	describe("Authentication Failures (Negative Integration)", () => {
		test("returns 400 when password is incorrect", async () => {
			const { user } = await seedUser({ password: "CorrectPassword123" });
			const req = {
				body: {
					email: user.email,
					password: "WrongPassword999",
				},
			};
			const res = createResponse();

			const compareSpy = jest.spyOn(authHelper, "comparePassword");

			await loginController(req, res);

			expect(compareSpy).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Password",
			});
		});

		test("returns 400 when user does not exist", async () => {
			const req = {
				body: {
					email: "missing.user@example.com",
					password: "AnyPassword123",
				},
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");
			const compareSpy = jest.spyOn(authHelper, "comparePassword");

			await loginController(req, res);

			expect(findOneSpy).toHaveBeenCalledWith({ email: "missing.user@example.com" });
			expect(compareSpy).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Password",
			});
		});
	});

	describe("Input Sanitization & Validation", () => {
		test("trims and lowercases email before querying database", async () => {
			const { plainPassword } = await seedUser({ email: "user@example.com" });
			const req = {
				body: {
					email: " USER@Example.com ",
					password: plainPassword,
				},
			};
			const res = createResponse();

			const findOneSpy = jest.spyOn(userModel, "findOne");

			await loginController(req, res);

			expect(findOneSpy).toHaveBeenCalledWith({ email: "user@example.com" });
			expect(res.status).toHaveBeenCalledWith(200);
		});

		test.each([
			["empty email", "", "Password123"],
			["whitespace email", "   ", "Password123"],
			["empty password", "valid@example.com", ""],
			["undefined password", "valid@example.com", undefined],
		])("returns invalidError for %s", async (_caseName, email, password) => {
			const req = {
				body: {
					email,
					password,
				},
			};
			const res = createResponse();

			await loginController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Password",
			});
		});
	});

	describe("Security/Privacy Path", () => {
		test("does not leak password hash or secret answer in response user object", async () => {
			const { user, plainPassword } = await seedUser();
			const req = {
				body: {
					email: user.email,
					password: plainPassword,
				},
			};
			const res = createResponse();

			await loginController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const payload = res.send.mock.calls[0][0];
			expect(payload.user).not.toHaveProperty("password");
			expect(payload.user).not.toHaveProperty("answer");
		});
	});

	describe("Request/Response Contract and Error Path", () => {
		test("returns 500 and error shape when database query throws", async () => {
			const req = {
				body: {
					email: "db.error@example.com",
					password: "Password123",
				},
			};
			const res = createResponse();
			const dbError = new Error("Database unavailable");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			jest.spyOn(userModel, "findOne").mockRejectedValue(dbError);

			await loginController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error in Login",
				error: dbError,
			});

			consoleSpy.mockRestore();
		});

		test("returns 500 when JWT signing fails", async () => {
			const { user, plainPassword } = await seedUser();
			const req = {
				body: {
					email: user.email,
					password: plainPassword,
				},
			};
			const res = createResponse();
			const jwtError = new Error("JWT signing failed");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			jest.spyOn(JWT, "sign").mockImplementation(() => {
				throw jwtError;
			});

			await loginController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error in Login",
				error: jwtError,
			});

			consoleSpy.mockRestore();
		});
	});
});
