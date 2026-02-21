// Aw Jean Leng Adrian, A0277537N

import {
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} from "../controllers/orderController.js";
import orderModel from "../models/orderModel.js";

// Mock models
jest.mock("../models/orderModel.js");

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

// getOrdersController Tests
describe("getOrdersController", () => {
    beforeEach(() => {
        req = {
            user: { _id: "user123" }
        };
    });

    test("should retrieve orders for authenticated user", async () => {
        const mockOrders = [
            {
                _id: "order1",
                buyer: { _id: "user123", name: "Test User" },
                products: [{ _id: "prod1", name: "Product 1"}],
                status: "Processing",
            },
            {
                _id: "order2",
                buyer: { _id: "user123", name: "Test User" },
                products: [{ _id: "prod2", name: "Product 2" }],
                status: "Delivered",
            },
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
        };

        mockQuery.populate
            .mockReturnValueOnce(mockQuery)
            .mockResolvedValueOnce(mockOrders);

        orderModel.find.mockReturnValue(mockQuery);

        await getOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({ buyer: "user123" });
        expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
        expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
        expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    test("should return empty array when user has no orders", async () => {
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
        };

        mockQuery.populate
            .mockReturnValueOnce(mockQuery)
            .mockResolvedValueOnce([]);

        orderModel.find.mockReturnValue(mockQuery);

        await getOrdersController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should handle database errors", async () => {
        const error = new Error("Database error");
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
        };

        mockQuery.populate
            .mockReturnValueOnce(mockQuery)
            .mockRejectedValueOnce(error);

        orderModel.find.mockReturnValue(mockQuery);
        

        await getOrdersController(req, res);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting orders",
            error,
        });
    });
});

// getAllOrdersController Tests
describe("getAllOrdersController", () => {
    beforeEach(() => {
        req = {};
    });

    test("should retrieve all oredrs sorted by creation date", async () => {
        const mockOrders = [
            {
                _id: "order1",
                buyer: { _id: "user123", name: "Test User" },
                products: [{ _id: "prod1", name: "Product 1"}],
                createdAt: new Date("2026-01-01"),
            },
            {
                _id: "order2",
                buyer: { _id: "user456", name: "Another User" },
                products: [{ _id: "prod2", name: "Product 2" }],
                createdAt: new Date("2026-01-02"),
            },
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockOrders),
        };

        orderModel.find.mockReturnValue(mockQuery);
        mockQuery.sort.mockReturnValue(mockOrders);

        await getAllOrdersController(req, res);

        expect(orderModel.find).toHaveBeenCalledWith({});
        expect(mockQuery.populate).toHaveBeenCalledWith("products", "-photo");
        expect(mockQuery.populate).toHaveBeenCalledWith("buyer", "name");
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: "-1" });
        expect(res.json).toHaveBeenCalledWith(mockOrders);
    });

    test("should return empty array when no orders exist", async () => {
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([]),
        };
        orderModel.find.mockReturnValue(mockQuery);
        mockQuery.sort.mockReturnValue([]);

        await getAllOrdersController(req, res);
        expect(res.json).toHaveBeenCalledWith([]);
    });

    test("should handle database errors", async () => {
        const error = new Error("Database error");
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockRejectedValue(error),
        };

        orderModel.find.mockReturnValue(mockQuery);
        mockQuery.sort.mockRejectedValue(error);

        await getAllOrdersController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while getting all orders",
            error,
        });
    });
});

// orderStatusController Tests
describe("orderStatusController", () => {
    beforeEach(() => {
        req = {
            params: {orderId: "order123" },
            body: { status: "Shipped" },
        };
    });

    test("should successfully update order status", async () => {
        const mockUpdatedOrder = {
            _id: "order123",
            status: "Shipped",
            buyer: "user123",
            products: ["prod1"],
        };

        orderModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedOrder);

        await orderStatusController(req, res);

        expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "order123",
            { status: "Shipped" },
            { new: true }
        );
        expect(res.json).toHaveBeenCalledWith(mockUpdatedOrder);
    });

    test("should update to different status values", async () => {
        const statuses = ["Processing", "Shipped", "Delivered", "Cancelled"];

        for (const status of statuses) {
            jest.clearAllMocks();
            req.body.status = status;

            const mockOrder = {
                _id: "order123",
                status,
            };
            
            orderModel.findByIdAndUpdate.mockResolvedValue(mockOrder);

            await orderStatusController(req, res);

            expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
                "order123",
                { status },
                { new: true }
            );
            expect(res.json).toHaveBeenCalledWith(mockOrder);
        }
    });

    test("should handle non-existent order ID", async () => {
        orderModel.findByIdAndUpdate.mockResolvedValue(null);

        await orderStatusController(req, res);

        expect(res.json).toHaveBeenCalledWith(null);
    });

    test("should handle database errors", async () => {
        const error = new Error("Update failed");
        orderModel.findByIdAndUpdate.mockRejectedValue(error);

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating order",
        error,
        });
    });

    test("should handle invalid order ID format", async () => {
        req.params.orderId = "invalid-id";
        const error = new Error("Cast to ObjectId failed");
        orderModel.findByIdAndUpdate.mockRejectedValue(error);

        await orderStatusController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while updating order",
        error,
        });
    });
});