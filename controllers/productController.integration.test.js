import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import {
    createProductController,
    updateProductController,
    deleteProductController,
    getProductController,
    getSingleProductController,
    productPhotoController,
    productFiltersController,
    productCountController,
    productListController,
    searchProductController,
    relatedProductController,
    productCategoryController,
} from "./productController.js";

jest.setTimeout(30000);

describe("productController - Integration Tests", () => {
    let mongoServer;
    let testCategory;
    let productCounter = 0;

    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
        set: jest.fn().mockReturnThis(),
    });

    const createProductRequest = (fields, files = {}, params = {}) => ({
        fields,
        files,
        params,
    });

    const seedCategory = async (overrides = {}) => {
        return await categoryModel.create({
            name: `Test Category ${Date.now()}`,
            slug: `test-category-${Date.now()}`,
            ...overrides,
        });
    };

    const seedProduct = async (overrides = {}) => {
        productCounter += 1;
        return await productModel.create({
            name: `Test Product ${productCounter}`,
            slug: `test-product-${productCounter}`,
            description: `Description for test product ${productCounter}`,
            price: 99.99,
            category: testCategory._id,
            quantity: 10,
            ...overrides,
        });
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "product-controller-integration-tests",
        });
    });

    beforeEach(async () => {
        testCategory = await seedCategory({ name: "Electronics", slug: "electronics" });
    });

    afterEach(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe("createProductController", () => {
        test("creates product with all required fields and returns 201", async () => {
            const req = createProductRequest({
                name: "iPhone 15",
                description: "Latest iPhone model",
                price: 999.99,
                category: testCategory._id.toString(),
                quantity: 50,
                shipping: true,
            });
            const res = createResponse();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("Product Created Successfully");
            expect(payload.products.name).toBe("iPhone 15");
            expect(payload.products.slug).toBe("iphone-15");
            expect(payload.products.price).toBe(999.99);

            // Verify persisted in database
            const dbProduct = await productModel.findById(payload.products._id);
            expect(dbProduct).not.toBeNull();
            expect(dbProduct.name).toBe("iPhone 15");
        });

        test.each([
            ["name", "Name is Required"],
            ["description", "Description is Required"],
            ["price", "Price is Required"],
            ["category", "Category is Required"],
            ["quantity", "Quantity is Required"],
        ])("returns 400 when %s is missing", async (missingField, expectedError) => {
            const allFields = {
                name: "Product",
                description: "Description",
                price: 99.99,
                category: testCategory._id.toString(),
                quantity: 10,
            };
            delete allFields[missingField];

            const req = createProductRequest(allFields);
            const res = createResponse();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({ error: expectedError });
        });

        test("allows quantity of 0", async () => {
            const req = createProductRequest({
                name: "Out of Stock Product",
                description: "Description",
                price: 99.99,
                category: testCategory._id.toString(),
                quantity: 0,
            });
            const res = createResponse();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products.quantity).toBe(0);
        });

        test("returns 400 when photo exceeds 1MB with correct error message", async () => {
            const req = createProductRequest(
                {
                    name: "Product",
                    description: "Description",
                    price: 99.99,
                    category: testCategory._id.toString(),
                    quantity: 10,
                },
                {
                    photo: {
                        size: 1000001, // Just over 1MB
                        path: "/tmp/test.jpg",
                        type: "image/jpeg",
                    },
                }
            );
            const res = createResponse();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            // The error message should use "than" not "then"
            expect(res.send).toHaveBeenCalledWith({
                error: "Photo should be less than 1MB",
            });
        });

        test("generates slug from name", async () => {
            const req = createProductRequest({
                name: "My Amazing Product",
                description: "Description",
                price: 99.99,
                category: testCategory._id.toString(),
                quantity: 10,
            });
            const res = createResponse();

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products.slug).toBe("my-amazing-product");
        });

        test("returns 500 on database error with correct message", async () => {
            const req = createProductRequest({
                name: "Product",
                description: "Description",
                price: 99.99,
                category: testCategory._id.toString(),
                quantity: 10,
            });
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            jest.spyOn(productModel.prototype, "save").mockRejectedValue(dbError);

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(false);
            // The message should say "creating" not "crearing"
            expect(payload.message).toBe("Error in creating product");

            consoleSpy.mockRestore();
        });
    });

    describe("updateProductController", () => {
        test("updates product and returns 200", async () => {
            const product = await seedProduct();

            const req = createProductRequest(
                {
                    name: "Updated Product",
                    description: "Updated description",
                    price: 149.99,
                    category: testCategory._id.toString(),
                    quantity: 20,
                },
                {},
                { pid: product._id.toString() }
            );
            const res = createResponse();

            await updateProductController(req, res);

            // Should return 200 for update, not 201
            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("Product Updated Successfully");
            expect(payload.products.name).toBe("Updated Product");
        });

        test("returns 404 when product not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = createProductRequest(
                {
                    name: "Updated Product",
                    description: "Updated description",
                    price: 149.99,
                    category: testCategory._id.toString(),
                    quantity: 20,
                },
                {},
                { pid: nonExistentId.toString() }
            );
            const res = createResponse();

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        });

        test("returns 500 on error with correct message", async () => {
            const product = await seedProduct();

            const req = createProductRequest(
                {
                    name: "Updated Product",
                    description: "Updated description",
                    price: 149.99,
                    category: testCategory._id.toString(),
                    quantity: 20,
                },
                {},
                { pid: product._id.toString() }
            );
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            jest.spyOn(productModel, "findByIdAndUpdate").mockRejectedValue(dbError);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const payload = res.send.mock.calls[0][0];
            // The message should say "Update" not "Updte"
            expect(payload.message).toBe("Error in Update product");

            consoleSpy.mockRestore();
        });
    });

    describe("deleteProductController", () => {
        test("deletes product and returns 200", async () => {
            const product = await seedProduct();

            const req = { params: { pid: product._id.toString() } };
            const res = createResponse();

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Deleted successfully",
            });

            // Verify deleted from database
            const dbProduct = await productModel.findById(product._id);
            expect(dbProduct).toBeNull();
        });

        test("returns 404 when product not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = { params: { pid: nonExistentId.toString() } };
            const res = createResponse();

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        });

        test("returns 500 on database error", async () => {
            const product = await seedProduct();

            const req = { params: { pid: product._id.toString() } };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            jest.spyOn(productModel, "findByIdAndDelete").mockReturnValue({
                select: jest.fn().mockRejectedValue(dbError),
            });

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while deleting product",
                error: dbError,
            });

            consoleSpy.mockRestore();
        });
    });

    describe("getProductController", () => {
        test("returns all products sorted by createdAt descending", async () => {
            await seedProduct({ name: "First Product" });
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            await seedProduct({ name: "Second Product" });

            const req = {};
            const res = createResponse();

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("All Products");
            expect(payload.products).toHaveLength(2);
            // Most recent first
            expect(payload.products[0].name).toBe("Second Product");
            expect(payload.products[1].name).toBe("First Product");
        });

        test("populates category reference", async () => {
            await seedProduct();

            const req = {};
            const res = createResponse();

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products[0].category).toBeDefined();
            expect(payload.products[0].category.name).toBe("Electronics");
        });

        test("excludes photo field from response", async () => {
            await seedProduct({
                photo: {
                    data: Buffer.from("test image"),
                    contentType: "image/png",
                },
            });

            const req = {};
            const res = createResponse();

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products[0].toObject()).not.toHaveProperty("photo");
        });

        test("returns correct countTotal", async () => {
            await seedProduct();
            await seedProduct();
            await seedProduct();

            const req = {};
            const res = createResponse();

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.countTotal).toBe(3);
        });

        test("returns 500 on database error", async () => {
            const req = {};
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            jest.spyOn(productModel, "find").mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        sort: jest.fn().mockRejectedValue(dbError),
                    }),
                }),
            });

            await getProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(false);
            expect(payload.message).toBe("Error in getting products");

            consoleSpy.mockRestore();
        });
    });

    describe("getSingleProductController", () => {
        test("returns product when found by slug", async () => {
            await seedProduct({ name: "Specific Product", slug: "specific-product" });

            const req = { params: { slug: "specific-product" } };
            const res = createResponse();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.message).toBe("Single Product Fetched");
            expect(payload.product.name).toBe("Specific Product");
        });

        test("returns 404 when product not found", async () => {
            const req = { params: { slug: "nonexistent-product" } };
            const res = createResponse();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        });

        test("populates category reference", async () => {
            await seedProduct({ slug: "test-slug" });

            const req = { params: { slug: "test-slug" } };
            const res = createResponse();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.product.category.name).toBe("Electronics");
        });

        test("excludes photo from response", async () => {
            await seedProduct({
                slug: "photo-test",
                photo: {
                    data: Buffer.from("test image"),
                    contentType: "image/png",
                },
            });

            const req = { params: { slug: "photo-test" } };
            const res = createResponse();

            await getSingleProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.product.toObject()).not.toHaveProperty("photo");
        });
    });

    describe("productPhotoController", () => {
        test("returns photo data with correct content-type", async () => {
            const photoData = Buffer.from("test image data");
            const product = await seedProduct({
                photo: {
                    data: photoData,
                    contentType: "image/jpeg",
                },
            });

            const req = { params: { pid: product._id.toString() } };
            const res = createResponse();

            await productPhotoController(req, res);

            expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
            expect(res.status).toHaveBeenCalledWith(200);
            const sentData = res.send.mock.calls[0][0];
            expect(Buffer.compare(sentData, photoData)).toBe(0);
        });

        test("returns 404 when product not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = { params: { pid: nonExistentId.toString() } };
            const res = createResponse();

            await productPhotoController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found",
            });
        });

        test("returns 404 when product has no photo", async () => {
            const product = await seedProduct();

            const req = { params: { pid: product._id.toString() } };
            const res = createResponse();

            await productPhotoController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "No photo found",
            });
        });
    });

    describe("productFiltersController", () => {
        test("filters by category", async () => {
            const category2 = await seedCategory({ name: "Clothing", slug: "clothing" });
            await seedProduct({ name: "Electronics Item", category: testCategory._id });
            await seedProduct({ name: "Clothing Item", category: category2._id });

            const req = {
                body: {
                    checked: [testCategory._id.toString()],
                    radio: [],
                },
            };
            const res = createResponse();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.products).toHaveLength(1);
            expect(payload.products[0].name).toBe("Electronics Item");
        });

        test("filters by price range", async () => {
            await seedProduct({ name: "Cheap Product", price: 10 });
            await seedProduct({ name: "Expensive Product", price: 1000 });

            const req = {
                body: {
                    checked: [],
                    radio: [0, 100],
                },
            };
            const res = createResponse();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(1);
            expect(payload.products[0].name).toBe("Cheap Product");
        });

        test("combines category and price filters", async () => {
            const category2 = await seedCategory({ name: "Clothing", slug: "clothing" });
            await seedProduct({ name: "Cheap Electronics", price: 50, category: testCategory._id });
            await seedProduct({ name: "Expensive Electronics", price: 500, category: testCategory._id });
            await seedProduct({ name: "Cheap Clothing", price: 30, category: category2._id });

            const req = {
                body: {
                    checked: [testCategory._id.toString()],
                    radio: [0, 100],
                },
            };
            const res = createResponse();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(1);
            expect(payload.products[0].name).toBe("Cheap Electronics");
        });

        test("returns all products when no filters", async () => {
            await seedProduct();
            await seedProduct();

            const req = {
                body: {
                    checked: [],
                    radio: [],
                },
            };
            const res = createResponse();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(2);
        });

        test("handles open-ended price range (no upper limit)", async () => {
            await seedProduct({ name: "Cheap Product", price: 50 });
            await seedProduct({ name: "Expensive Product", price: 5000 });

            const req = {
                body: {
                    checked: [],
                    radio: [100, null],
                },
            };
            const res = createResponse();

            await productFiltersController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(1);
            expect(payload.products[0].name).toBe("Expensive Product");
        });
    });

    describe("productCountController", () => {
        test("returns correct total count", async () => {
            await seedProduct();
            await seedProduct();
            await seedProduct();

            const req = {};
            const res = createResponse();

            await productCountController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.total).toBe(3);
        });
    });

    describe("productListController", () => {
        test("returns paginated products (6 per page)", async () => {
            // Create 8 products
            for (let i = 0; i < 8; i++) {
                await seedProduct({ name: `Product ${i}` });
            }

            const req = { params: { page: 1 } };
            const res = createResponse();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.products).toHaveLength(6);
        });

        test("defaults to page 1", async () => {
            for (let i = 0; i < 8; i++) {
                await seedProduct({ name: `Product ${i}` });
            }

            const req = { params: {} };
            const res = createResponse();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(6);
        });

        test("returns correct page based on param", async () => {
            for (let i = 0; i < 8; i++) {
                await seedProduct({ name: `Product ${i}` });
            }

            const req = { params: { page: 2 } };
            const res = createResponse();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(2); // 8 total, 6 on page 1, 2 on page 2
        });

        test("excludes photo from response", async () => {
            await seedProduct({
                photo: {
                    data: Buffer.from("test"),
                    contentType: "image/png",
                },
            });

            const req = { params: { page: 1 } };
            const res = createResponse();

            await productListController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products[0].toObject()).not.toHaveProperty("photo");
        });
    });

    describe("searchProductController", () => {
        test("searches by name (case-insensitive)", async () => {
            await seedProduct({ name: "iPhone 15 Pro", description: "Phone" });
            await seedProduct({ name: "Samsung Galaxy", description: "Phone" });

            const req = { params: { keyword: "iphone" } };
            const res = createResponse();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe("iPhone 15 Pro");
        });

        test("searches by description (case-insensitive)", async () => {
            await seedProduct({ name: "Product A", description: "This is a WIRELESS device" });
            await seedProduct({ name: "Product B", description: "This is a wired device" });

            const req = { params: { keyword: "wireless" } };
            const res = createResponse();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results).toHaveLength(1);
            expect(results[0].name).toBe("Product A");
        });

        test("returns empty array when no matches", async () => {
            await seedProduct({ name: "Product", description: "Description" });

            const req = { params: { keyword: "nonexistent" } };
            const res = createResponse();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results).toHaveLength(0);
        });

        test("excludes photo from results", async () => {
            await seedProduct({
                name: "Searchable Product",
                photo: {
                    data: Buffer.from("test"),
                    contentType: "image/png",
                },
            });

            const req = { params: { keyword: "Searchable" } };
            const res = createResponse();

            await searchProductController(req, res);

            const results = res.json.mock.calls[0][0];
            expect(results[0].toObject()).not.toHaveProperty("photo");
        });
    });

    describe("relatedProductController", () => {
        test("returns products in same category", async () => {
            const product1 = await seedProduct({ name: "Product 1" });
            await seedProduct({ name: "Product 2" });
            await seedProduct({ name: "Product 3" });

            const req = {
                params: {
                    pid: product1._id.toString(),
                    cid: testCategory._id.toString(),
                },
            };
            const res = createResponse();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            // Should not include product1 itself
            expect(payload.products.every((p) => p._id.toString() !== product1._id.toString())).toBe(true);
        });

        test("excludes current product from results", async () => {
            const product1 = await seedProduct({ name: "Current Product" });
            await seedProduct({ name: "Related Product" });

            const req = {
                params: {
                    pid: product1._id.toString(),
                    cid: testCategory._id.toString(),
                },
            };
            const res = createResponse();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products.map((p) => p.name)).not.toContain("Current Product");
        });

        test("limits to 3 products", async () => {
            const product1 = await seedProduct({ name: "Product 1" });
            await seedProduct({ name: "Product 2" });
            await seedProduct({ name: "Product 3" });
            await seedProduct({ name: "Product 4" });
            await seedProduct({ name: "Product 5" });

            const req = {
                params: {
                    pid: product1._id.toString(),
                    cid: testCategory._id.toString(),
                },
            };
            const res = createResponse();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(3);
        });

        test("returns empty array when no related products", async () => {
            const category2 = await seedCategory({ name: "Other", slug: "other" });
            const product1 = await seedProduct({ name: "Lonely Product", category: category2._id });

            const req = {
                params: {
                    pid: product1._id.toString(),
                    cid: category2._id.toString(),
                },
            };
            const res = createResponse();

            await relatedProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.products).toHaveLength(0);
        });
    });

    describe("productCategoryController", () => {
        test("returns category and products for given slug", async () => {
            await seedProduct({ name: "Electronics Product 1" });
            await seedProduct({ name: "Electronics Product 2" });

            const req = { params: { slug: "electronics" } };
            const res = createResponse();

            await productCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.success).toBe(true);
            expect(payload.category.name).toBe("Electronics");
            expect(payload.products).toHaveLength(2);
        });

        test("returns null category when not found", async () => {
            const req = { params: { slug: "nonexistent" } };
            const res = createResponse();

            await productCategoryController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.send.mock.calls[0][0];
            expect(payload.category).toBeNull();
            expect(payload.products).toHaveLength(0);
        });
    });
});
