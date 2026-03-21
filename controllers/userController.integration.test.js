// Loh Ze Qing Norbert, A0277473R

import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import * as authHelper from "../helpers/authHelper.js";
import * as validationHelper from "../helpers/validationHelper.js";
import userModel from "../models/userModel.js";
import { loginController } from "./loginController.js";
import { updateProfileController, getAllUsersController } from "./userController.js";
import { registerController } from "./registerController.js";

jest.setTimeout(30000);

describe("updateProfileController - Integration Tests", () => {
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
			name: "Existing User",
			email: `user.update.integration.${userCounter}@example.com`,
			password: hashedPassword,
			phone: "+14155552671",
			address: "123 Existing Street",
			answer: "blue",
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
			dbName: "user-controller-integration-tests",
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
		test("register-to-profile handshake preserves user integrity across controller operations", async () => {
			userCounter += 1;
			const registrationEmail = `register.profile.handshake.${userCounter}@example.com`;
			const registrationPassword = "RegisterPass123";

			const registerReq = {
				body: {
					name: "Handshake User",
					email: registrationEmail,
					password: registrationPassword,
					phone: "+14155552671",
					address: "123 Register Street",
					DOB: "2000-01-01",
					answer: "blue",
				},
			};
			const registerRes = createResponse();

			await registerController(registerReq, registerRes);

			expect(registerRes.status).toHaveBeenCalledWith(201);

			const registeredUser = await userModel.findOne({ email: registrationEmail });
			expect(registeredUser).not.toBeNull();
			expect(registeredUser.password).not.toBe(registrationPassword);

			const updateReq = {
				user: { _id: registeredUser._id },
				body: {
					name: "Updated Handshake User",
					phone: "+14155550000",
					address: "456 Updated Street",
					DOB: "1999-09-09",
				},
			};
			const updateRes = createResponse();

			await updateProfileController(updateReq, updateRes);

			expect(updateRes.status).toHaveBeenCalledWith(200);

			const updatedUser = await userModel.findById(registeredUser._id);
			expect(updatedUser).not.toBeNull();
			expect(updatedUser.name).toBe("Updated Handshake User");
			expect(updatedUser.phone).toBe("+14155550000");
			expect(updatedUser.address).toBe("456 Updated Street");
			expect(updatedUser.DOB).toBe("1999-09-09");
			expect(updatedUser.email).toBe(registrationEmail);
			expect(updatedUser.answer).toBe("blue");
			expect(updatedUser.role).toBe(0);
			expect(updatedUser.password).toBe(registeredUser.password);

			const originalPasswordStillValid = await bcrypt.compare(registrationPassword, updatedUser.password);
			expect(originalPasswordStillValid).toBe(true);
		});

		test("ignores req.body _id and strictly uses req.user._id", async () => {
			const actualUser = await createSeedUser({ name: "Trusted User" });
			const otherUser = await createSeedUser({ name: "Body ID User" });

			const req = {
				user: { _id: actualUser._id },
				body: {
					_id: otherUser._id,
					name: "Updated Trusted User",
				},
			};
			const res = createResponse();

			const findByIdSpy = jest.spyOn(userModel, "findById");
			const updateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

			await updateProfileController(req, res);

			expect(findByIdSpy).toHaveBeenCalledWith(actualUser._id);
			expect(updateSpy).toHaveBeenCalledWith(
				actualUser._id,
				expect.objectContaining({ name: "Updated Trusted User" }),
				{ new: true },
			);

			const dbActualUser = await userModel.findById(actualUser._id);
			const dbOtherUser = await userModel.findById(otherUser._id);
			expect(dbActualUser.name).toBe("Updated Trusted User");
			expect(dbOtherUser.name).toBe("Body ID User");
		});

		test("calls only relevant validation helper for provided fields", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { name: "Only Name Changed" },
			};
			const res = createResponse();

			const passwordSpy = jest.spyOn(validationHelper, "validatePassword");
			const phoneSpy = jest.spyOn(validationHelper, "validatePhoneE164");
			const dobSpy = jest.spyOn(validationHelper, "validateDOB");
			const dobFutureSpy = jest.spyOn(validationHelper, "validateDOBNotFuture");

			await updateProfileController(req, res);

			expect(passwordSpy).not.toHaveBeenCalled();
			expect(phoneSpy).not.toHaveBeenCalled();
			expect(dobSpy).not.toHaveBeenCalled();
			expect(dobFutureSpy).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
		});

		test("validates provided phone and blocks invalid format", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { phone: "invalid-phone" },
			};
			const res = createResponse();

			const phoneSpy = jest.spyOn(validationHelper, "validatePhoneE164");
			const updateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

			await updateProfileController(req, res);

			expect(phoneSpy).toHaveBeenCalledWith("invalid-phone");
			expect(updateSpy).not.toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Phone Number",
			});
		});

		test("hashes password only when provided and waits before update", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { password: "NewPassword123" },
			};
			const res = createResponse();

			const hashSpy = jest.spyOn(authHelper, "hashPassword");
			const updateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

			await updateProfileController(req, res);

			expect(hashSpy).toHaveBeenCalledWith("NewPassword123");
			expect(hashSpy.mock.invocationCallOrder[0]).toBeLessThan(updateSpy.mock.invocationCallOrder[0]);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		test("bypasses hashPassword when password is omitted", async () => {
			const user = await createSeedUser({ name: "Original Name" });
			const req = {
				user: { _id: user._id },
				body: { address: "456 New Address" },
			};
			const res = createResponse();

			const hashSpy = jest.spyOn(authHelper, "hashPassword");

			await updateProfileController(req, res);

			expect(hashSpy).not.toHaveBeenCalled();
			const updatedUser = await userModel.findById(user._id);
			expect(updatedUser.address).toBe("456 New Address");
			expect(updatedUser.password).toBe(user.password);
		});

		test("passes fallback merge values to findByIdAndUpdate", async () => {
			const user = await createSeedUser({
				name: "Before Name",
				phone: "+15550001111",
				address: "Before Address",
				DOB: "1999-09-09",
			});
			const req = {
				user: { _id: user._id },
				body: { name: "After Name" },
			};
			const res = createResponse();

			const updateSpy = jest.spyOn(userModel, "findByIdAndUpdate");

			await updateProfileController(req, res);

			expect(updateSpy).toHaveBeenCalledWith(
				user._id,
				{
					name: "After Name",
					password: user.password,
					phone: "+15550001111",
					address: "Before Address",
					DOB: "1999-09-09",
				},
				{ new: true },
			);
		});

		test("profile update to password enforces new login and rejects old login", async () => {
			process.env.JWT_SECRET = "integration_jwt_secret";
			userCounter += 1;
			const email = `profile.login.flow.${userCounter}@example.com`;
			const originalPassword = "OriginalPass123";
			const newPassword = "UpdatedPass456";

			const registerReq = {
				body: {
					name: "Profile Login Flow User",
					email,
					password: originalPassword,
					phone: "+14155552671",
					address: "123 Profile Flow Street",
					DOB: "2000-01-01",
					answer: "blue",
				},
			};
			const registerRes = createResponse();

			await registerController(registerReq, registerRes);

			expect(registerRes.status).toHaveBeenCalledWith(201);

			const registeredUser = await userModel.findOne({ email });
			expect(registeredUser).not.toBeNull();

			const updateReq = {
				user: { _id: registeredUser._id },
				body: {
					password: newPassword,
					address: "456 Updated Profile Flow Street",
				},
			};
			const updateRes = createResponse();

			await updateProfileController(updateReq, updateRes);

			expect(updateRes.status).toHaveBeenCalledWith(200);

			const oldLoginReq = {
				body: {
					email,
					password: originalPassword,
				},
			};
			const oldLoginRes = createResponse();

			await loginController(oldLoginReq, oldLoginRes);

			expect(oldLoginRes.status).toHaveBeenCalledWith(400);
			expect(oldLoginRes.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid Email or Password",
			});

			const newLoginReq = {
				body: {
					email,
					password: newPassword,
				},
			};
			const newLoginRes = createResponse();

			await loginController(newLoginReq, newLoginRes);

			expect(newLoginRes.status).toHaveBeenCalledWith(200);
			expect(newLoginRes.send).toHaveBeenCalledWith(
				expect.objectContaining({
					success: true,
					message: "Login Successful",
					token: expect.any(String),
					user: expect.objectContaining({ email }),
				}),
			);
		});
	});

	describe("The Happy Path (The Merge Tests)", () => {
		test("full profile update updates all five mutable fields", async () => {
			const user = await createSeedUser({
				name: "Old Name",
				phone: "+14155552671",
				address: "Old Address",
				DOB: "2000-01-01",
			});

			const req = {
				user: { _id: user._id },
				body: {
					name: "New Name",
					password: "BrandNewPass123",
					phone: "+14155550000",
					address: "New Address",
					DOB: "1995-05-05",
				},
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const dbUser = await userModel.findById(user._id);
			expect(dbUser.name).toBe("New Name");
			expect(dbUser.phone).toBe("+14155550000");
			expect(dbUser.address).toBe("New Address");
			expect(dbUser.DOB).toBe("1995-05-05");
			expect(dbUser.password).not.toBe("BrandNewPass123");
			const isMatch = await bcrypt.compare("BrandNewPass123", dbUser.password);
			expect(isMatch).toBe(true);
		});

		test("partial profile update updates only name and preserves all omitted fields", async () => {
			const user = await createSeedUser({
				name: "Old Name",
				phone: "+14155552671",
				address: "Old Address",
				DOB: "2000-01-01",
			});

			const req = {
				user: { _id: user._id },
				body: {
					name: "New Name",
				},
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const dbUser = await userModel.findById(user._id);
			expect(dbUser.name).toBe("New Name");
			expect(dbUser.phone).toBe("+14155552671");
			expect(dbUser.address).toBe("Old Address");
			expect(dbUser.DOB).toBe("2000-01-01");
			expect(dbUser.password).toBe(user.password);
		});
	});

	describe("Validation / Negative Paths", () => {
		test("returns 400 for an empty request body", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: {},
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Request body is empty",
			});
		});

		test("returns 400 when any provided field is explicitly null", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { phone: null },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid input. phone cannot be null.",
			});
		});

		test("returns 400 for empty strings after trimming", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { address: "   " },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Address cannot be empty",
			});
		});

		test.each([
			["name", "   ", "Name cannot be empty"],
			["password", "", "Password cannot be empty"],
			["phone", "   ", "Phone cannot be empty"],
			["DOB", "   ", "DOB cannot be empty"],
		])("returns 400 when %s is empty after trimming", async (field, value, expectedMessage) => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { [field]: value },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: expectedMessage,
			});
		});

		test("returns 400 for invalid DOB format", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { DOB: "01-01-2000" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid DOB format. Please use YYYY-MM-DD",
			});
		});

		test("returns 400 for short password", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { password: "123" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Password must be at least 6 characters long",
			});
		});

		test("returns 400 for future DOB", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { DOB: "2099-01-01" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Invalid or future DOB",
			});
		});

		test("returns 404 when req.user._id does not exist in database", async () => {
			const nonExistentId = new mongoose.Types.ObjectId();
			const req = {
				user: { _id: nonExistentId },
				body: { name: "New Name" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "User not found",
			});
		});
	});

	describe("Sanitization Contract", () => {
		test("trims whitespace for provided fields before persistence", async () => {
			const user = await createSeedUser({ name: "Original Name" });
			const req = {
				user: { _id: user._id },
				body: { name: "  New Name  " },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const dbUser = await userModel.findById(user._id);
			expect(dbUser.name).toBe("New Name");
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("stores hashed password instead of plaintext when password is updated", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { password: "UltraSecretPass999" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const dbUser = await userModel.findById(user._id);
			expect(dbUser.password).not.toBe("UltraSecretPass999");

			const isMatch = await bcrypt.compare("UltraSecretPass999", dbUser.password);
			expect(isMatch).toBe(true);
		});

		test("strips password from response payload on successful update", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { name: "Response Safe Name" },
			};
			const res = createResponse();

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const payload = res.send.mock.calls[0][0];
			expect(payload.success).toBe(true);
			expect(payload.updatedUser).not.toHaveProperty("password");
			expect(payload.updatedUser.password).toBeUndefined();
		});

		test("returns 500 without raw error leak when database throws", async () => {
			const user = await createSeedUser();
			const req = {
				user: { _id: user._id },
				body: { name: "Error Path" },
			};
			const res = createResponse();
			const dbError = new Error("Simulated DB failure");
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			jest.spyOn(userModel, "findById").mockRejectedValue(dbError);

			await updateProfileController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error while updating profile",
                error: dbError,
			});

			consoleSpy.mockRestore();
		});
	});
});

// Billy Ho Cheng En, A0252588R
describe("getAllUsersController - Integration Tests", () => {
	let mongoServer;
	let userCounter = 0;

	const createResponse = () => ({
		status: jest.fn().mockReturnThis(),
		send: jest.fn(),
		json: jest.fn(),
	});

	const seedUser = async (overrides = {}) => {
		userCounter += 1;
		const plainPassword = overrides.password ?? "TestPassword123";
		const hashedPassword = await authHelper.hashPassword(plainPassword);

		return userModel.create({
			name: `Test User ${userCounter}`,
			email: `user.getall.${userCounter}.${Date.now()}@example.com`,
			password: hashedPassword,
			phone: "+14155552671",
			address: "123 Test Street",
			answer: "blue",
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
			dbName: "get-all-users-integration-tests",
		});
	});

	beforeEach(async () => {
		await userModel.deleteMany({});
		userCounter = 0;
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await mongoose.connection.dropDatabase();
		await mongoose.connection.close();
		await mongoServer.stop();
	});

	describe("Successful Retrieval", () => {
		test("returns all users when users exist in database", async () => {
			await seedUser({ name: "User One", email: "one@example.com" });
			await seedUser({ name: "User Two", email: "two@example.com" });
			await seedUser({ name: "User Three", email: "three@example.com" });

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			expect(responseData.success).toBe(true);
			expect(responseData.users).toHaveLength(3);
		});

		test("returns empty array when no users exist", async () => {
			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			expect(responseData.success).toBe(true);
			expect(responseData.users).toHaveLength(0);
		});

		test("returns users sorted by createdAt descending (newest first)", async () => {
			const user1 = await seedUser({ name: "First User" });
			// Small delay to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));
			const user2 = await seedUser({ name: "Second User" });
			await new Promise((resolve) => setTimeout(resolve, 10));
			const user3 = await seedUser({ name: "Third User" });

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			expect(responseData.users[0].name).toBe("Third User");
			expect(responseData.users[1].name).toBe("Second User");
			expect(responseData.users[2].name).toBe("First User");
		});
	});

	describe("Security / Privacy Boundaries", () => {
		test("excludes password field from response", async () => {
			await seedUser({ name: "Secure User" });

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			const user = responseData.users[0].toObject ? responseData.users[0].toObject() : responseData.users[0];
			expect(user.password).toBeUndefined();
		});

		test("excludes answer (security question) field from response", async () => {
			await seedUser({ name: "Secure User", answer: "secret-answer" });

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			const user = responseData.users[0].toObject ? responseData.users[0].toObject() : responseData.users[0];
			expect(user.answer).toBeUndefined();
		});

		test("returns user fields: name, email, phone, role, address", async () => {
			await seedUser({
				name: "Complete User",
				email: "complete@example.com",
				phone: "+14155559999",
				role: 1,
				address: "456 Complete St",
			});

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			const user = responseData.users[0];
			expect(user.name).toBe("Complete User");
			expect(user.email).toBe("complete@example.com");
			expect(user.phone).toBe("+14155559999");
			expect(user.role).toBe(1);
			expect(user.address).toBe("456 Complete St");
		});
	});

	describe("User Role Handling", () => {
		test("returns both admin (role=1) and regular (role=0) users", async () => {
			await seedUser({ name: "Regular User", role: 0 });
			await seedUser({ name: "Admin User", role: 1 });

			const req = {};
			const res = createResponse();

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			const responseData = res.send.mock.calls[0][0];
			expect(responseData.users).toHaveLength(2);

			const roles = responseData.users.map((u) => u.role);
			expect(roles).toContain(0);
			expect(roles).toContain(1);
		});
	});

	describe("Error Handling", () => {
		test("returns 500 when database throws an error", async () => {
			const req = {};
			const res = createResponse();
			const dbError = new Error("Database connection failed");
			const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

			jest.spyOn(userModel, "find").mockImplementation(() => {
				throw dbError;
			});

			await getAllUsersController(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.send).toHaveBeenCalledWith({
				success: false,
				message: "Error while getting all users",
				error: dbError,
			});

			consoleSpy.mockRestore();
		});
	});
});
