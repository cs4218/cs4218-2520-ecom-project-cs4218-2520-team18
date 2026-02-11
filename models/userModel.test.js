import User from "../models/userModel";

describe("User Model", () => {
    it("should catch validation error for missing required fields", async () => {
        const user = new User({});
        const validation = user.validateSync();
        
        expect(validation.errors.name).toBeDefined();
        expect(validation.errors.email).toBeDefined();
        expect(validation.errors.password).toBeDefined();
        expect(validation.errors.phone).toBeDefined();
        expect(validation.errors.address).toBeDefined();
        expect(validation.errors.answer).toBeDefined();
        expect(validation.errors.DOB).toBeDefined();
    });

    describe("Phone Field Validation", () => {
        it("should return true for valid E.164 numbers", () => {
            const user = new User({ phone: "+14155552671" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeUndefined();
        });

        it("should return false for invalid structure", () => {
            const user = new User({ phone: "+" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeDefined();
        });

        it("should return false if starts with 0 after +", () => {
            const user = new User({ phone: "+012345678" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeDefined();
        });

        it("should return true for minimum valid length (2 digits)", () => {
            const user = new User({ phone: "+12" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeUndefined();
        });

        it("should return true for length > 2 (3 digit)", () => {
            const user = new User({ phone: "123" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeUndefined();
        });

        it("should return false for length < 2 (1 digit)", () => {
            const user = new User({ phone: "1" });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeDefined();
        });

        it("should return true for length < 15 (14 digits)", () => {
            const maxDigits = "2".repeat(14);
            const user = new User({ phone: maxDigits });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeUndefined();
        });

        it("should return true for maximum valid length (15 digits)", () => {
            const maxDigits = "1" + "2".repeat(14);
            const user = new User({ phone: maxDigits });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeUndefined();
        });

        it("should return false for length > 15 (16 digits)", () => {
            const tooLong = "1" + "2".repeat(15);
            const user = new User({ phone: tooLong });
            const validation = user.validateSync();
            expect(validation.errors.phone).toBeDefined();
        });

        describe("Password Field Validation", () => {
            it("should return true for length equal to 6", () => {
                const user = new User({ password: "123456" });
                const validation = user.validateSync();
                expect(validation.errors.password).toBeUndefined();
            });

            it("should return false for length equal to 5", () => {
                const user = new User({ password: "12345" });
                const validation = user.validateSync();
                expect(validation.errors.password).toBeDefined();
            });

            it("should return true for length greater than 6", () => {
                const user = new User({ password: "12345678" });
                const validation = user.validateSync();
                expect(validation.errors.password).toBeUndefined();
            });
        });

        describe("DOB Field Validation", () => {
            it("should return true for valid DOB format", () => {
                const user = new User({ DOB: "1990-05-21" });
                const validation = user.validateSync();
                expect(validation.errors.DOB).toBeUndefined();
            });

            it("should return false for invalid DOB format", () => {
                const user = new User({ DOB: "21-05-1990" });
                const validation = user.validateSync();
                expect(validation.errors.DOB).toBeDefined();
            });

            it("should return false for future DOB", () => {
                const user = new User({ DOB: "2300-01-01" });
                const validation = user.validateSync();
                expect(validation.errors.DOB).toBeDefined();
            });

            it("should return false for invalid date values even if valid format", () => {
                const user = new User({ DOB: "2023-02-30" });
                const validation = user.validateSync();
                expect(validation.errors.DOB).toBeDefined();
            });
        });

        describe("Email Field Validation", () => {
            it("should return true for valid email", () => {
                const user = new User({ email: "test@example.com" });
                const validation = user.validateSync();
                expect(validation.errors.email).toBeUndefined();
            });

            it("should return false for invalid email", () => {
                const user = new User({ email: "invalid-email" });
                const validation = user.validateSync();
                expect(validation.errors.email).toBeDefined();
            });
        });

        describe("Trim Field Validation", () => {
            it("should trim whitespace from name field", () => {
                const user = new User({ name: "   John Doe   " });
                const validation = user.validateSync();
                expect(user.name).toBe("John Doe");
            });

            it("should trim whitespace from email field", () => {
                const user = new User({ email: "   test@example.com   " });
                const validation = user.validateSync();
                expect(user.email).toBe("test@example.com");
            });

            it("should trim whitespace from phone field", () => {
                const user = new User({ phone: "   +14155552671   " });
                const validation = user.validateSync();
                expect(user.phone).toBe("+14155552671");
            });

            it("should trim whitespace from DOB field", () => {
                const user = new User({ DOB: "   1990-05-21   " });
                const validation = user.validateSync();
                expect(user.DOB).toBe("1990-05-21");
            });

            it("should trim address field", () => {
                const user = new User({ address: "   123 Main St   " });
                const validation = user.validateSync();
                expect(user.address).toBe("123 Main St");
            });

            it("should trim answer field", () => {
                const user = new User({ answer: "   My first pet   " });
                const validation = user.validateSync();
                expect(user.answer).toBe("My first pet");
            });

            it("should not trim password field", () => {
                const user = new User({ password: "   secret   " });
                const validation = user.validateSync();
                expect(user.password).toBe("   secret   ");
            });
        });

        describe("Lowercase Field Validation", () => {
            it("should convert email to lowercase", () => {
                const user = new User({ email: "TEST@EXAMPLE.COM" });
                const validation = user.validateSync();
                expect(user.email).toBe("test@example.com");
            });
        });

        describe("Default Role Field Validation", () => {
            it("should set default role to 0 if not provided", () => {
                const user = new User({});
                const validation = user.validateSync();
                expect(user.role).toBe(0);
            });
        });
    });
});