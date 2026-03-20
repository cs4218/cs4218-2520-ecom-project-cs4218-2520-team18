import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "../models/categoryModel.js";
import {
    createCategoryController,
    updateCategoryController,
    categoryController,
    singleCategoryController,
    deleteCategoryController,
} from "./categoryController.js";

jest.setTimeout(30000);

describe("categoryController - Integration Tests", () => {
    let mongoServer;
    let categoryCounter = 0;

    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
    });

    const seedCategory = async (overrides = {}) => {
        categoryCounter += 1;
        const category = await categoryModel.create({
            name: `Test Category ${categoryCounter}`,
            slug: `test-category-${categoryCounter}`,
            ...overrides,
        });
        return category;
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "category-controller-integration-tests",
        });
        await categoryModel.ensureIndexes();
    });

    afterEach(async () => {
        await categoryModel.deleteMany({});
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe("createCategoryController", () => {
        test("creates category with name and returns 201 with category object", async () => {
            const req = { body: { name: "Electronics" } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("New Category created");
            expect(payload.category.name).toBe("Electronics");
            expect(payload.category.slug).toBe("electronics");

            // Verify persisted in database
            const dbCategory = await categoryModel.findById(payload.category._id);
            expect(dbCategory).not.toBeNull();
            expect(dbCategory.name).toBe("Electronics");
        });

        test("returns 400 when name is missing", async () => {
            const req = { body: {} };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required",
            });
        });

        test("returns 400 when name is empty string", async () => {
            const req = { body: { name: "" } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required",
            });
        });

        test("returns 400 when name is whitespace only", async () => {
            const req = { body: { name: "   " } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required",
            });
        });

        test("returns 409 when category with same name already exists", async () => {
            await seedCategory({ name: "Electronics", slug: "electronics" });

            const req = { body: { name: "Electronics" } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category already exists",
            });
        });

        test("trims whitespace from name before saving", async () => {
            const req = { body: { name: "  Electronics  " } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.category.name).toBe("Electronics");

            const dbCategory = await categoryModel.findById(payload.category._id);
            expect(dbCategory.name).toBe("Electronics");
        });

        test("generates lowercase hyphenated slug from name", async () => {
            const req = { body: { name: "Home & Garden" } };
            const res = createResponse();

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.category.slug).toBe("home-and-garden");
        });

        test("returns 500 on database error", async () => {
            const req = { body: { name: "Electronics" } };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(categoryModel.prototype, "save").mockRejectedValue(dbError);

            await createCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error in Category",
            });

            consoleSpy.mockRestore();
        });
    });

    describe("updateCategoryController", () => {
        test("updates category name and slug, returns 200", async () => {
            const category = await seedCategory({ name: "Old Name", slug: "old-name" });

            const req = {
                body: { name: "New Name" },
                params: { id: category._id.toString() },
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("Category updated successfully");
            expect(payload.category.name).toBe("New Name");
            expect(payload.category.slug).toBe("new-name");

            // Verify persisted in database
            const dbCategory = await categoryModel.findById(category._id);
            expect(dbCategory.name).toBe("New Name");
            expect(dbCategory.slug).toBe("new-name");
        });

        test("returns 400 when name is missing", async () => {
            const category = await seedCategory();

            const req = {
                body: {},
                params: { id: category._id.toString() },
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required",
            });
        });

        test("returns 400 when name is empty", async () => {
            const category = await seedCategory();

            const req = {
                body: { name: "" },
                params: { id: category._id.toString() },
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Name is required",
            });
        });

        test("returns 400 when id is missing", async () => {
            const req = {
                body: { name: "New Name" },
                params: {},
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required",
            });
        });

        test("returns 404 when category not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = {
                body: { name: "New Name" },
                params: { id: nonExistentId.toString() },
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category not found",
            });
        });

        test("trims whitespace from name before updating", async () => {
            const category = await seedCategory();

            const req = {
                body: { name: "  Trimmed Name  " },
                params: { id: category._id.toString() },
            };
            const res = createResponse();

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.category.name).toBe("Trimmed Name");
        });

        test("returns 500 on database error", async () => {
            const category = await seedCategory();

            const req = {
                body: { name: "New Name" },
                params: { id: category._id.toString() },
            };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(categoryModel, "findByIdAndUpdate").mockRejectedValue(dbError);

            await updateCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error while updating Category",
            });

            consoleSpy.mockRestore();
        });
    });

    describe("categoryController (get all)", () => {
        test("returns 200 with empty array when no categories", async () => {
            const req = {};
            const res = createResponse();

            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("All Categories List");
            expect(payload.category).toEqual([]);
        });

        test("returns 200 with all categories", async () => {
            await seedCategory({ name: "Category A", slug: "category-a" });
            await seedCategory({ name: "Category B", slug: "category-b" });

            const req = {};
            const res = createResponse();

            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.category).toHaveLength(2);
            expect(payload.category.map((c) => c.name)).toContain("Category A");
            expect(payload.category.map((c) => c.name)).toContain("Category B");
        });

        test("returns 500 on database error", async () => {
            const req = {};
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(categoryModel, "find").mockRejectedValue(dbError);

            await categoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error while getting all categories",
            });

            consoleSpy.mockRestore();
        });
    });

    describe("singleCategoryController", () => {
        test("returns 200 with category when found by slug", async () => {
            const category = await seedCategory({ name: "Electronics", slug: "electronics" });

            const req = { params: { slug: "electronics" } };
            const res = createResponse();

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("Get single category successfully");
            expect(payload.category.name).toBe("Electronics");
            expect(payload.category._id.toString()).toBe(category._id.toString());
        });

        test("returns 404 when category not found", async () => {
            const req = { params: { slug: "nonexistent" } };
            const res = createResponse();

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category not found",
            });
        });

        test("trims whitespace from slug parameter", async () => {
            await seedCategory({ name: "Electronics", slug: "electronics" });

            const req = { params: { slug: "  electronics  " } };
            const res = createResponse();

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.category.name).toBe("Electronics");
        });

        test("returns 500 on database error", async () => {
            const req = { params: { slug: "electronics" } };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(categoryModel, "findOne").mockRejectedValue(dbError);

            await singleCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error: dbError,
                message: "Error while getting single category",
            });

            consoleSpy.mockRestore();
        });
    });

    describe("deleteCategoryController", () => {
        test("deletes category and returns 200", async () => {
            const category = await seedCategory();

            const req = { params: { id: category._id.toString() } };
            const res = createResponse();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Category deleted successfully",
            });

            // Verify deleted from database
            const dbCategory = await categoryModel.findById(category._id);
            expect(dbCategory).toBeNull();
        });

        test("returns 400 when id is missing", async () => {
            const req = { params: {} };
            const res = createResponse();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required",
            });
        });

        test("returns 400 when id is empty", async () => {
            const req = { params: { id: "" } };
            const res = createResponse();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category ID is required",
            });
        });

        test("returns 404 when category not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = { params: { id: nonExistentId.toString() } };
            const res = createResponse();

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Category not found",
            });
        });

        test("returns 500 on database error", async () => {
            const category = await seedCategory();

            const req = { params: { id: category._id.toString() } };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(categoryModel, "findByIdAndDelete").mockRejectedValue(dbError);

            await deleteCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while deleting Category",
                error: dbError,
            });

            consoleSpy.mockRestore();
        });
    });
});
