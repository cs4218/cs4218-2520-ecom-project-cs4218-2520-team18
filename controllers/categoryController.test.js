import { createCategoryController, updateCategoryController, deleteCategoryController, singleCategoryController} from "./categoryController.js";
import categoryModel from "../models/categoryModel.js";

jest.mock("../models/categoryModel.js");

describe("createCategoryController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                name: "Electronics",
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    it("should return error if name is missing", async () => {
        req.body.name = "";

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    it("should return message if category already exists", async () => {
        categoryModel.findOne.mockResolvedValue({ name: "Electronics" });

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category already exists",
        });
    });

    it("should return message if capitalized category already exists", async () => {
        req.body.name = "electronics";
        categoryModel.findOne.mockResolvedValue({ name: "Electronics" });

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category already exists",
        });
    });

    it("should create new category successfully", async () => {
        const mockSave = jest.fn().mockResolvedValue({ name: "Electronics", slug: "electronics" });
        categoryModel.findOne.mockResolvedValue(null);
        categoryModel.mockImplementation(() => ({
            save: mockSave
        }));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            message: "New Category created",
            category: { name: "Electronics", slug: "electronics" },
        });
    });

    it("should handle server error", async () => {
        categoryModel.findOne.mockRejectedValue(new Error("Database error"));

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: expect.any(Error),
            message: "Error in Category",
        });
    });

    it("should return error for whitespace name", async () => {
        req.body.name = "   ";

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });
});

describe("updateCategoryController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {
                name: "Updated Electronics",
            },
            params: {
                id: "507f1f77bcf86cd799439011",
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    // Input validation tests
    it("should return error if name is missing", async () => {
        req.body.name = "";

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    it("should return error if name is undefined", async () => {
        delete req.body.name;

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    it("should return error if id is missing", async () => {
        req.params.id = "";

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Category ID is required" });
    });

    // Whitespace-only input validation
    it("should return error for whitespace-only name", async () => {
        req.body.name = "   ";

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    // Logic tests - successful update
    it("should update category successfully", async () => {
        // fill mock with original electronics category first
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Updated Electronics",
            slug: "updated-electronics"
        };
        categoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439011",
            { name: "Updated Electronics", slug: "updated-electronics" },
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category updated successfully",
            category: mockCategory,
        });
    });

    // Logic tests - category not found
    it("should return error if category does not exist", async () => {
        categoryModel.findByIdAndUpdate.mockResolvedValue(null);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category not found",
        });
    });

    // Error handling tests
    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        categoryModel.findByIdAndUpdate.mockRejectedValue(errorMessage);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: errorMessage,
            message: "Error while updating Category",
        });
    });

    it("should handle invalid MongoDB ObjectId format", async () => {
        req.params.id = "invalid-id-format";
        const errorMessage = new Error("Cast to ObjectId failed");
        categoryModel.findByIdAndUpdate.mockRejectedValue(errorMessage);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: errorMessage,
            message: "Error while updating Category",
        });
    });

    // Edge cases
    describe("Edge cases", () => {
        it("should handle very long category names", async () => {
            const longName = "A".repeat(1000);
            req.body.name = longName;
            const mockCategory = {
                _id: "507f1f77bcf86cd799439011",
                name: longName,
                slug: "a".repeat(1000)
            };
            categoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: "Category updated successfully",
                category: mockCategory,
            });
        });

        it("should handle special characters in category name", async () => {
            req.body.name = "Electronics & Gadgets!@#$%";
            const mockCategory = {
                _id: "507f1f77bcf86cd799439011",
                name: "Electronics & Gadgets!@#$%",
                slug: "electronics-gadgets"
            };
            categoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: "Category updated successfully",
                category: mockCategory,
            });
        });

        it("should handle Unicode characters in category name", async () => {
            req.body.name = "电子产品 Electronics 😊";
            const mockCategory = {
                _id: "507f1f77bcf86cd799439011",
                name: "电子产品 Electronics 😊",
                slug: "dian-zi-chan-pin-electronics"
            };
            categoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: "Category updated successfully",
                category: mockCategory,
            });
        });
    });

    it("should trim both leading and trailing whitespace from name", async () => {
        req.body.name = "   Electronics   ";
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Electronics",
            slug: "electronics"
        };
        categoryModel.findByIdAndUpdate.mockResolvedValue(mockCategory);

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439011",
            { name: "Electronics", slug: "electronics" },
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe("deleteCategoryController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {
                id: "507f1f77bcf86cd799439011",
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    // Input validation tests
    it("should return error if id is missing", async () => {
        req.params.id = "";

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Category ID is required" });
    });

    it("should return error if id is undefined", async () => {
        delete req.params.id;

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Category ID is required" });
    });

    // Whitespace-only input validation
    it("should return error for whitespace-only id", async () => {
        req.params.id = "   ";

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Category ID is required" });
    });

    // Logic tests - successful deletion
    it("should delete category successfully", async () => {
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Electronics",
            slug: "electronics"
        };
        categoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

        await deleteCategoryController(req, res);

        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category deleted successfully",
        });
    });

    // Logic tests - category not found
    it("should return error if category does not exist", async () => {
        categoryModel.findByIdAndDelete.mockResolvedValue(null);

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category not found",
        });
    });

    // Error handling tests
    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        categoryModel.findByIdAndDelete.mockRejectedValue(errorMessage);

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: "Error while deleting Category",
            error: errorMessage,
        });
    });

    it("should handle invalid MongoDB ObjectId format", async () => {
        req.params.id = "invalid-id-format";
        const errorMessage = new Error("Cast to ObjectId failed");
        categoryModel.findByIdAndDelete.mockRejectedValue(errorMessage);

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            message: "Error while deleting Category",
            error: errorMessage,
        });
    });

    // Edge cases
    describe("Edge cases", () => {
        it("should handle deletion with valid 24-character hex string ID", async () => {
            req.params.id = "507f1f77bcf86cd799439011";
            const mockCategory = {
                _id: "507f1f77bcf86cd799439011",
                name: "Electronics",
                slug: "electronics"
            };
            categoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                message: "Category deleted successfully",
            });
        });

        it("should handle deletion attempt on already deleted category", async () => {
            categoryModel.findByIdAndDelete.mockResolvedValue(null);

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                message: "Category not found",
            });
        });

        it("should handle network timeout errors", async () => {
            const errorMessage = new Error("Network timeout");
            categoryModel.findByIdAndDelete.mockRejectedValue(errorMessage);

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                message: "Error while deleting Category",
                error: errorMessage,
            });
        });
    });

    // Whitespace handling in ID
    it("should trim both leading and trailing whitespace from id", async () => {
        req.params.id = "   507f1f77bcf86cd799439011   ";
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Electronics",
            slug: "electronics"
        };
        categoryModel.findByIdAndDelete.mockResolvedValue(mockCategory);

        await deleteCategoryController(req, res);

        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

describe("singleCategoryController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {
                slug: "electronics",
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    it("should return error if slug is missing", async () => {
        req.params.slug = "";

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ message: "Slug is required" });
    });

    it("should get category by slug successfully", async () => {
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Electronics",
            slug: "electronics"
        };
        categoryModel.findOne.mockResolvedValue(mockCategory);

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            message: "Get single Category successfully",
            category: mockCategory,
        });
    });

    it("should return error if category does not exist", async () => {
        categoryModel.findOne.mockResolvedValue(null);

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            message: "Category not found",
        });
    });

    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        categoryModel.findOne.mockRejectedValue(errorMessage);

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            error: errorMessage,
            message: "Error while getting single Category",
        });
    });

    it("should trim whitespace from slug", async () => {
        req.params.slug = "   electronics   ";
        const mockCategory = {
            _id: "507f1f77bcf86cd799439011",
            name: "Electronics",
            slug: "electronics"
        };
        categoryModel.findOne.mockResolvedValue(mockCategory);

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
    });
});



