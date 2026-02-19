// Loh Ze Qing Norbert, A0277473R

import userModel from "../models/userModel.js";

describe("User Model - Comprehensive Validation Tests", () => {
  describe("Required Fields Validation", () => {
    describe("EP - All Fields Missing", () => {
      test("should fail validation if all required fields are missing", () => {
        // Arrange
        const user = new userModel({});

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors.name).toBeDefined();
        expect(validation.errors.email).toBeDefined();
        expect(validation.errors.password).toBeDefined();
        expect(validation.errors.phone).toBeDefined();
        expect(validation.errors.address).toBeDefined();
        expect(validation.errors.answer).toBeDefined();
        expect(validation.errors.DOB).toBeDefined();
      });
    });

    describe("EP - Individual Required Fields", () => {
      test.each([
        ["name", { email: "test@example.com", password: "password123", phone: "+1234567890", address: "123 St", answer: "answer", DOB: "2000-01-01" }],
        ["email", { name: "John Doe", password: "password123", phone: "+1234567890", address: "123 St", answer: "answer", DOB: "2000-01-01" }],
        ["password", { name: "John Doe", email: "test@example.com", phone: "+1234567890", address: "123 St", answer: "answer", DOB: "2000-01-01" }],
        ["phone", { name: "John Doe", email: "test@example.com", password: "password123", address: "123 St", answer: "answer", DOB: "2000-01-01" }],
        ["address", { name: "John Doe", email: "test@example.com", password: "password123", phone: "+1234567890", answer: "answer", DOB: "2000-01-01" }],
        ["answer", { name: "John Doe", email: "test@example.com", password: "password123", phone: "+1234567890", address: "123 St", DOB: "2000-01-01" }],
        ["DOB", { name: "John Doe", email: "test@example.com", password: "password123", phone: "+1234567890", address: "123 St", answer: "answer" }],
      ])("should fail validation if %s is missing", (field, data) => {
        // Arrange
        const user = new userModel(data);

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors[field]).toBeDefined();
      });
    });

    describe("BVA - Whitespace Edge Case", () => {
      test.each([
        ["name", " "],
        ["email", " "],
        ["password", " "],
        ["phone", " "],
        ["address", " "],
        ["answer", " "],
        ["DOB", " "],
      ])("should fail validation if %s is whitespace-only", (field, value) => {
        // Arrange
        const user = new userModel({ [field]: value });

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors[field]).toBeDefined();
      });
    });
  });

  describe("Phone Field Validation", () => {
    describe("EP - Valid Phone Numbers", () => {
      test.each([
        ["+14155552671", "Valid E.164 format"],
        ["14155552671", "Valid numeric"],
        ["+123456", "Valid E.164 prefix"],
      ])("should pass validation for phone %p (%s)", (phone, description) => {
        // Arrange
        const user = new userModel({ phone });

        // Act
        const validation = user.validateSync();

        // Assert
        if (validation) {
          expect(validation.errors.phone).toBeUndefined();
        } else {
          expect(validation).toBeUndefined();
        }
      });
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["+", false, "Minimal invalid"],
        ["+012345678", false, "Invalid leading zero"],
        ["+12", true, "Lower boundary (2 digits)"],
        ["1", false, "Below minimum boundary (1 digit)"],
        ["2".repeat(14), true, "Just below maximum (14 digits)"],
        ["1" + "2".repeat(14), true, "At maximum boundary (15 digits)"],
        ["1" + "2".repeat(15), false, "Above maximum boundary (16 digits)"],
      ])("should validate phone %p correctly as %s (%s)", (phone, shouldPass, description) => {
        // Arrange
        const user = new userModel({ phone });

        // Act
        const validation = user.validateSync();

        // Assert
        if (shouldPass) {
          if (validation) expect(validation.errors.phone).toBeUndefined();
          else expect(validation).toBeUndefined();
        } else {
          expect(validation.errors.phone).toBeDefined();
        }
      });
    });

    describe("Edge Cases - Invalid Formats", () => {
      test.each([
        ["+1234567ABC", "Invalid chars"],
        ["+1-234-567", "Invalid separator (dashes)"],
        ["123+456", "Invalid placement (+ in middle)"],
      ])("should fail validation for phone %p (%s)", (phone, description) => {
        // Arrange
        const user = new userModel({ phone });

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors.phone).toBeDefined();
      });
    });
  });

  describe("Password Field Validation", () => {
    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["123456", true, "At minimum boundary (6 chars)"],
        ["12345", false, "Below minimum boundary (5 chars)"],
      ])("should validate password %p as %s (%s)", (password, shouldPass, description) => {
        // Arrange
        const user = new userModel({ password });

        // Act
        const validation = user.validateSync();

        // Assert
        if (shouldPass) {
          if (validation) expect(validation.errors.password).toBeUndefined();
          else expect(validation).toBeUndefined();
        } else {
          expect(validation.errors.password).toBeDefined();
        }
      });
    });

    describe("EP - Valid Passwords", () => {
      test.each([
        ["12345678", "Valid"],
        ["P@ssw0rd!", "Special chars"],
      ])("should pass validation for password %p (%s)", (password, description) => {
        // Arrange
        const user = new userModel({ password });

        // Act
        const validation = user.validateSync();

        // Assert
        if (validation) expect(validation.errors.password).toBeUndefined();
        else expect(validation).toBeUndefined();
      });
    });

    describe("Edge Cases", () => {
      test("should pass validation for very long password", () => {
        // Arrange
        const user = new userModel({ password: "a".repeat(1000) });

        // Act
        const validation = user.validateSync();

        // Assert
        if (validation) expect(validation.errors.password).toBeUndefined();
        else expect(validation).toBeUndefined();
      });

      test("should preserve leading/trailing spaces in password", () => {
        // Arrange
        const user = new userModel({ password: "  pass123  " });

        // Act
        user.validateSync();

        // Assert
        expect(user.password).toBe("  pass123  ");
      });
    });
  });

  describe("DOB Field Validation", () => {
    describe("EP - Valid DOB Format", () => {
      test.each([
        ["1990-05-21", "Valid format (YYYY-MM-DD)"],
        ["1900-01-01", "Very old date"],
        ["2020-02-29", "Leap year Feb 29"],
      ])("should pass validation for DOB %p (%s)", (dob, description) => {
        // Arrange
        const user = new userModel({ DOB: dob });

        // Act
        const validation = user.validateSync();

        // Assert
        if (validation) expect(validation.errors.DOB).toBeUndefined();
        else expect(validation).toBeUndefined();
      });
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["2000-13-01", false, "Above valid range (month 13)"],
        ["2000-00-01", false, "Below valid range (month 0)"],
      ])("should validate DOB %p as %s (%s)", (dob, shouldPass, description) => {
        // Arrange
        const user = new userModel({ DOB: dob });

        // Act
        const validation = user.validateSync();

        // Assert
        if (shouldPass) {
          if (validation) expect(validation.errors.DOB).toBeUndefined();
          else expect(validation).toBeUndefined();
        } else {
          expect(validation.errors.DOB).toBeDefined();
        }
      });
    });

    describe("EP - Invalid Formats", () => {
      test.each([
        ["21-05-1990", "Wrong format (DD-MM-YYYY)"],
        ["2000/01/01", "Wrong separator (forward slash)"],
        ["23-01-01", "Invalid format"],
        ["2023-02-30", "Invalid day for month"],
      ])("should fail validation for DOB %p (%s)", (dob, description) => {
        // Arrange
        const user = new userModel({ DOB: dob });

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors.DOB).toBeDefined();
      });
    });

    describe("Edge Cases", () => {
      test.each([
        ["2300-01-01", true, "Future DOB (business rule violation)"],
        ["2021-02-29", true, "Invalid leap year (Feb 29 in non-leap year)"],
        ["a2023-01-01", true, "Invalid chars"],
        ["2000-01-01 12:00:00", true, "DOB with timestamp"],
      ])("should fail validation for DOB %p (%s)", (dob, shouldFail, description) => {
        // Arrange
        const user = new userModel({ DOB: dob });

        // Act
        const validation = user.validateSync();

        // Assert
        if (shouldFail) {
          expect(validation.errors.DOB).toBeDefined();
        } else {
          if (validation) expect(validation.errors.DOB).toBeUndefined();
          else expect(validation).toBeUndefined();
        }
      });
    });
  });

  describe("Email Field Validation", () => {
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
          // Arrange
          const user = new userModel({ email });

          // Act
          const validation = user.validateSync();

          // Assert
          if (expected) {
            if (validation) expect(validation.errors.email).toBeUndefined();
            else expect(validation).toBeUndefined();
          } else {
            expect(validation.errors.email).toBeDefined();
          }
        },
      );
    });

    describe("BVA - Boundary Value Analysis", () => {
      test.each([
        ["@example.com", "Missing local part"],
        ["test@", "Missing domain"],
      ])("should fail validation for email %p (%s)", (email, description) => {
        // Arrange
        const user = new userModel({ email });

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors.email).toBeDefined();
      });
    });

    describe("Edge Cases", () => {
      test.each([
        ["username@domain..com", "Double dots"],
        ["#$%^&*()@example.com", "Invalid chars"],
        ["Joe Smith <email@example.com>", "Display name"],
        ["email@example@example.com", "Multiple @"],
        ["email@example.com (email)", "Comment suffix"],
        ["test @example.com", "Spaces in email"],
      ])("should fail validation for email %p (%s)", (email, description) => {
        // Arrange
        const user = new userModel({ email });

        // Act
        const validation = user.validateSync();

        // Assert
        expect(validation.errors.email).toBeDefined();
      });
    });
  });

  describe("Field Normalization", () => {
    describe("EP - Trim Whitespace", () => {
      test.each([
        ["name", "   John Doe   ", "John Doe"],
        ["email", "   test@example.com   ", "test@example.com"],
        ["phone", "   +14155552671   ", "+14155552671"],
        ["DOB", "   1990-05-21   ", "1990-05-21"],
        ["address", "   123 Main St   ", "123 Main St"],
        ["answer", "   My first pet   ", "My first pet"],
      ])("should trim whitespace from %s field", (field, input, expected) => {
        // Arrange
        const user = new userModel({ [field]: input });

        // Act
        user.validateSync();

        // Assert
        expect(user[field]).toBe(expected);
      });
    });

    describe("Security - Preserve Password Spaces", () => {
      test("should NOT trim password field", () => {
        // Arrange
        const user = new userModel({ password: "   secret   " });

        // Act
        user.validateSync();

        // Assert
        expect(user.password).toBe("   secret   ");
      });
    });

    describe("EP - Case Normalization", () => {
      test.each([
        ["TEST@EXAMPLE.COM", "test@example.com", "Uppercase"],
        ["TeSt@ExAmPlE.cOm", "test@example.com", "Mixed case"],
      ])("should convert email %p to lowercase (%s)", (input, expected, description) => {
        // Arrange
        const user = new userModel({ email: input });

        // Act
        user.validateSync();

        // Assert
        expect(user.email).toBe(expected);
      });
    });
  });

  describe("Default Values", () => {
    describe("EP - Default Role", () => {
      test("should set default role to 0 if not provided", () => {
        // Arrange
        const user = new userModel({});

        // Act
        user.validateSync();

        // Assert
        expect(user.role).toBe(0);
      });
    });
  });
});