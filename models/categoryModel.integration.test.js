// Billy Ho Cheng En, A0252588R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import categoryModel from "./categoryModel.js";

jest.setTimeout(30000);

describe("Category Model - Integration Tests with Mongo Memory Server", () => {
    let mongoServer;
    let categoryCounter = 0;

    const buildValidCategory = (overrides = {}) => {
        categoryCounter += 1;
        return {
            name: `Category ${categoryCounter}`,
            slug: `category-${categoryCounter}`,
            ...overrides,
        };
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "category-model-integration-tests",
        });
        // Ensure indexes are created
        await categoryModel.ensureIndexes();
    });

    afterEach(async () => {
        await categoryModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test("should save a valid category document", async () => {
        const category = new categoryModel(buildValidCategory());
        const savedCategory = await category.save();

        expect(savedCategory._id).toBeDefined();
        expect(savedCategory.name).toMatch(/^Category \d+$/);
        expect(savedCategory.slug).toMatch(/^category-\d+$/);
    });

    test("should reject save when required field name is missing", async () => {
        const category = new categoryModel(buildValidCategory({ name: undefined }));

        await expect(category.save()).rejects.toMatchObject({
            name: "ValidationError",
            errors: {
                name: expect.any(Object),
            },
        });
    });

    test("should enforce unique constraint on name", async () => {
        const name = "Duplicate Category";
        await new categoryModel(buildValidCategory({ name })).save();

        const duplicateCategory = new categoryModel(
            buildValidCategory({ name })
        );

        await expect(duplicateCategory.save()).rejects.toMatchObject({ code: 11000 });
    });

    test("should create a unique index on name in MongoDB", async () => {
        const indexes = await categoryModel.collection.indexes();
        const nameIndex = indexes.find((index) => index.key && index.key.name === 1);

        expect(nameIndex).toBeDefined();
        expect(nameIndex.unique).toBe(true);
    });

    test("should transform slug to lowercase", async () => {
        const category = new categoryModel(
            buildValidCategory({ slug: "ELECTRONICS" })
        );
        const savedCategory = await category.save();

        expect(savedCategory.slug).toBe("electronics");
    });

    test("should save without slug (optional field)", async () => {
        const categoryData = buildValidCategory();
        delete categoryData.slug;

        const savedCategory = await new categoryModel(categoryData).save();

        expect(savedCategory._id).toBeDefined();
        expect(savedCategory.name).toBeDefined();
        expect(savedCategory.slug).toBeUndefined();
    });

    test("should return correct values when retrieving by id", async () => {
        const savedCategory = await new categoryModel(
            buildValidCategory({
                name: "Retrieve Test Category",
                slug: "RETRIEVE-TEST",
            })
        ).save();

        const retrievedCategory = await categoryModel.findById(savedCategory._id);

        expect(retrievedCategory).toBeDefined();
        expect(retrievedCategory.name).toBe("Retrieve Test Category");
        expect(retrievedCategory.slug).toBe("retrieve-test");
    });
});
