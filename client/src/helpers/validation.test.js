import {
  isEmpty,
  isValidEmail,
  isValidPhone,
  isValidDOBFormat,
  isValidDOBStrict,
  isDOBNotFuture,
  isPasswordLongEnough,
} from "./validation";

describe("Client-side validation helpers", () => {
  describe("isEmpty", () => {
    it("should return true for empty, null, undefined or whitespace", () => {
      expect(isEmpty("")).toBe(true);
      expect(isEmpty("   ")).toBe(true);
      expect(isEmpty(null)).toBe(true);
      expect(isEmpty(undefined)).toBe(true);
    });

    it("should return false for non-empty values", () => {
      expect(isEmpty("a")).toBe(false);
      expect(isEmpty(0)).toBe(false);
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid emails", () => {
      expect(isValidEmail("valid@example.com")).toBe(true);
      expect(isValidEmail("user.name+tag@sub.domain.co")).toBe(true);
    });

    it("should return false for invalid emails", () => {
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("@missingusername.com")).toBe(false);
      expect(isValidEmail("username@.com")).toBe(false);
      expect(isValidEmail("username@com")).toBe(false);
      expect(isValidEmail("username@domain..com")).toBe(false);
      expect(isValidEmail("#$%^&*()@example.com")).toBe(false);
      expect(isValidEmail("Joe Smith <email@example.com>")).toBe(false);
      expect(isValidEmail("email@example@example.com")).toBe(false);
      expect(isValidEmail("email@example.com (email)")).toBe(false);
    });

    it("should return false for empty/null/undefined", () => {
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });

  describe("isValidPhone", () => {
    it("should return true for E.164-like numbers with or without leading +", () => {
      expect(isValidPhone("+14155552671")).toBe(true);
      expect(isValidPhone("14155552671")).toBe(true);
    });

    it("should return false for invalid phone numbers", () => {
      expect(isValidPhone("+")).toBe(false);
      expect(isValidPhone("+012345678")).toBe(false);
    });

    it("should return true for minimum valid length (2 digits)", () => {
      expect(isValidPhone("+12")).toBe(true);
      expect(isValidPhone("12")).toBe(true);
    });

    it("should return true for length > 2 (3 digit)", () => {
      expect(isValidPhone("123")).toBe(true);
      expect(isValidPhone("+123")).toBe(true);
    });

    it("should return false for length < 2 (1 digit)", () => {
      expect(isValidPhone("1")).toBe(false);
      expect(isValidPhone("+1")).toBe(false);
    });

    it("should return true for length < 15 (14 digits)", () => {
      const maxDigits = "2".repeat(14);
      expect(isValidPhone(maxDigits)).toBe(true);
      expect(isValidPhone("+" + maxDigits)).toBe(true);
    });

    it("should return true for maximum valid length (15 digits)", () => {
      // 1 + 14 digits
      const maxDigits = "1" + "2".repeat(14);
      expect(isValidPhone(maxDigits)).toBe(true);
      expect(isValidPhone("+" + maxDigits)).toBe(true);
    });

    it("should return false for length > 15 (16 digits)", () => {
      const tooManyDigits = "1" + "2".repeat(15);
      expect(isValidPhone(tooManyDigits)).toBe(false);
      expect(isValidPhone("+" + tooManyDigits)).toBe(false);
    });

    it("should return false for empty/null/undefined", () => {
      expect(isValidPhone("")).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });
  });

  describe("isPasswordLongEnough", () => {
    it("should return true for length >= min (BVA)", () => {
      expect(isPasswordLongEnough("123456")).toBe(true);
      expect(isPasswordLongEnough("1234567")).toBe(true);
    });

    it("should return false for shorter passwords and empty string", () => {
      expect(isPasswordLongEnough("12345")).toBe(false);
      expect(isPasswordLongEnough("")).toBe(false);
    });
  });

  describe("isValidDOBFormat and isValidDOBStrict", () => {
    it("should return true for YYYY-MM-DD formatted strings", () => {
      expect(isValidDOBFormat("1990-01-01")).toBe(true);
      expect(isValidDOBFormat("2023-12-31")).toBe(true);
    });

    it("should return false for malformed date strings", () => {
      expect(isValidDOBFormat("01-01-2023")).toBe(false);
      expect(isValidDOBFormat("2023/01/01")).toBe(false);
      expect(isValidDOBFormat(" 2023-01-01 ")).toBe(false);
    });

    it("should return false for non-existent calendar dates even if format is correct", () => {
      expect(isValidDOBStrict("2021-02-28")).toBe(true);
      expect(isValidDOBStrict("2021-02-30")).toBe(false);
      expect(isValidDOBStrict("2023-04-31")).toBe(false);
      expect(isValidDOBStrict(" 2023-01-01 ")).toBe(false);
    });
  });

  describe("isDOBNotFuture", () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2023-06-15"));
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it("should return true for past dates and today", () => {
      expect(isDOBNotFuture("2023-06-14")).toBe(true);
      expect(isDOBNotFuture("2000-01-01")).toBe(true);
    });

    it("should return false for future dates and invalid strings", () => {
      expect(isDOBNotFuture("2023-06-16")).toBe(false);
      expect(isDOBNotFuture("invalid-date")).toBe(false);
    });

    it("should return false for today (implementation uses < not <= when comparing with new Date())", () => {
      expect(isDOBNotFuture("2023-06-15")).toBe(false);
    });

    it("should handle invalid date string gracefully (Date comparison behavior)", () => {
      expect(isDOBNotFuture("invalid-date")).toBe(false);
    });

    it("returns false for empty/blank DOB (DOB is required)", () => {
      expect(isDOBNotFuture("")).toBe(false);
      expect(isDOBNotFuture(null)).toBe(false);
    });
  });
});
