// Loh Ze Qing Norbert, A0277473R

import bcrypt from "bcrypt";
import { hashPassword, comparePassword } from "./authHelper.js";

// Mock bcrypt dependency
jest.mock("bcrypt");

describe("authHelper Utility Functions Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("hashPassword", () => {
    describe("Equivalence Partitioning (EP)", () => {
      test("should hash a standard alphanumeric password (Valid Partition)", async () => {
        // Arrange
        const password = "StandardPassword123";
        const mockHashedPassword = "hashed_password_123";
        bcrypt.hash.mockResolvedValue(mockHashedPassword);

        // Act
        const result = await hashPassword(password);

        // Assert
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        expect(result).toBe(mockHashedPassword);
      });

      test("should handle (Special Characters Partition)", async () => {
        // Arrange
        const password = "P@$$w0rd_!";
        bcrypt.hash.mockResolvedValue("mocked_unicode_hash");

        // Act
        const result = await hashPassword(password);

        // Assert
        expect(result).toBe("mocked_unicode_hash");
      });
    });

    describe("Boundary Value Analysis (BVA)", () => {
      test.each([
        ["empty string", "", 0],
        ["single character", "a", 1],
        ["near limit", "b".repeat(71), 71],
        ["limit", "c".repeat(72), 72],
        ["above limit (truncation point)", "d".repeat(73), 73],
      ])("should correctly handle %s (length: %i)", async (desc, password, len) => {
        // Arrange
        const mockHash = `hash_len_${len}`;
        bcrypt.hash.mockResolvedValue(mockHash);

        // Act
        const result = await hashPassword(password);

        // Assert
        expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
        expect(result).toBe(mockHash);
      });
    });

    describe("System Error Handling", () => {
      let consoleSpy;
      beforeEach(() => {
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      });
      afterEach(() => consoleSpy.mockRestore());

      test("should handle bcrypt failures and log errors", async () => {
        // Arrange
        const mockError = new Error("Bcrypt hashing failed");
        bcrypt.hash.mockRejectedValue(mockError);

        // Act
        await expect(hashPassword("password")).rejects.toThrow("Bcrypt hashing failed");

        // Assert
        expect(consoleSpy).toHaveBeenCalledWith(mockError);
      });
    });
  });

  describe("comparePassword", () => {
    describe("Authentication Logic (EP)", () => {
      test("should return true when passwords match", async () => {
        // Arrange
        const password = "password123";
        const hashedPassword = "hashed_password_123";
        bcrypt.compare.mockResolvedValue(true);

        // Act
        const result = await comparePassword(password, hashedPassword);

        // Assert
        expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
        expect(result).toBe(true);
      });

      test("should return false when passwords do not match", async () => {
        // Arrange
        bcrypt.compare.mockResolvedValue(false);

        // Act
        const result = await comparePassword("wrong", "hash");

        // Assert
        expect(result).toBe(false);
      });
    });

    test("should return false if hashed password is used as input", async () => {
        // Arrange
        const password = "password123";
        const hashedPassword = "hashed_password_123";
        bcrypt.compare.mockResolvedValue(false);

        // Act
        const result = await comparePassword(hashedPassword, hashedPassword);

        // Assert
        expect(result).toBe(false);
        expect(bcrypt.compare).toHaveBeenCalledWith(hashedPassword, hashedPassword);
    });

    describe("Boundary Value Analysis (BVA)", () => {
      test("should respect truncation boundary during comparison (72+ chars)", async () => {
        // Arrange
        const base = "e".repeat(72);
        const passWithExtra = base + "EXTRA_CHARS";
        const hash = "some_hash";

        bcrypt.compare.mockImplementation((pass) => {
          return Promise.resolve(pass.substring(0, 72) === base);
        });

        // Act
        const result = await comparePassword(passWithExtra, hash);

        // Assert
        expect(result).toBe(true);
        expect(bcrypt.compare).toHaveBeenCalledWith(passWithExtra, hash);
      });
    });

    describe("System Error Handling", () => {
      let consoleSpy;
      beforeEach(() => {
        consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      });
      afterEach(() => consoleSpy.mockRestore());

      test("should handle comparison errors gracefully", async () => {
        // Arrange
        const mockError = new Error("Bcrypt compare error");
        bcrypt.compare.mockRejectedValue(mockError);

        // Act
        try {
          await comparePassword("p", "h");
        } catch (error) {
          // Expected error
        }

        // Assert
        expect(consoleSpy).toHaveBeenCalledWith(mockError);
      });
    });
  });
});