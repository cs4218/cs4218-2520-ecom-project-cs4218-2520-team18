// Loh Ze Qing Norbert, A0277473R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import userModel from "./userModel.js";

jest.setTimeout(30000);

describe("User Model - Integration Tests with Mongo Memory Server", () => {
	let mongoServer;
	let emailCounter = 0;

	const buildValidUser = (overrides = {}) => {
		emailCounter += 1;
		const generatedPassword = `pw-${Math.random().toString(36).slice(2, 10)}`;
		return {
			name: "Integration User",
			email: `integration.user.${emailCounter}@example.com`,
			password: generatedPassword,
			phone: "+14155552671",
			address: "123 Integration Street",
			answer: "blue",
			DOB: "2000-01-01",
			...overrides,
		};
	};

	beforeAll(async () => {
		mongoServer = await MongoMemoryServer.create();
		const mongoUri = mongoServer.getUri();
		await mongoose.connect(mongoUri, {
			dbName: "user-model-integration-tests",
		});
	});

	afterEach(async () => {
		await userModel.deleteMany({});
	});

	afterAll(async () => {
		await mongoose.connection.dropDatabase();
		await mongoose.connection.close();
		await mongoServer.stop();
	});

	test("should save a valid user document", async () => {
		const user = new userModel(buildValidUser());
		const savedUser = await user.save();

		expect(savedUser._id).toBeDefined();
		expect(savedUser.name).toBe("Integration User");
		expect(savedUser.email.endsWith("@example.com")).toBe(true);
		expect(savedUser.createdAt).toBeDefined();
		expect(savedUser.updatedAt).toBeDefined();
	});

	test.each([
		[
			"valid minimal phone digits",
			{
				phone: "+12",
			},
		],
		[
			"valid long phone digits",
			{
				phone: "+123456789012345",
			},
		],
		[
			"valid leap-year DOB",
			{
				DOB: "2020-02-29",
			},
		],
		[
			"valid role override",
			{
				role: 1,
			},
		],
	])("should save for %s", async (_caseName, overrides) => {
		const savedUser = await new userModel(buildValidUser(overrides)).save();

		expect(savedUser._id).toBeDefined();
		expect(savedUser.createdAt).toBeDefined();
		expect(savedUser.updatedAt).toBeDefined();
	});

	test("should enforce unique email constraint", async () => {
		const email = "duplicate.user.fixed@example.com";
		await new userModel(buildValidUser({ email })).save();

		const duplicateUser = new userModel(
			buildValidUser({
				email,
				phone: "+12125551234",
			}),
		);

		await expect(duplicateUser.save()).rejects.toMatchObject({ code: 11000 });
	});

	test("should create a unique index on email in MongoDB", async () => {
		const indexes = await userModel.collection.indexes();
		const emailIndex = indexes.find((index) => index.key && index.key.email === 1);

		expect(emailIndex).toBeDefined();
		expect(emailIndex.unique).toBe(true);
	});

	test("should reject future DOB during save", async () => {
		const nextYear = new Date().getFullYear() + 1;
		const futureDOB = `${nextYear}-01-01`;

		const user = new userModel(
			buildValidUser({
				email: "future.dob@example.com",
				DOB: futureDOB,
			}),
		);

		await expect(user.save()).rejects.toMatchObject({
			name: "ValidationError",
			errors: {
				DOB: expect.any(Object),
			},
		});
	});

	test("should trim and lowercase configured fields before save", async () => {
		const user = new userModel(
			buildValidUser({
				email: "  CASE.USER@EXAMPLE.COM  ",
				phone: "  +14155552671  ",
			}),
		);

		const savedUser = await user.save();

		expect(savedUser.email).toBe("case.user@example.com");
		expect(savedUser.phone).toBe("+14155552671");
	});

	test("should trim string fields and lowercase email correctly on persist", async () => {
		const savedUser = await new userModel(
			buildValidUser({
				name: "  John Integration  ",
				email: "  MiXeD.CASE@Example.COM  ",
				phone: "  +12125551234  ",
				address: "  88 Test Road  ",
				answer: "  Green  ",
				DOB: " 2000-01-01 ",
			}),
		).save();

		expect(savedUser.name).toBe("John Integration");
		expect(savedUser.email).toBe("mixed.case@example.com");
		expect(savedUser.phone).toBe("+12125551234");
		expect(savedUser.address).toBe("88 Test Road");
		expect(savedUser.answer).toBe("Green");
		expect(savedUser.DOB).toBe("2000-01-01");
	});

	test.each([
		["name", undefined],
		["email", undefined],
		["password", undefined],
		["phone", undefined],
		["address", undefined],
		["answer", undefined],
		["DOB", undefined],
	])("should reject save when required field %s is missing", async (field, value) => {
		const user = new userModel(buildValidUser({ [field]: value }));

		await expect(user.save()).rejects.toMatchObject({
			name: "ValidationError",
			errors: {
				[field]: expect.any(Object),
			},
		});
	});

	test.each([
		[
			"invalid email format",
			{ email: "invalid-email" },
			"email",
		],
		[
			"password too short",
			{ password: "pw-1" },
			"password",
		],
		[
			"phone with alphabetic characters",
			{ phone: "+123ABC" },
			"phone",
		],
		[
			"phone with leading zero after plus",
			{ phone: "+012345" },
			"phone",
		],
		[
			"invalid DOB format",
			{ DOB: "10-15-1995" },
			"DOB",
		],
		[
			"invalid non-existent DOB date",
			{ DOB: "2023-02-30" },
			"DOB",
		],
	])(
		"should reject save for %s",
		async (_caseName, overrides, errorField) => {
			const user = new userModel(buildValidUser(overrides));

			await expect(user.save()).rejects.toMatchObject({
				name: "ValidationError",
				errors: {
					[errorField]: expect.any(Object),
				},
			});
		},
	);

	test("should set role default to 0 when omitted", async () => {
		const userData = buildValidUser();
		delete userData.role;

		const savedUser = await new userModel(userData).save();

		expect(savedUser.role).toBe(0);
	});

	test("should cast role from numeric string to number", async () => {
		const savedUser = await new userModel(
			buildValidUser({
				role: "1",
			}),
		).save();

		expect(savedUser.role).toBe(1);
		expect(typeof savedUser.role).toBe("number");
	});

	test("should return correct values when selecting the saved user again", async () => {
		const savedUser = await new userModel(
			buildValidUser({
				name: "  Select Again User  ",
				email: "  Select.Again@Example.COM  ",
				phone: "  +14155552671  ",
				address: "  55 Query Lane  ",
				answer: "  Purple  ",
				DOB: " 1999-12-31 ",
				role: "2",
			}),
		).save();

		const selectedUser = await userModel.findById(savedUser._id);

		expect(selectedUser).toBeDefined();
		expect(selectedUser.name).toBe("Select Again User");
		expect(selectedUser.email).toBe("select.again@example.com");
		expect(selectedUser.phone).toBe("+14155552671");
		expect(selectedUser.address).toBe("55 Query Lane");
		expect(selectedUser.answer).toBe("Purple");
		expect(selectedUser.DOB).toBe("1999-12-31");
		expect(selectedUser.role).toBe(2);
		expect(typeof selectedUser.role).toBe("number");
		expect(selectedUser.createdAt).toBeDefined();
		expect(selectedUser.updatedAt).toBeDefined();
	});

	test("should reject invalid role type casting", async () => {
		const user = new userModel(
			buildValidUser({
				role: "not-a-number",
			}),
		);

		await expect(user.save()).rejects.toMatchObject({
			name: "ValidationError",
			errors: {
				role: expect.any(Object),
			},
		});
	});
});
