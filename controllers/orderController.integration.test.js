import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";
import userModel from "../models/userModel.js";
import {
    getOrdersController,
    getAllOrdersController,
    orderStatusController,
} from "./orderController.js";

jest.setTimeout(30000);

describe("orderController - Integration Tests", () => {
    let mongoServer;
    let testUser;
    let testUser2;
    let testCategory;
    let testProducts;
    let orderCounter = 0;

    const createResponse = () => ({
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        json: jest.fn(),
    });

    const seedUser = async (overrides = {}) => {
        const timestamp = Date.now();
        return await userModel.create({
            name: "Test User",
            email: `test.user.${timestamp}@example.com`,
            password: "hashedpassword123",
            phone: "+14155552671",
            address: "123 Test Street",
            answer: "blue",
            DOB: "2000-01-01",
            ...overrides,
        });
    };

    const seedCategory = async (overrides = {}) => {
        return await categoryModel.create({
            name: `Test Category ${Date.now()}`,
            slug: `test-category-${Date.now()}`,
            ...overrides,
        });
    };

    const seedProduct = async (overrides = {}) => {
        return await productModel.create({
            name: `Test Product ${Date.now()}`,
            slug: `test-product-${Date.now()}`,
            description: "Test description",
            price: 99.99,
            category: testCategory._id,
            quantity: 10,
            ...overrides,
        });
    };

    const seedOrder = async (overrides = {}) => {
        orderCounter += 1;
        return await orderModel.create({
            products: testProducts.map((p) => p._id),
            payment: { method: "credit_card", transactionId: `txn-${orderCounter}` },
            buyer: testUser._id,
            status: "Not Processed",
            ...overrides,
        });
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            dbName: "order-controller-integration-tests",
        });
    });

    beforeEach(async () => {
        testUser = await seedUser({ name: "Primary User", email: `primary.${Date.now()}@test.com` });
        testUser2 = await seedUser({ name: "Secondary User", email: `secondary.${Date.now()}@test.com` });
        testCategory = await seedCategory({ name: "Electronics", slug: "electronics" });
        testProducts = [
            await seedProduct({ name: "Product 1", slug: "product-1" }),
            await seedProduct({ name: "Product 2", slug: "product-2" }),
        ];
    });

    afterEach(async () => {
        await orderModel.deleteMany({});
        await productModel.deleteMany({});
        await categoryModel.deleteMany({});
        await userModel.deleteMany({});
        jest.restoreAllMocks();
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe("getOrdersController", () => {
        test("returns orders for authenticated user only", async () => {
            // Create orders for both users
            await seedOrder({ buyer: testUser._id });
            await seedOrder({ buyer: testUser._id });
            await seedOrder({ buyer: testUser2._id });

            const req = { user: { _id: testUser._id } };
            const res = createResponse();

            await getOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders).toHaveLength(2);
            // All orders should belong to testUser
            orders.forEach((order) => {
                expect(order.buyer._id.toString()).toBe(testUser._id.toString());
            });
        });

        test("populates products excluding photo", async () => {
            await productModel.findByIdAndUpdate(testProducts[0]._id, {
                photo: {
                    data: Buffer.from("test image"),
                    contentType: "image/png",
                },
            });
            await seedOrder();

            const req = { user: { _id: testUser._id } };
            const res = createResponse();

            await getOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders[0].products).toHaveLength(2);
            expect(orders[0].products[0].name).toBeDefined();
            // Photo should be excluded - check that property doesn't exist on the document
            expect(orders[0].products[0].toObject()).not.toHaveProperty("photo");
        });

        test("populates buyer name", async () => {
            await seedOrder();

            const req = { user: { _id: testUser._id } };
            const res = createResponse();

            await getOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders[0].buyer.name).toBe("Primary User");
        });

        test("returns empty array when user has no orders", async () => {
            const req = { user: { _id: testUser._id } };
            const res = createResponse();

            await getOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders).toHaveLength(0);
        });

        test("returns 500 on database error", async () => {
            const req = { user: { _id: testUser._id } };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(orderModel, "find").mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockRejectedValue(dbError),
                }),
            });

            await getOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting orders",
                error: dbError,
            });

            consoleSpy.mockRestore();
        });
    });

    describe("getAllOrdersController", () => {
        test("returns all orders sorted by createdAt descending", async () => {
            const order1 = await seedOrder({ buyer: testUser._id });
            // Small delay to ensure different timestamps
            await new Promise((resolve) => setTimeout(resolve, 10));
            const order2 = await seedOrder({ buyer: testUser2._id });

            const req = {};
            const res = createResponse();

            await getAllOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders).toHaveLength(2);
            // Most recent first
            expect(orders[0]._id.toString()).toBe(order2._id.toString());
            expect(orders[1]._id.toString()).toBe(order1._id.toString());
        });

        test("populates products and buyer", async () => {
            await seedOrder();

            const req = {};
            const res = createResponse();

            await getAllOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders[0].products[0].name).toBeDefined();
            expect(orders[0].buyer.name).toBe("Primary User");
        });

        test("returns empty array when no orders", async () => {
            const req = {};
            const res = createResponse();

            await getAllOrdersController(req, res);

            const orders = res.json.mock.calls[0][0];
            expect(orders).toHaveLength(0);
        });

        test("returns 500 on database error", async () => {
            const req = {};
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(orderModel, "find").mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockRejectedValue(dbError),
                    }),
                }),
            });

            await getAllOrdersController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while getting all orders",
                error: dbError,
            });

            consoleSpy.mockRestore();
        });
    });

    describe("orderStatusController", () => {
        test("updates order status and returns updated order", async () => {
            const order = await seedOrder({ status: "Not Processed" });

            const req = {
                params: { orderId: order._id.toString() },
                body: { status: "Processing" },
            };
            const res = createResponse();

            await orderStatusController(req, res);

            const updatedOrder = res.json.mock.calls[0][0];
            expect(updatedOrder.status).toBe("Processing");

            // Verify persisted in database
            const dbOrder = await orderModel.findById(order._id);
            expect(dbOrder.status).toBe("Processing");
        });

        test.each([
            ["Not Processed"],
            ["Processing"],
            ["Shipped"],
            ["Delivered"],
            ["Cancelled"],
        ])("accepts valid status value: %s", async (status) => {
            const order = await seedOrder();

            const req = {
                params: { orderId: order._id.toString() },
                body: { status },
            };
            const res = createResponse();

            await orderStatusController(req, res);

            const updatedOrder = res.json.mock.calls[0][0];
            expect(updatedOrder.status).toBe(status);
        });

        test("returns 400 for invalid status value", async () => {
            const order = await seedOrder();

            const req = {
                params: { orderId: order._id.toString() },
                body: { status: "Invalid Status" },
            };
            const res = createResponse();

            await orderStatusController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Invalid status value",
            });
        });

        test("returns 404 when order not found", async () => {
            const nonExistentId = new mongoose.Types.ObjectId();

            const req = {
                params: { orderId: nonExistentId.toString() },
                body: { status: "Processing" },
            };
            const res = createResponse();

            await orderStatusController(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Order not found",
            });
        });

        test("returns 500 on database error", async () => {
            const order = await seedOrder();

            const req = {
                params: { orderId: order._id.toString() },
                body: { status: "Processing" },
            };
            const res = createResponse();
            const dbError = new Error("Database unavailable");
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

            jest.spyOn(orderModel, "findByIdAndUpdate").mockRejectedValue(dbError);

            await orderStatusController(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error while updating order",
                error: dbError,
            });

            consoleSpy.mockRestore();
        });
    });
});
