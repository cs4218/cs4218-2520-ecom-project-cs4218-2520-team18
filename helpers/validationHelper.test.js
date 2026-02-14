import {
    validateEmail,
    validatePhoneE164,
    validatePassword,
    validateDOB,
    validateDOBNotFuture,
} from "./validationHelper.js";

describe("Validation Helper Tests", () => {

    describe("validateEmail", () => {
        // Equivalence Partitioning (EP) - Valid Inputs
        it("should return true for valid email addresses", () => {
            expect(validateEmail("valid@example.com")).toBe(true);
        });

        // Equivalence Partitioning (EP) - Invalid Inputs
        it("should return false for invalid email addresses", () => {
            expect(validateEmail("plainaddress")).toBe(false);
            expect(validateEmail("@missingusername.com")).toBe(false);
            expect(validateEmail("username@.com")).toBe(false);
            expect(validateEmail("username@com")).toBe(false);
            expect(validateEmail("username@domain..com")).toBe(false);
            expect(validateEmail("#$%^&*()@example.com")).toBe(false);
            expect(validateEmail("Joe Smith <email@example.com>")).toBe(false);
            expect(validateEmail("email@example@example.com")).toBe(false);
            expect(validateEmail("email@example.com (email)")).toBe(false);
        });

        // Edge Cases
        it("should handle empty strings and null/undefined gracefully", () => {
            expect(validateEmail("")).toBe(false);
            expect(validateEmail(null)).toBe(false);
            expect(validateEmail(undefined)).toBe(false);
        });
    });

    describe("validatePhoneE164", () => {
        // EP - Valid
        it("should return true for valid E.164 numbers", () => {
            expect(validatePhoneE164("+14155552671")).toBe(true);
            expect(validatePhoneE164("14155552671")).toBe(true);
        });

        // EP - Invalid
        it("should return false for invalid structure", () => {
            expect(validatePhoneE164("+")).toBe(false);
            expect(validatePhoneE164("+012345678")).toBe(false);
        });

        it("should return true for minimum valid length (2 digits)", () => {
            // e.g. +12
            expect(validatePhoneE164("+12")).toBe(true);
            expect(validatePhoneE164("12")).toBe(true);
        });

        it("should return true for length > 2 (3 digit)", () => {
            expect(validatePhoneE164("123")).toBe(true);
            expect(validatePhoneE164("+123")).toBe(true);
        });

        it("should return false for length < 2 (1 digit)", () => {
            expect(validatePhoneE164("1")).toBe(false);
            expect(validatePhoneE164("+1")).toBe(false);
        });

        it("should return true for length < 15 (14 digits)", () => {
            const maxDigits = "2".repeat(14);
            expect(validatePhoneE164(maxDigits)).toBe(true);
            expect(validatePhoneE164("+" + maxDigits)).toBe(true);
        });

        it("should return true for maximum valid length (15 digits)", () => {
            // 1 + 14 digits
            const maxDigits = "1" + "2".repeat(14);
            expect(validatePhoneE164(maxDigits)).toBe(true);
            expect(validatePhoneE164("+" + maxDigits)).toBe(true);
        });

        it("should return false for length > 15 (16 digits)", () => {
            const tooLong = "1" + "2".repeat(15);
            expect(validatePhoneE164(tooLong)).toBe(false);
        });
    });

    describe("validatePassword", () => {
        // BVA
        it("should return true for length equal to 6", () => {
            expect(validatePassword("123456")).toBe(true);
        });

        it("should return false for length equal to 5", () => {
            expect(validatePassword("12345")).toBe(false);
        });

        // EP
        it("should return true for length greater than 6", () => {
            expect(validatePassword("12345678")).toBe(true);
        });

        it("should handle empty string", () => {
            expect(validatePassword("")).toBe(false);
        });
    });

    describe("validateDOB", () => {
        // EP - Valid Format
        it("should return true for valid YYYY-MM-DD format", () => {
            expect(validateDOB("2023-01-01")).toBe(true);
            expect(validateDOB("1990-12-31")).toBe(true);
        });

        // EP - Invalid Format
        it("should return false for invalid formats", () => {
            expect(validateDOB("01-01-2023")).toBe(false); // DD-MM-YYYY
            expect(validateDOB("2023/01/01")).toBe(false); // Wrong separator
            expect(validateDOB("23-01-01")).toBe(false); // 2 digit year
        });

        // Edge Cases around regex matching
        it("should return false for strings with extra characters", () => {
            expect(validateDOB(" 2023-01-01 ")).toBe(false);
            expect(validateDOB("a2023-01-01")).toBe(false);
        });

        it("should return false for invalid date values even if valid format", () => {
            expect(validateDOB("2023-13-32")).toBe(false); // Invalid month and day
            expect(validateDOB("2023-02-30")).toBe(false); // Feb 30th does not exist
            expect(validateDOB("2023-04-31")).toBe(false); // April has 30 days
        });
    });

    describe("validateDOBNotFuture", () => {
        beforeAll(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date("2023-06-15")); // Mock "Today" as June 15, 2023
        });

        afterAll(() => {
            jest.useRealTimers();
        });

        // EP - Past Date
        it("should return true for a past date", () => {
            expect(validateDOBNotFuture("2023-06-14")).toBe(true);
            expect(validateDOBNotFuture("2000-01-01")).toBe(true);
        });

        // EP - Future Date
        it("should return false for a future date", () => {
            expect(validateDOBNotFuture("2023-06-16")).toBe(false);
            expect(validateDOBNotFuture("2024-01-01")).toBe(false);
        });

        // BVA - Today
        it("should return false for today (implementation uses < not <= when comparing with new Date())", () => {
            expect(validateDOBNotFuture("2023-06-15")).toBe(false);
        });

        // Edge Cases
        it("should handle invalid date string gracefully (Date comparison behavior)", () => {
            expect(validateDOBNotFuture("invalid-date")).toBe(false);
        });
    });

});
