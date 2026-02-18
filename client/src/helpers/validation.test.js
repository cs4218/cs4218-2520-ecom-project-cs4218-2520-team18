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
    describe("EP - Empty/Falsy Values", () => {
      test.each([
        ["", true, "Empty string"],
        ["   ", true, "Whitespace"],
        [null, true, "Null"],
        [undefined, true, "Undefined"],
      ])("should return true for %p (%s)", (value, expected, _description) => {
        // Arrange & Act
        const result = isEmpty(value);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Non-empty Values", () => {
      test.each([
        ["a", false, "Non-empty string"],
        [0, false, "Zero"],
        [false, false, "Boolean false"],
      ])("should return false for %p (%s)", (value, expected, _description) => {
        // Arrange & Act
        const result = isEmpty(value);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe("isValidEmail", () => {
    describe("EP - Valid Emails", () => {
      test.each([
        ["valid@example.com", true, "Valid"],
        ["test@mail.example.co.uk", true, "Valid subdomain"],
        ["test.user+123@example.com", true, "Valid special chars"],
      ])("should return true for %p (%s)", (email, expected, _description) => {
        // Arrange & Act
        const result = isValidEmail(email);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Invalid Emails", () => {
      test.each([
        ["plainaddress", false, "Missing @"],
        ["@missingusername.com", false, "Missing local part"],
        ["username@.com", false, "Missing domain"],
        ["username@com", false, "Missing TLD"],
        ["username@domain..com", false, "Double dots"],
        ["#$%^&*()@example.com", false, "Invalid characters"],
        ["Joe Smith <email@example.com>", false, "Name with email"],
        ["email@example@example.com", false, "Multiple @"],
        ["email@example.com (email)", false, "Email with comment"],
      ])("should return false for %p (%s)", (email, expected, _description) => {
        // Arrange & Act
        const result = isValidEmail(email);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Empty/Null/Undefined", () => {
      test.each([
        ["", false, "Empty string"],
        [null, false, "Null"],
        [undefined, false, "Undefined"],
      ])("should return false for %p (%s)", (email, expected, _description) => {
        // Arrange & Act
        const result = isValidEmail(email);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe("isValidPhone", () => {
    describe("EP - Valid Phone Numbers", () => {
      test.each([
        ["+14155552671", true, "E.164 format with +"],
        ["14155552671", true, "E.164 format without +"],
      ])("should return true for %p (%s)", (phone, expected, _description) => {
        // Arrange & Act
        const result = isValidPhone(phone);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Invalid Phone Numbers", () => {
      test.each([
        ["+", false, "Plus sign only"],
        ["+012345678", false, "Invalid format"],
      ])("should return false for %p (%s)", (phone, expected, _description) => {
        // Arrange & Act
        const result = isValidPhone(phone);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Boundary Values (Length)", () => {
      test.each([
        ["+12", true, "At minimum (2 digits)"],
        ["12", true, "At minimum without + (2 digits)"],
        ["123", true, "Above minimum (3 digits)"],
        ["+123", true, "Above minimum with + (3 digits)"],
        ["1", false, "Below minimum (1 digit)"],
        ["+1", false, "Below minimum with + (1 digit)"],
        ["2".repeat(14), true, "At maximum (14 digits)"],
        ["+" + "2".repeat(14), true, "At maximum with + (14 digits)"],
        ["1" + "2".repeat(14), true, "Exactly 15 digits"],
        ["+" + "1" + "2".repeat(14), true, "Exactly 15 digits with +"],
        ["1" + "2".repeat(15), false, "Over maximum (16 digits)"],
        ["+" + "1" + "2".repeat(15), false, "Over maximum with + (16 digits)"],
      ])("should validate %p correctly (%s)", (phone, expected, _description) => {
        // Arrange & Act
        const result = isValidPhone(phone);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Empty/Null", () => {
      test.each([
        ["", false, "Empty string"],
        [null, false, "Null"],
      ])("should return false for %p (%s)", (phone, expected, _description) => {
        // Arrange & Act
        const result = isValidPhone(phone);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe("isPasswordLongEnough", () => {
    describe("EP - Valid Passwords", () => {
      test.each([
        ["123456", true, "Exactly minimum length"],
        ["1234567", true, "Above minimum length"],
      ])("should return true for %p (%s)", (password, expected, _description) => {
        // Arrange & Act
        const result = isPasswordLongEnough(password);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Boundary Values", () => {
      test.each([
        ["12345", false, "Below minimum (5 chars)"],
        ["", false, "Empty string"],
      ])("should return false for %p (%s)", (password, expected, _description) => {
        // Arrange & Act
        const result = isPasswordLongEnough(password);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });

  describe("isValidDOBFormat and isValidDOBStrict", () => {
    describe("EP - Valid YYYY-MM-DD Format", () => {
      test.each([
        ["1990-01-01", true, "Valid date 1990"],
        ["2023-12-31", true, "Valid date 2023"],
      ])("isValidDOBFormat should return true for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isValidDOBFormat(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Invalid Format", () => {
      test.each([
        ["01-01-2023", false, "Reversed format"],
        ["2023/01/01", false, "Slash separator"],
        [" 2023-01-01 ", false, "Leading/trailing spaces"],
      ])("isValidDOBFormat should return false for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isValidDOBFormat(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Valid Calendar Dates (Strict)", () => {
      test.each([
        ["2021-02-28", true, "Valid February in non-leap year"],
      ])("isValidDOBStrict should return true for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isValidDOBStrict(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Invalid Calendar Dates (Strict)", () => {
      test.each([
        ["2021-02-30", false, "February 30th doesn't exist"],
        ["2023-04-31", false, "April 31st doesn't exist"],
        [" 2023-01-01 ", false, "Leading/trailing spaces"],
      ])("isValidDOBStrict should return false for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isValidDOBStrict(dob);

        // Assert
        expect(result).toBe(expected);
      });
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

    describe("EP - Past and Current Dates", () => {
      test.each([
        ["2023-06-14", true, "Yesterday"],
        ["2000-01-01", true, "Past date"],
      ])("should return true for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isDOBNotFuture(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("EP - Future Dates", () => {
      test.each([
        ["2023-06-16", false, "Tomorrow"],
      ])("should return false for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isDOBNotFuture(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });

    describe("BVA - Today's Date", () => {
      it("should return false for today (uses < not <=)", () => {
        // Arrange & Act
        const result = isDOBNotFuture("2023-06-15");

        // Assert
        expect(result).toBe(false);
      });
    });

    describe("BVA - Invalid/Edge Cases", () => {
      test.each([
        ["invalid-date", false, "Invalid date string"],
        ["", false, "Empty string"],
        [null, false, "Null"],
      ])("should return false for %p (%s)", (dob, expected, _description) => {
        // Arrange & Act
        const result = isDOBNotFuture(dob);

        // Assert
        expect(result).toBe(expected);
      });
    });
  });
});
