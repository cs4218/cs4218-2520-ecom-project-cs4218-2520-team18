// Loh Ze Qing Norbert, A0277473R

import express from "express";
import JWT from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import authRoutes from "./authRoute.js";
import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";

jest.setTimeout(30000);

describe("authRoute - Integration Tests (Supertest)", () => {
	let mongoServer;
	let app;
	let userCounter = 0;
	const originalJwtSecret = process.env.JWT_SECRET;

	const authHeader = (token) => ({
		Authorization: `Bearer ${token}`,
	});

	const createToken = (userId, secret = process.env.JWT_SECRET) => {
		return JWT.sign({ _id: userId.toString() }, secret, { expiresIn: "1h" });
	};

	const seedUser = async (overrides = {}) => {
		userCounter += 1;
		return userModel.create({
			name: "Route Integration User",
			email: `route.integration.${userCounter}@example.com`,
			password: "OldPassword123",
			phone: "+14155552671",
			address: "123 Integration Street",
			answer: "blue",
			DOB: "2000-01-01",
			role: 0,
			...overrides,
		});
	};

	beforeAll(async () => {
		process.env.JWT_SECRET = "integration_route_jwt_secret";
		mongoServer = await MongoMemoryServer.create();
		await mongoose.connect(mongoServer.getUri(), {
			dbName: "auth-route-integration-tests",
		});

		app = express();
		app.use(express.json());
		app.use("/api/v1/auth", authRoutes);
	});

	beforeEach(async () => {
		await userModel.deleteMany({});
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		process.env.JWT_SECRET = originalJwtSecret;
		await mongoose.connection.dropDatabase();
		await mongoose.connection.close();
		await mongoServer.stop();
	});

	describe("Public Auth Routes", () => {
		test("POST /register creates new user and strips sensitive fields", async () => {
			const res = await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: " New User ",
					email: " NEW.USER@Example.com ",
					password: "Password123",
					phone: "+14155552672",
					address: " 12 New Street ",
					DOB: "2000-01-01",
					answer: " Blue ",
				});

			expect(res.status).toBe(201);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe("User Registered Successfully");
			expect(res.body.user).not.toHaveProperty("password");
			expect(res.body.user).not.toHaveProperty("answer");

			const dbUser = await userModel.findOne({ email: "new.user@example.com" });
			expect(dbUser).not.toBeNull();
			expect(dbUser.name).toBe("New User");
			expect(dbUser.answer).toBe("blue");
			expect(dbUser.password).not.toBe("Password123");
		});

		test("POST /register returns 200 when email already exists", async () => {
			await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: "First User",
					email: "duplicate@example.com",
					password: "Password123",
					phone: "+14155552673",
					address: "Address",
					DOB: "2000-01-01",
					answer: "blue",
				});

			const duplicateRes = await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: "Second User",
					email: "DUPLICATE@EXAMPLE.COM",
					password: "Password123",
					phone: "+14155552674",
					address: "Address",
					DOB: "2000-01-01",
					answer: "blue",
				});

			expect(duplicateRes.status).toBe(200);
			expect(duplicateRes.body).toEqual({
				success: false,
				message: "Already registered, please login",
			});
		});

		test("POST /login returns token for valid credentials", async () => {
			await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: "Login User",
					email: "login.user@example.com",
					password: "Password123",
					phone: "+14155552675",
					address: "Address",
					DOB: "2000-01-01",
					answer: "blue",
				});

			const loginRes = await request(app)
				.post("/api/v1/auth/login")
				.send({ email: " LOGIN.USER@EXAMPLE.COM ", password: "Password123" });

			expect(loginRes.status).toBe(200);
			expect(loginRes.body.success).toBe(true);
			expect(loginRes.body.message).toBe("Login Successful");
			expect(loginRes.body).toHaveProperty("token");
			expect(loginRes.body.user.email).toBe("login.user@example.com");
		});

		test("POST /login returns 400 for invalid credentials", async () => {
			const hashedPassword = await hashPassword("Password123");
			await seedUser({
				email: "invalid.login@example.com",
				password: hashedPassword,
			});

			const loginRes = await request(app)
				.post("/api/v1/auth/login")
				.send({ email: "invalid.login@example.com", password: "WrongPassword" });

			expect(loginRes.status).toBe(400);
			expect(loginRes.body).toEqual({
				success: false,
				message: "Invalid Email or Password",
			});
		});

		test("POST /forgot-password resets password for valid email/answer", async () => {
			const hashedPassword = await hashPassword("OldPassword123");
			const user = await seedUser({
				email: "forgot.user@example.com",
				answer: "blue",
				password: hashedPassword,
			});

			const res = await request(app)
				.post("/api/v1/auth/forgot-password")
				.send({
					email: " FORGOT.USER@EXAMPLE.COM ",
					answer: " BLUE ",
					newPassword: "Reset456",
				});

			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				success: true,
				message: "Password Reset Successfully",
			});

			const dbUser = await userModel.findById(user._id);
			expect(dbUser.password).not.toBe("Reset456");
			expect(await comparePassword("Reset456", dbUser.password)).toBe(true);
		});

		test("POST /forgot-password returns 400 for mismatched email/answer", async () => {
			const hashedPassword = await hashPassword("OldPassword123");
			await seedUser({
				email: "forgot.invalid@example.com",
				answer: "blue",
				password: hashedPassword,
			});

			const res = await request(app)
				.post("/api/v1/auth/forgot-password")
				.send({
					email: "forgot.invalid@example.com",
					answer: "wrong-answer",
					newPassword: "Reset456",
				});

			expect(res.status).toBe(400);
			expect(res.body).toEqual({
				success: false,
				message: "Invalid Email or Answer",
			});
		});
	});

	describe("Route-Level Handshakes", () => {
		test("register to login handshake works end-to-end with persisted hash comparison", async () => {
			const registerEmail = "handshake.route.user@example.com";
			const registerPassword = "RouteHandshake123";

			const registerRes = await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: "Route Handshake User",
					email: registerEmail,
					password: registerPassword,
					phone: "+14155552679",
					address: "Handshake Street",
					DOB: "2000-01-01",
					answer: "blue",
				});

			expect(registerRes.status).toBe(201);

			const persistedUser = await userModel.findOne({ email: registerEmail });
			expect(persistedUser).not.toBeNull();
			expect(persistedUser.password).not.toBe(registerPassword);
			expect(await comparePassword(registerPassword, persistedUser.password)).toBe(true);

			const loginRes = await request(app)
				.post("/api/v1/auth/login")
				.send({ email: registerEmail, password: registerPassword });

			expect(loginRes.status).toBe(200);
			expect(loginRes.body.success).toBe(true);
			expect(loginRes.body.message).toBe("Login Successful");
			expect(loginRes.body).toHaveProperty("token");
			expect(loginRes.body.user.email).toBe(registerEmail);
		});

		test("login token passes auth middleware and updates profile on protected route", async () => {
			const registerEmail = "handshake.profile.route@example.com";
			const registerPassword = "ProfileRoute123";

			const registerRes = await request(app)
				.post("/api/v1/auth/register")
				.send({
					name: "Profile Route User",
					email: registerEmail,
					password: registerPassword,
					phone: "+14155552680",
					address: "Old Route Address",
					DOB: "2000-01-01",
					answer: "blue",
				});
			expect(registerRes.status).toBe(201);

			const loginRes = await request(app)
				.post("/api/v1/auth/login")
				.send({ email: registerEmail, password: registerPassword });
			expect(loginRes.status).toBe(200);

			const token = loginRes.body.token;
			const profileRes = await request(app)
				.put("/api/v1/auth/profile")
				.set(authHeader(token))
				.send({
					name: "Updated Route User",
					address: "Updated Route Address",
				});

			expect(profileRes.status).toBe(200);
			expect(profileRes.body.success).toBe(true);
			expect(profileRes.body.message).toBe("Profile Updated Successfully");

			const dbUser = await userModel.findOne({ email: registerEmail });
			expect(dbUser).not.toBeNull();
			expect(dbUser.name).toBe("Updated Route User");
			expect(dbUser.address).toBe("Updated Route Address");
			expect(dbUser.phone).toBe("+14155552680");
			expect(dbUser.DOB).toBe("2000-01-01");
			expect(dbUser.answer).toBe("blue");
			expect(dbUser.role).toBe(0);
		});
	});

	describe("Protected Route Access", () => {
		test("GET /user-auth returns 200 and ok=true for valid signed token", async () => {
			const user = await seedUser();
			const token = createToken(user._id);

			const res = await request(app)
				.get("/api/v1/auth/user-auth")
				.set(authHeader(token));

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ ok: true });
		});

		test("GET /admin-auth returns 200 for admin user", async () => {
			const admin = await seedUser({ role: 1 });
			const token = createToken(admin._id);

			const res = await request(app)
				.get("/api/v1/auth/admin-auth")
				.set(authHeader(token));

			expect(res.status).toBe(200);
			expect(res.body).toEqual({ ok: true });
		});

		test("GET /test returns protected-controller success payload for admin", async () => {
			const admin = await seedUser({ role: 1 });
			const token = createToken(admin._id);

			const res = await request(app)
				.get("/api/v1/auth/test")
				.set(authHeader(token));

			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				success: true,
				message: "Protected route accessed successfully",
			});
		});
	});

	describe("Authentication and Authorization Rejections", () => {
		test.each([
			["missing header", undefined],
			["empty header", ""],
			["just bearer", "Bearer"],
		])("GET /user-auth returns 401 for %s", async (_label, headerValue) => {
			const reqBuilder = request(app).get("/api/v1/auth/user-auth");
			const res = headerValue === undefined
				? await reqBuilder
				: await reqBuilder.set("Authorization", headerValue);

			expect(res.status).toBe(401);
			expect(res.body).toEqual({
				success: false,
				message: "Authorization header is invalid",
			});
		});

		test("GET /user-auth returns 401 for forged token (wrong secret)", async () => {
			const user = await seedUser();
			const forgedToken = createToken(user._id, "wrong_secret");

			const res = await request(app)
				.get("/api/v1/auth/user-auth")
				.set(authHeader(forgedToken));

			expect(res.status).toBe(401);
			expect(res.body.success).toBe(false);
			expect(res.body.message).toBe("Unauthorized Access");
			expect(res.body).toHaveProperty("error");
		});

		test("GET /admin-auth returns 403 for non-admin user", async () => {
			const user = await seedUser({ role: 0 });
			const token = createToken(user._id);

			const res = await request(app)
				.get("/api/v1/auth/admin-auth")
				.set(authHeader(token));

			expect(res.status).toBe(403);
			expect(res.body).toEqual({
				success: false,
				message: "Unauthorized Access",
			});
		});

		test("GET /test returns 401 without token", async () => {
			const res = await request(app).get("/api/v1/auth/test");

			expect(res.status).toBe(401);
			expect(res.body).toEqual({
				success: false,
				message: "Authorization header is invalid",
			});
		});
	});

	describe("Profile Update Through Route", () => {
		test("PUT /profile updates only provided field and preserves omitted fields", async () => {
			const user = await seedUser({
				name: "Old Name",
				phone: "+14155552671",
				address: "Old Address",
				DOB: "2000-01-01",
			});
			const token = createToken(user._id);

			const res = await request(app)
				.put("/api/v1/auth/profile")
				.set(authHeader(token))
				.send({ name: "New Name" });

			expect(res.status).toBe(200);
			expect(res.body.success).toBe(true);
			expect(res.body.message).toBe("Profile Updated Successfully");
			expect(res.body.updatedUser).not.toHaveProperty("password");
			expect(res.body.updatedUser.name ?? res.body.updatedUser._doc?.name).toBe("New Name");

			const dbUser = await userModel.findById(user._id);
			expect(dbUser.name).toBe("New Name");
			expect(dbUser.phone).toBe("+14155552671");
			expect(dbUser.address).toBe("Old Address");
			expect(dbUser.DOB).toBe("2000-01-01");
		});

		test("PUT /profile uses req.user._id from token and ignores body _id", async () => {
			const tokenUser = await seedUser({ name: "Token User" });
			const bodyUser = await seedUser({ name: "Body User" });
			const token = createToken(tokenUser._id);

			const res = await request(app)
				.put("/api/v1/auth/profile")
				.set(authHeader(token))
				.send({
					_id: bodyUser._id.toString(),
					name: "Updated Through Token",
				});

			expect(res.status).toBe(200);

			const refreshedTokenUser = await userModel.findById(tokenUser._id);
			const refreshedBodyUser = await userModel.findById(bodyUser._id);

			expect(refreshedTokenUser.name).toBe("Updated Through Token");
			expect(refreshedBodyUser.name).toBe("Body User");
		});

		test("PUT /profile hashes password and does not persist plaintext", async () => {
			const user = await seedUser({ password: "OldPassword123" });
			const token = createToken(user._id);
			const newPassword = "NewPassword456";

			const res = await request(app)
				.put("/api/v1/auth/profile")
				.set(authHeader(token))
				.send({ password: newPassword });

			expect(res.status).toBe(200);

			const dbUser = await userModel.findById(user._id);
			expect(dbUser.password).not.toBe(newPassword);
			const isMatch = await comparePassword(newPassword, dbUser.password);
			expect(isMatch).toBe(true);
		});

		test("PUT /profile returns 400 for empty body", async () => {
			const user = await seedUser();
			const token = createToken(user._id);

			const res = await request(app)
				.put("/api/v1/auth/profile")
				.set(authHeader(token))
				.send({});

			expect(res.status).toBe(400);
			expect(res.body).toEqual({
				success: false,
				message: "Request body is empty",
			});
		});
	});
});
