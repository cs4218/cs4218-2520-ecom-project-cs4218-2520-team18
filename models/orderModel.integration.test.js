// Billy Ho Cheng En, A0252588R

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import orderModel from "./orderModel.js";
import productModel from "./productModel.js";
import categoryModel from "./categoryModel.js";
import userModel from "./userModel.js";

jest.setTimeout(30000);

describe("Order Model - Integration Tests with Mongo Memory Server", () => {
    let mongoServer;
    let orderCounter = 0;
    let testUser;
    let testCategory;
    let testProducts;

    const buildValidOrder = (overrides = {}) => {
        orderCounter += 1;
        return {
            products: testProducts.map((p) => p._id),
            payment: { method: "credit_card", transactionId: `txn-${orderCounter}` },
            buyer: testUser._id,
            ...overrides,
        };
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "order-model-integration-tests",
        });
    });

    beforeEach(async () => {
        // Create test user
        testUser = await new userModel({
            name: "Test User",
            email: `test.user.${Date.now()}@example.com`,
            password: "password123",
            phone: "+14155552671",
            address: "123 Test Street",
            answer: "blue",
            DOB: "2000-01-01",
        }).save();

        // Create test category
        testCategory = await new categoryModel({
            name: `Test Category ${Date.now()}`,
            slug: "test-category",
        }).save();

        // Create test products
        testProducts = await Promise.all([
            new productModel({
                name: "Test Product 1",
                slug: "test-product-1",
                description: "Description 1",
                price: 99.99,
                category: testCategory._id,
                quantity: 10,
            }).save(),
            new productModel({
                name: "Test Product 2",
                slug: "test-product-2",
                description: "Description 2",
                price: 149.99,
                category: testCategory._id,
                quantity: 5,
            }).save(),
        ]);
    });

    afterEach(async () => {
        await orderModel.deleteMany({});
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test("should save a valid order document", async () => {
        const order = new orderModel(buildValidOrder());
        const savedOrder = await order.save();

        expect(savedOrder._id).toBeDefined();
        expect(savedOrder.products).toHaveLength(2);
        expect(savedOrder.payment).toBeDefined();
        expect(savedOrder.buyer.toString()).toBe(testUser._id.toString());
    });

    test("should set default status to 'Not Processed' when omitted", async () => {
        const orderData = buildValidOrder();
        delete orderData.status;

        const savedOrder = await new orderModel(orderData).save();

        expect(savedOrder.status).toBe("Not Processed");
    });

    test.each([
        ["Not Processed"],
        ["Processing"],
        ["Shipped"],
        ["Delivered"],
        ["Cancelled"],
    ])("should accept valid status value: %s", async (status) => {
        const savedOrder = await new orderModel(
            buildValidOrder({ status })
        ).save();

        expect(savedOrder.status).toBe(status);
    });

    test("should reject invalid status value", async () => {
        const order = new orderModel(
            buildValidOrder({ status: "Invalid Status" })
        );

        await expect(order.save()).rejects.toMatchObject({
            name: "ValidationError",
            errors: {
                status: expect.any(Object),
            },
        });
    });

    test("should have timestamps", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        expect(savedOrder.createdAt).toBeDefined();
        expect(savedOrder.updatedAt).toBeDefined();
    });

    test("should save with empty products array", async () => {
        const savedOrder = await new orderModel(
            buildValidOrder({ products: [] })
        ).save();

        expect(savedOrder._id).toBeDefined();
        expect(savedOrder.products).toHaveLength(0);
    });

    test("should save with single product", async () => {
        const savedOrder = await new orderModel(
            buildValidOrder({ products: [testProducts[0]._id] })
        ).save();

        expect(savedOrder.products).toHaveLength(1);
        expect(savedOrder.products[0].toString()).toBe(testProducts[0]._id.toString());
    });

    test("should save with multiple products", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        expect(savedOrder.products).toHaveLength(2);
    });

    test("should populate products correctly", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        const populatedOrder = await orderModel
            .findById(savedOrder._id)
            .populate("products");

        expect(populatedOrder.products).toHaveLength(2);
        expect(populatedOrder.products[0].name).toBe("Test Product 1");
        expect(populatedOrder.products[1].name).toBe("Test Product 2");
    });

    test("should populate products with field exclusion", async () => {
        // Add photo to one product
        await productModel.findByIdAndUpdate(testProducts[0]._id, {
            photo: {
                data: Buffer.from("test image"),
                contentType: "image/png",
            },
        });

        const savedOrder = await new orderModel(buildValidOrder()).save();

        const populatedOrder = await orderModel
            .findById(savedOrder._id)
            .populate("products", "-photo");

        expect(populatedOrder.products[0].name).toBeDefined();
        // When photo is excluded via projection, it should not be in the result
        expect(populatedOrder.products[0].toObject()).not.toHaveProperty("photo");
    });

    test("should save with valid buyer reference", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        expect(savedOrder.buyer.toString()).toBe(testUser._id.toString());
    });

    test("should populate buyer correctly", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        const populatedOrder = await orderModel
            .findById(savedOrder._id)
            .populate("buyer");

        expect(populatedOrder.buyer).toBeDefined();
        expect(populatedOrder.buyer.name).toBe("Test User");
        expect(populatedOrder.buyer.email).toMatch(/^test\.user\.\d+@example\.com$/);
    });

    test("should save with simple payment object", async () => {
        const savedOrder = await new orderModel(
            buildValidOrder({
                payment: { method: "cash" },
            })
        ).save();

        expect(savedOrder.payment).toEqual({ method: "cash" });
    });

    test("should save with complex nested payment object", async () => {
        const complexPayment = {
            method: "credit_card",
            card: {
                last4: "1234",
                brand: "visa",
            },
            amount: 249.98,
            currency: "USD",
            metadata: {
                orderId: "order-123",
                timestamp: "2024-01-01T00:00:00Z",
            },
        };

        const savedOrder = await new orderModel(
            buildValidOrder({ payment: complexPayment })
        ).save();

        expect(savedOrder.payment).toEqual(complexPayment);
    });

    test("should save with empty payment object", async () => {
        const savedOrder = await new orderModel(
            buildValidOrder({ payment: {} })
        ).save();

        expect(savedOrder.payment).toEqual({});
    });

    test("should populate both products and buyer", async () => {
        const savedOrder = await new orderModel(buildValidOrder()).save();

        const populatedOrder = await orderModel
            .findById(savedOrder._id)
            .populate("products")
            .populate("buyer");

        expect(populatedOrder.products).toHaveLength(2);
        expect(populatedOrder.products[0].name).toBe("Test Product 1");
        expect(populatedOrder.buyer.name).toBe("Test User");
    });

    test("should save with non-existent product ObjectIds (no referential integrity)", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const savedOrder = await new orderModel(
            buildValidOrder({ products: [nonExistentId] })
        ).save();

        expect(savedOrder._id).toBeDefined();
        expect(savedOrder.products[0].toString()).toBe(nonExistentId.toString());
    });

    test("should save with non-existent buyer ObjectId (no referential integrity)", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const savedOrder = await new orderModel(
            buildValidOrder({ buyer: nonExistentId })
        ).save();

        expect(savedOrder._id).toBeDefined();
        expect(savedOrder.buyer.toString()).toBe(nonExistentId.toString());
    });

    test("should return correct values when retrieving by id", async () => {
        const savedOrder = await new orderModel(
            buildValidOrder({
                status: "Processing",
                payment: { method: "paypal", amount: 249.98 },
            })
        ).save();

        const retrievedOrder = await orderModel.findById(savedOrder._id);

        expect(retrievedOrder).toBeDefined();
        expect(retrievedOrder.products).toHaveLength(2);
        expect(retrievedOrder.status).toBe("Processing");
        expect(retrievedOrder.payment).toEqual({ method: "paypal", amount: 249.98 });
        expect(retrievedOrder.buyer.toString()).toBe(testUser._id.toString());
        expect(retrievedOrder.createdAt).toBeDefined();
        expect(retrievedOrder.updatedAt).toBeDefined();
    });
});
