import { hashPassword, comparePassword } from "./authHelper";
import bcrypt from "bcrypt";

jest.mock("bcrypt");

describe("authHelper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("hashPassword", () => {
        describe('Happy Path', () => {
            it('should hash the password successfully', async () => {
                const password = "password";
                const mockHashedPassword = "hashedPassword";
                bcrypt.hash.mockResolvedValue(mockHashedPassword);

                const hashedPassword = await hashPassword(password);

                expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
                expect(hashedPassword).toBe(mockHashedPassword);
            });

            it('should use 10 salt rounds', async () => {
                const password = "password";
                const mockHashedPassword = "hashedPassword";
                bcrypt.hash.mockResolvedValue(mockHashedPassword);

                await hashPassword(password);

                expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
            });
        });

        describe('Error logging', () => {
            it('should log an error if bcrypt.hash fails', async () => {
                const password = "password";
                const consoleSpy = jest.spyOn(console, "error").mockImplementation();
                const mockError = new Error("Bcrypt failure");
                bcrypt.hash.mockRejectedValue(mockError);

                await hashPassword(password);

                expect(consoleSpy).toHaveBeenCalledWith(mockError);
                consoleSpy.mockRestore();
            });
        });

        describe('Edge Cases', () => {
            it("should handle extremely long passwords (truncation boundary) of 72-bytes", async () => {
                const password = "a".repeat(100);
                const hashedPassword = "hashedPassword";
                bcrypt.hash.mockResolvedValue(hashedPassword);
                
                await hashPassword(password);

                expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
                expect(hashedPassword).toBe(mockHashedPassword);
            });
        });
    });

    describe('comparePassword', () => {
        it('should return true when bcrypt.compare returns true', async () => {
            const password = "password";
            const hashedPassword = "hashedPassword";
            bcrypt.compare.mockResolvedValue(true);
            
            const result = await comparePassword(password, hashedPassword);

            expect(bcrypt.hash).not.toHaveBeenCalled(); // Input should not be hashed again
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toBe(true);
        });
    })

});