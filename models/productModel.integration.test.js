// Billy Ho Cheng En, A0252588R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import productModel from "./productModel.js";
import categoryModel from "./categoryModel.js";

jest.setTimeout(30000);

describe("Product Model - Integration Tests with Mongo Memory Server", () => {
    let mongoServer;
    let productCounter = 0;
    let testCategory;

    const buildValidProduct = (overrides = {}) => {
        productCounter += 1;
        return {
            name: `Product ${productCounter}`,
            slug: `product-${productCounter}`,
            description: `Description for product ${productCounter}`,
            price: 99.99,
            category: testCategory._id,
            quantity: 10,
            ...overrides,
        };
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "product-model-integration-tests",
        });
    });

    beforeEach(async () => {
        testCategory = await new categoryModel({
            name: `Test Category ${Date.now()}`,
            slug: "test-category",
        }).save();
    });

    afterEach(async () => {
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test("should save a valid product document", async () => {
        const product = new productModel(buildValidProduct());
        const savedProduct = await product.save();

        expect(savedProduct._id).toBeDefined();
        expect(savedProduct.name).toMatch(/^Product \d+$/);
        expect(savedProduct.slug).toMatch(/^product-\d+$/);
        expect(savedProduct.description).toMatch(/^Description for product \d+$/);
        expect(savedProduct.price).toBe(99.99);
        expect(savedProduct.category.toString()).toBe(testCategory._id.toString());
        expect(savedProduct.quantity).toBe(10);
    });

    test.each([
        ["name", undefined],
        ["slug", undefined],
        ["description", undefined],
        ["price", undefined],
        ["category", undefined],
        ["quantity", undefined],
    ])("should reject save when required field %s is missing", async (field, value) => {
        const product = new productModel(buildValidProduct({ [field]: value }));

        await expect(product.save()).rejects.toMatchObject({
            name: "ValidationError",
            errors: {
                [field]: expect.any(Object),
            },
        });
    });

    test("should have timestamps", async () => {
        const savedProduct = await new productModel(buildValidProduct()).save();

        expect(savedProduct.createdAt).toBeDefined();
        expect(savedProduct.updatedAt).toBeDefined();
    });

    test("should populate category reference correctly", async () => {
        const savedProduct = await new productModel(buildValidProduct()).save();

        const populatedProduct = await productModel
            .findById(savedProduct._id)
            .populate("category");

        expect(populatedProduct.category.name).toBe(testCategory.name);
        expect(populatedProduct.category.slug).toBe(testCategory.slug);
    });

    test("should default photo to empty object when not provided", async () => {
        const savedProduct = await new productModel(buildValidProduct()).save();

        expect(savedProduct.photo.data).toBeUndefined();
        expect(savedProduct.photo.contentType).toBeUndefined();
    });

    test("should store photo Buffer data correctly", async () => {
        const photoData = Buffer.from("test image data");
        const savedProduct = await new productModel(
            buildValidProduct({
                photo: {
                    data: photoData,
                    contentType: "image/png",
                },
            })
        ).save();

        expect(Buffer.compare(savedProduct.photo.data, photoData)).toBe(0);
        expect(savedProduct.photo.contentType).toBe("image/png");
    });

    test("should cast string to number for price and quantity", async () => {
        const savedProduct = await new productModel(
            buildValidProduct({ price: "199.99", quantity: "25" })
        ).save();

        expect(savedProduct.price).toBe(199.99);
        expect(typeof savedProduct.price).toBe("number");
        expect(savedProduct.quantity).toBe(25);
        expect(typeof savedProduct.quantity).toBe("number");
    });

    test.each([
        ["price", "not-a-number"],
        ["quantity", "not-a-number"],
    ])("should reject invalid type casting for %s", async (field, value) => {
        const product = new productModel(buildValidProduct({ [field]: value }));

        await expect(product.save()).rejects.toMatchObject({
            name: "ValidationError",
            errors: {
                [field]: expect.any(Object),
            },
        });
    });

    test("should allow shipping field to be optional", async () => {
        const withShipping = await new productModel(
            buildValidProduct({ shipping: true })
        ).save();
        const withoutShipping = await new productModel(buildValidProduct()).save();

        expect(withShipping.shipping).toBe(true);
        expect(withoutShipping.shipping).toBeUndefined();
    });

    test("should return correct values when retrieving by id", async () => {
        const savedProduct = await new productModel(
            buildValidProduct({
                name: "Retrieve Test Product",
                slug: "retrieve-test-product",
                description: "Test description",
                price: "149.99",
                quantity: "5",
                shipping: true,
            })
        ).save();

        const retrievedProduct = await productModel.findById(savedProduct._id);

        expect(retrievedProduct.name).toBe("Retrieve Test Product");
        expect(retrievedProduct.slug).toBe("retrieve-test-product");
        expect(retrievedProduct.description).toBe("Test description");
        expect(retrievedProduct.price).toBe(149.99);
        expect(retrievedProduct.quantity).toBe(5);
        expect(retrievedProduct.shipping).toBe(true);
        expect(retrievedProduct.category.toString()).toBe(testCategory._id.toString());
        expect(retrievedProduct.createdAt).toBeDefined();
        expect(retrievedProduct.updatedAt).toBeDefined();
    });
});
