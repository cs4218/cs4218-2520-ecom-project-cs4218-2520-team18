// Loh Ze Qing Norbert, A0277473R

import bcrypt from "bcrypt";
import { comparePassword, hashPassword } from "./authHelper.js";

jest.setTimeout(30000);

describe("authHelper - Integration Tests (bcrypt Boundary)", () => {
	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("The Happy Path (Real Dependency Execution)", () => {
		test("hashPassword integrates with bcrypt to produce a valid salt and hash", async () => {
			const plainPassword = "S3cret-Alpha-123!";

			const hashedPassword = await hashPassword(plainPassword);

			expect(hashedPassword).toBeDefined();
			expect(typeof hashedPassword).toBe("string");
			expect(hashedPassword).not.toBe(plainPassword);
			expect(hashedPassword.startsWith("$2")).toBe(true);
			expect(hashedPassword.length).toBeGreaterThan(20);
		});

		test("comparePassword integrates with bcrypt to successfully match correct passwords", async () => {
			const plainPassword = "Auth-Token-456";
			const hashedPassword = await hashPassword(plainPassword);

			const isMatch = await comparePassword(plainPassword, hashedPassword);

			expect(isMatch).toBe(true);
		});

		test("comparePassword integrates with bcrypt to correctly reject wrong passwords", async () => {
			const plainPassword = "Cipher-789";
			const wrongPassword = "Mismatch-000";
			const hashedPassword = await hashPassword(plainPassword);

			const isMatch = await comparePassword(wrongPassword, hashedPassword);

			expect(isMatch).toBe(false);
		});
	});

	describe("Error Path Contract", () => {
		test("hashPassword throws custom error when bcrypt fails", async () => {
			const mockError = new Error("Simulated bcrypt crash");
			jest.spyOn(bcrypt, "hash").mockRejectedValueOnce(mockError);
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			await expect(hashPassword("password")).rejects.toThrow("Bcrypt hashing failed");
			expect(consoleSpy).toHaveBeenCalledWith(mockError);

			consoleSpy.mockRestore();
		});

		test("comparePassword throws custom error when bcrypt fails", async () => {
			const mockError = new Error("Simulated compare crash");
			jest.spyOn(bcrypt, "compare").mockRejectedValueOnce(mockError);
			const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

			await expect(comparePassword("password", "hash")).rejects.toThrow("Bcrypt compare error");
			expect(consoleSpy).toHaveBeenCalledWith(mockError);

			consoleSpy.mockRestore();
		});
	});
});
