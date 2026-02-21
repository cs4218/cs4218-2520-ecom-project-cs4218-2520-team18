// Aw Jean Leng Adrian, A0277537N

import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController,
} from "../controllers/categoryController.js";
import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

// Mock models and helpers
jest.mock("../models/categoryModel.js");
jest.mock("slugify");

// Suppress console.log during tests for cleaner output
const originalConsoleLog = console.log;
beforeAll(() => {
    console.log = jest.fn();
});
afterAll(() => {
    console.log = originalConsoleLog;
});

let req, res;

beforeEach(() => {
    jest.clearAllMocks();
    res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
    };
});

// CreateCategoryController Tests
describe("createCategoryController", () => {
    beforeEach(() => {
        req = {
            body: {},
        };
    });

    test("should create a new category successfully", async () => {
        const mockCategory = {
            _id: "cat123",
            name: "Electronics",
            slug: "electronics",
        };

        req.body = { name: "Electronics" };
        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("electronics");
        categoryModel.prototype.save = jest.fn().mockResolvedValue(mockCategory);

        await createCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronics" });
        expect(slugify).toHaveBeenCalledWith("Electronics");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "New category created",
            category: mockCategory,
        });
    });

    test("should return error when name is not provided", async () => {
        req.body = {};

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
        expect(categoryModel.findOne).not.toHaveBeenCalled();
    });

    test("should return message when category already exists", async () => {
        const existingCategory = {
            _id: "cat123",
            name: "Electronics",
            slug: "electronics",
        };

        req.body = { name: "Electronics" };
        categoryModel.findOne.mockResolvedValue(existingCategory);

        await createCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category already exists",
        });
        expect(slugify).not.toHaveBeenCalled();
    });

    test("should handle database errors gracefully", async () => {
        const error = new Error("Database connection error");
        req.body = { name: "Electronics" };
        categoryModel.findOne.mockRejectedValue(error);

        await createCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error in category",
        });
    });

    test("should handle slugify with special characters", async () => {
        const mockCategory = {
            _id: "cat124",
            name: "Home & Garden",
            slug: "home-garden",
        };

        req.body = { name: "Home & Garden" };

        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("home-garden");
        categoryModel.prototype.save = jest.fn().mockResolvedValue(mockCategory);
        await createCategoryController(req, res);

        expect(slugify).toHaveBeenCalledWith("Home & Garden");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "New category created",
            category: mockCategory,
        });
    });
});

// updateCategoryController Tests
describe("updateCategoryController", () => {
    beforeEach(() => {
        req = {
            body: {},
            params: {},
        };
    });

    test("should update category successfully", async () => {
        const mockUpdatedCategory = {
            _id: "cat123",
            name: "Updated Electronics",
            slug: "updated-electronics",
        };

        req.body = { name: "Updated Electronics" };
        req.params = { id: "cat123" };

        slugify.mockReturnValue("updated-electronics");
        categoryModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "cat123",
            { name: "Updated Electronics", slug: "updated-electronics" },
            { new: true }
        );
        expect(slugify).toHaveBeenCalledWith("Updated Electronics");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category updated successfully",
            category: mockUpdatedCategory,
        });
    });

    test("should handle update with empty name", async () => {
        const mockUpdatedCategory = {
            _id: "cat123",
            name: undefined,
            slug: undefined,
        };

        req.body = { name: undefined };
        req.params = { id: "cat123" };

        slugify.mockReturnValue(undefined);
        categoryModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedCategory);

        await updateCategoryController(req, res);

        expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "cat123",
            { name: undefined, slug: undefined },
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("should handle non-existent category ID", async () => {
        req.body = { name: "Test Category" };
        req.params = { id: "nonexistentid" };

        slugify.mockReturnValue("test-category");
        categoryModel.findByIdAndUpdate.mockResolvedValue(null);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category updated successfully",
            category: null,
        });
    });

    test("should handle database errors during update", async () => {
        const error = new Error("Database update error");
        req.body = { name: "Test Category" };
        req.params = { id: "cat123" };

        slugify.mockReturnValue("test-category");
        categoryModel.findByIdAndUpdate.mockRejectedValue(error);

        await updateCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while updating category",
        });
    });

    test("should handle invalid ObjectId format", async () => {
        const error = new Error("Cast to ObjectId failed");
        req.body = { name: "Test Category" };
        req.params = { id: "invalid-id" };

        slugify.mockReturnValue("test-category");
        categoryModel.findByIdAndUpdate.mockRejectedValue(error);

        await updateCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while updating category",
        });
    });
});

// categoryController Tests
describe("categoryController", () => {
    beforeEach(() => {
        req = {};
    });

    test("should retrieve all categories successfully", async () => {
        const mockCategories = [
            { _id: "cat1", name: "Electronics", slug: "electronics" },
            { _id: "cat2", name: "Books", slug: "books" },
            { _id: "cat3", name: "Clothing", slug: "clothing" },
        ];

        categoryModel.find.mockResolvedValue(mockCategories);

        await categoryController(req, res);

        expect(categoryModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "All Categories List",
            category: mockCategories,
        });
    });

    test("should return empty array when no categories exist", async () => {
        categoryModel.find.mockResolvedValue([]);

        await categoryController(req, res);

        expect(categoryModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "All Categories List",
            category: [],
        });
    });

    test("should handle database errors when fetching categories", async () => {
        const error = new Error("Database error");
        categoryModel.find.mockRejectedValue(error);

        await categoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while getting all categories",
        });
    });
});

// singleCategoryController Tests
describe("singleCategoryController", () => {
    beforeEach(() => {
        req = {
            params: {},
        };
    });

    test("should retrieve single category successfully", async () => {
        const mockCategory = {
            _id: "cat123",
            name: "Electronics",
            slug: "electronics",
        };

        req.params = { slug: "electronics" };
        categoryModel.findOne.mockResolvedValue(mockCategory);

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "electronics" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,  
            message: "Get single category successfully",
            category: mockCategory,
        });
    });

    test("should handle non-existent category slug", async () => {
        req.params = { slug: "nonexistent-slug" };
        categoryModel.findOne.mockResolvedValue(null);

        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "nonexistent-slug" });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Get single category successfully",
            category: null,
        });
    });

    test("should handle database errors when fetching single category", async () => {
        const error = new Error("Database connection timeout");
        req.params = { slug: "electronics" };
        categoryModel.findOne.mockRejectedValue(error);

        await singleCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error,
            message: "Error while getting single category",
        });
    });

    test("should handle special characters in slug", async () => {
        const mockCategory = {
            _id: "cat124",
            name: "Home & Garden",
            slug: "home-garden",
        };

        req.params = { slug: "home-garden" };
        categoryModel.findOne.mockResolvedValue(mockCategory);
        await singleCategoryController(req, res);

        expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "home-garden" });
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// deleteCategoryController Tests
describe("deleteCategoryController", () => {
    beforeEach(() => {
        req = {
            params: {},
        };
    });
    test("should delete category successfully", async () => {
        req.params = { id: "cat123" };
        categoryModel.findByIdAndDelete.mockResolvedValue({
            _id: "cat123",
            name: "Electronics",
            slug: "electronics",
        });

        await deleteCategoryController(req, res);

        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("cat123");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category Deleted Successfully",
        });
    });

    test("should handle deletion of non-existent category", async () => {
        req.params = { id: "nonexistentid" };
        categoryModel.findByIdAndDelete.mockResolvedValue(null);

        await deleteCategoryController(req, res);
        expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("nonexistentid");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Category Deleted Successfully",
        });
    });

    test("should handle database errors during deletion", async () => {
        const error = new Error("Delete operation failed");

        req.params = { id: "cat123" };
        categoryModel.findByIdAndDelete.mockRejectedValue(error);

        await deleteCategoryController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting category",
            error,
        });
    });

    test("should handle invalid ObjectId format during deletion", async () => {
        const error = new Error("Cast to ObjectId failed");

        req.params = { id: "invalid-id-format" };
        categoryModel.findByIdAndDelete.mockRejectedValue(error);

        await deleteCategoryController(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting category",
            error,
        });
    });
});