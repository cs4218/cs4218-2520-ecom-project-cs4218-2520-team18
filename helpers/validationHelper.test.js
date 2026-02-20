// Loh Ze Qing Norbert, A0277473R

import {
  validateEmail,
  validatePhoneE164,
  validatePassword,
  validateDOB,
  validateDOBNotFuture,
  validateName,
} from "./validationHelper.js";

describe("Validation Helper Tests", () => {
  describe("validateEmail", () => {
    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["valid@example.com", true, "Valid"],
        ["test@mail.example.co.uk", true, "Valid subdomain"],
        ["test.user+123@example.com", true, "Valid special chars"],
        ["plainaddress", false, "Missing @"],
        ["@missingusername.com", false, "Missing local"],
        ["username@.com", false, "Missing domain"],
        ["username@com", false, "Invalid format"],
      ])(
        "should validate email %p correctly (%s)",
        (email, expected, description) => {
          // Arrange & Act
          const result = validateEmail(email);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("Edge Cases", () => {
      test.each([
        ["username@domain..com", false, "Double dots"],
        ["#$%^&*()@example.com", false, "Invalid chars"],
        ["Joe Smith <email@example.com>", false, "Display name"],
        ["email@example@example.com", false, "Multiple @"],
        ["email@example.com (email)", false, "Comment suffix"],
        ["", false, "Empty"],
        [null, false, "Null"],
        [undefined, false, "Undefined"],
      ])(
        "should validate email %p correctly (%s)",
        (email, expected, description) => {
          // Arrange & Act
          const result = validateEmail(email);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });
  });

  describe("validatePhoneE164", () => {
    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["+14155552671", true, "Valid"],
        ["14155552671", true, "Valid numeric"],
        ["+012345678", false, "Invalid leading zero"],
      ])(
        "should validate phone %p correctly (%s)",
        (phone, expected, description) => {
          // Arrange & Act
          const result = validatePhoneE164(phone);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["+", false, "Minimal invalid"],
        ["+12", true, "Lower boundary"],
        ["12", true, "Lower boundary"],
        ["123", true, "Just above minimum"],
        ["+123", true, "Just above minimum"],
        ["1", false, "Below minimum boundary"],
        ["+1", false, "Below minimum boundary"],
        ["2".repeat(14), true, "Just below maximum"],
        ["+" + "2".repeat(14), true, "Just below maximum"],
        ["1" + "2".repeat(14), true, "At maximum boundary"],
        ["+" + "1" + "2".repeat(14), true, "At maximum boundary"],
        ["1" + "2".repeat(15), false, "Above maximum boundary"],
      ])(
        "should validate phone %p correctly (%s)",
        (phone, expected, description) => {
          // Arrange & Act
          const result = validatePhoneE164(phone);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });
  });

  describe("validateName", () => {
    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["John Doe", true, "Valid"],
        ["John Michael Smith", true, "Valid multi-word"],
        ["José García", true, "Valid with accents"],
        ["Mary-Jane", true, "Valid with hyphen"],
        ["O'Brien", true, "Valid with apostrophe"],
      ])(
        "should validate name %p correctly (%s)",
        (name, expected, description) => {
          // Arrange & Act
          const result = validateName(name);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["A", true, "At minimum boundary (1 char)"],
        ["", false, "Below minimum boundary (0 chars)"],
        ["A".repeat(100), true, "At maximum boundary (100 chars)"],
        ["A".repeat(101), false, "Above maximum boundary (101 chars)"],
      ])(
        "should validate name %p correctly (%s)",
        (name, expected, description) => {
          // Arrange & Act
          const result = validateName(name);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("Edge Cases", () => {
      test.each([
        ["  ", false, "Spaces only"],
        [null, false, "Null"],
        [undefined, false, "Undefined"],
      ])(
        "should validate name %p correctly (%s)",
        (name, expected, description) => {
          // Arrange & Act
          const result = validateName(name);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });
  });
  describe("validatePassword", () => {
    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["123456", true, "At minimum boundary"],
        ["12345", false, "Below minimum boundary"],
      ])(
        "should validate password %p correctly (%s)",
        (password, expected, description) => {
          // Arrange & Act
          const result = validatePassword(password);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["12345678", true, "Valid"],
        ["P@ssw0rd!", true, "Special chars"],
      ])(
        "should validate password %p correctly (%s)",
        (password, expected, description) => {
          // Arrange & Act
          const result = validatePassword(password);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("Edge Cases", () => {
      test.each([
        ["a".repeat(1000), true, "Very long"],
        ["  pass123  ", true, "Spaces preserved"],
        ["", false, "Empty"],
        [null, false, "Null"],
        [undefined, false, "Undefined"],
      ])(
        "should validate password %p correctly (%s)",
        (password, expected, description) => {
          // Arrange & Act
          const result = validatePassword(password);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });
  });

  describe("validateDOB", () => {
    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["2023-01-01", true, "Valid format"],
        ["1990-12-31", true, "Valid"],
        ["2023-02-30", false, "Invalid day for month"],
      ])(
        "should validate DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOB(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["2023-13-32", false, "Above range"],
        ["2000-00-01", false, "Below range"],
      ])(
        "should validate DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOB(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("Edge Cases", () => {
      test.each([
        ["1900-01-01", true, "Very old date"],
        ["2020-02-29", true, "Leap year Feb 29"],
        ["01-01-2023", false, "Wrong format"],
        ["2023/01/01", false, "Wrong separator"],
        ["23-01-01", false, "Invalid format"],
        [" 2023-01-01", false, "Leading whitespace"],
        ["2023-01-01 ", false, "Trailing whitespace"],
        ["a2023-01-01", false, "Invalid chars"],
        ["2021-02-29", false, "Invalid leap year"],
        ["2000-01-01 12:00:00", false, "Timestamp"],
      ])(
        "should validate DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOB(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
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

    describe("EP - Equivalence Partitioning", () => {
      test.each([
        ["2023-06-14", true, "Valid past date"],
        ["2000-01-01", true, "Valid old date"],
        ["2023-06-16", false, "Invalid future date"],
        ["2024-01-01", false, "Invalid future date"],
      ])(
        "should validate future DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOBNotFuture(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["2023-06-15", false, "Boundary at current date"],
      ])(
        "should validate future DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOBNotFuture(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });

    describe("Edge Cases", () => {
      test.each([
        ["invalid-date", false, "Invalid format"],
      ])(
        "should validate future DOB %p correctly (%s)",
        (dob, expected, description) => {
          // Arrange & Act
          const result = validateDOBNotFuture(dob);

          // Assert
          expect(result).toBe(expected);
        },
      );
    });
  });
});
