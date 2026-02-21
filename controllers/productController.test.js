import {
    createProductController,
    updateProductController,
    deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import fs from "fs";

jest.mock("../models/productModel.js");
jest.mock("fs");

// Lim Kok Liang, A0252776U
describe("createProductController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            fields: {
                name: "Test Product",
                description: "Test Description",
                price: 100,
                category: "507f1f77bcf86cd799439011",
                quantity: 10,
                shipping: true
            },
            files: {
                photo: {
                    path: "/tmp/test.jpg",
                    type: "image/jpeg",
                    size: 500000
                }
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    // Input validation tests
    const requiredFields = [
        { field: 'name', error: 'Name is Required' },
        { field: 'description', error: 'Description is Required' },
        { field: 'price', error: 'Price is Required' },
        { field: 'category', error: 'Category is Required' },
        { field: 'quantity', error: 'Quantity is Required' }
    ];

    it.each(requiredFields)("should return error if $field is missing", async ({ field, error }) => {
        req.fields[field] = "";

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it.each(requiredFields)("should return error if $field is undefined", async ({ field, error }) => {
        delete req.fields[field];

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it("should return error if photo size exceeds 1MB", async () => {
        req.files.photo.size = 1500000;

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ 
            error: "photo is Required and should be less then 1mb" 
        });
    });

    // Whitespace-only input validation
    const whitespaceFields = [
        { field: 'name', error: 'Name is Required' },
        { field: 'description', error: 'Description is Required' }
    ];

    it.each(whitespaceFields)("should return error for whitespace-only $field", async ({ field, error }) => {
        req.fields[field] = "   ";

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    // Logic tests - successful creation
    it("should create product successfully without photo", async () => {
        delete req.files.photo;
        const mockSave = jest.fn().mockResolvedValue({
            _id: "507f1f77bcf86cd799439011",
            name: "Test Product",
            slug: "test-product",
            description: "Test Description",
            price: 100,
            category: "507f1f77bcf86cd799439011",
            quantity: 10,
            shipping: true
        });
        productModel.mockImplementation(() => ({
            save: mockSave
        }));

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Created Successfully",
            products: expect.any(Object)
        });
    });

    it("should create product successfully with photo", async () => {
        const mockPhotoData = Buffer.from("fake image data");
        fs.readFileSync.mockReturnValue(mockPhotoData);
        const mockProduct = {
            photo: { data: null, contentType: null },
            save: jest.fn().mockResolvedValue({
                _id: "507f1f77bcf86cd799439011",
                name: "Test Product",
                slug: "test-product"
            })
        };
        productModel.mockImplementation(() => mockProduct);

        await createProductController(req, res);

        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/test.jpg");
        expect(mockProduct.photo.data).toBe(mockPhotoData);
        expect(mockProduct.photo.contentType).toBe("image/jpeg");
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Created Successfully",
            products: expect.any(Object)
        });
    });

    // Error handling tests
    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        productModel.mockImplementation(() => ({
            save: jest.fn().mockRejectedValue(errorMessage)
        }));
        delete req.files.photo;

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: errorMessage,
            message: "Error in crearing product"
        });
    });

    it("should handle file system errors when reading photo", async () => {
        const errorMessage = new Error("File read error");
        fs.readFileSync.mockImplementation(() => {
            throw errorMessage;
        });
        productModel.mockImplementation(() => ({
            photo: { data: null, contentType: null },
            save: jest.fn()
        }));

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: errorMessage,
            message: "Error in crearing product"
        });
    });

    // Edge cases
    describe("Edge cases", () => {
        it("should handle product with exact 1MB photo size", async () => {
            req.files.photo.size = 1000000;
            const mockPhotoData = Buffer.from("fake image data");
            fs.readFileSync.mockReturnValue(mockPhotoData);
            const mockProduct = {
                photo: { data: null, contentType: null },
                save: jest.fn().mockResolvedValue({
                    _id: "507f1f77bcf86cd799439011",
                    name: "Test Product"
                })
            };
            productModel.mockImplementation(() => mockProduct);

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle very long product names", async () => {
            const longName = "A".repeat(1000);
            req.fields.name = longName;
            delete req.files.photo;
            productModel.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue({ name: longName })
            }));

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle very long descriptions", async () => {
            const longDescription = "B".repeat(5000);
            req.fields.description = longDescription;
            delete req.files.photo;
            productModel.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue({ description: longDescription })
            }));

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle zero price", async () => {
            req.fields.price = 0;
            delete req.files.photo;
            productModel.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue({ price: 0 })
            }));

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle zero quantity", async () => {
            req.fields.quantity = 0;
            delete req.files.photo;
            productModel.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue({ quantity: 0 })
            }));

            await createProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle different image types", async () => {
            req.files.photo.type = "image/png";
            const mockPhotoData = Buffer.from("fake png data");
            fs.readFileSync.mockReturnValue(mockPhotoData);
            const mockProduct = {
                photo: { data: null, contentType: null },
                save: jest.fn().mockResolvedValue({})
            };
            productModel.mockImplementation(() => mockProduct);

            await createProductController(req, res);

            expect(mockProduct.photo.contentType).toBe("image/png");
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

// Lim Kok Liang, A0252776U
describe("updateProductController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {
                pid: "507f1f77bcf86cd799439011"
            },
            fields: {
                name: "Updated Product",
                description: "Updated Description",
                price: 150,
                category: "507f1f77bcf86cd799439012",
                quantity: 20,
                shipping: true
            },
            files: {
                photo: {
                    path: "/tmp/updated.jpg",
                    type: "image/jpeg",
                    size: 500000
                }
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    // Input validation tests
    const requiredFields = [
        { field: 'name', error: 'Name is Required' },
        { field: 'description', error: 'Description is Required' },
        { field: 'price', error: 'Price is Required' },
        { field: 'category', error: 'Category is Required' },
        { field: 'quantity', error: 'Quantity is Required' }
    ];

    it.each(requiredFields)("should return error if $field is missing", async ({ field, error }) => {
        req.fields[field] = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it.each(requiredFields)("should return error if $field is undefined", async ({ field, error }) => {
        delete req.fields[field];

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it("should return error if photo size exceeds 1MB", async () => {
        req.files.photo.size = 1500000;

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ 
            error: "photo is Required and should be less then 1mb" 
        });
    });

    // Whitespace-only input validation
    const whitespaceFields = [
        { field: 'name', error: 'Name is Required' },
        { field: 'description', error: 'Description is Required' }
    ];

    it.each(whitespaceFields)("should return error for whitespace-only $field", async ({ field, error }) => {
        req.fields[field] = "   ";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    // Logic tests - successful update
    it("should update product successfully without photo", async () => {
        delete req.files.photo;
        const mockProduct = {
            _id: "507f1f77bcf86cd799439011",
            name: "Updated Product",
            slug: "updated-product",
            save: jest.fn().mockResolvedValue(true)
        };
        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        await updateProductController(req, res);

        expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
            "507f1f77bcf86cd799439011",
            expect.objectContaining({
                name: "Updated Product",
                description: "Updated Description",
                price: 150,
                slug: "updated-product"
            }),
            { new: true }
        );
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Updated Successfully",
            products: mockProduct
        });
    });

    it("should update product successfully with photo", async () => {
        const mockPhotoData = Buffer.from("fake updated image data");
        fs.readFileSync.mockReturnValue(mockPhotoData);
        const mockProduct = {
            _id: "507f1f77bcf86cd799439011",
            name: "Updated Product",
            slug: "updated-product",
            photo: { data: null, contentType: null },
            save: jest.fn().mockResolvedValue(true)
        };
        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        await updateProductController(req, res);

        expect(fs.readFileSync).toHaveBeenCalledWith("/tmp/updated.jpg");
        expect(mockProduct.photo.data).toBe(mockPhotoData);
        expect(mockProduct.photo.contentType).toBe("image/jpeg");
        expect(mockProduct.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(201);
    });

    // Error handling tests
    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        productModel.findByIdAndUpdate.mockRejectedValue(errorMessage);
        delete req.files.photo;

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: errorMessage,
            message: "Error in Updte product"
        });
    });

    it("should handle invalid MongoDB ObjectId format", async () => {
        req.params.pid = "invalid-id-format";
        const errorMessage = new Error("Cast to ObjectId failed");
        productModel.findByIdAndUpdate.mockRejectedValue(errorMessage);
        delete req.files.photo;

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: errorMessage,
            message: "Error in Updte product"
        });
    });

    it("should handle file system errors when reading photo", async () => {
        const errorMessage = new Error("File read error");
        fs.readFileSync.mockImplementation(() => {
            throw errorMessage;
        });
        const mockProduct = {
            photo: { data: null, contentType: null },
            save: jest.fn()
        };
        productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            error: errorMessage,
            message: "Error in Updte product"
        });
    });

    // Edge cases
    describe("Edge cases", () => {
        it("should handle updating product with exact 1MB photo size", async () => {
            req.files.photo.size = 1000000;
            const mockPhotoData = Buffer.from("fake image data");
            fs.readFileSync.mockReturnValue(mockPhotoData);
            const mockProduct = {
                photo: { data: null, contentType: null },
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle updating with very long product names", async () => {
            const longName = "A".repeat(1000);
            req.fields.name = longName;
            delete req.files.photo;
            const mockProduct = {
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle updating with zero price", async () => {
            req.fields.price = 0;
            delete req.files.photo;
            const mockProduct = {
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle updating with zero quantity", async () => {
            req.fields.quantity = 0;
            delete req.files.photo;
            const mockProduct = {
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle updating with different image types", async () => {
            req.files.photo.type = "image/png";
            const mockPhotoData = Buffer.from("fake png data");
            fs.readFileSync.mockReturnValue(mockPhotoData);
            const mockProduct = {
                photo: { data: null, contentType: null },
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(mockProduct.photo.contentType).toBe("image/png");
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it("should handle update with valid 24-character hex string ID", async () => {
            req.params.pid = "507f1f77bcf86cd799439011";
            delete req.files.photo;
            const mockProduct = {
                _id: "507f1f77bcf86cd799439011",
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
        });
    });
});

// Lim Kok Liang, A0252776U
describe("deleteProductController", () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: {
                pid: "507f1f77bcf86cd799439011"
            }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
        
        jest.clearAllMocks();
    });

    // Input validation tests
    const invalidIdCases = [
        { description: 'missing', value: '' },
        { description: 'undefined', value: undefined },
        { description: 'whitespace-only', value: '   ' }
    ];

    it.each(invalidIdCases)("should return error if id is $description", async ({ value }) => {
        if (value === undefined) {
            delete req.params.pid;
        } else {
            req.params.pid = value;
        }
        
        const errorMessage = new Error("Product ID is required");
        const mockSelect = {
            select: jest.fn().mockRejectedValue(errorMessage)
        };
        productModel.findByIdAndDelete.mockReturnValue(mockSelect);

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting product",
            error: errorMessage
        });
    });

    // Logic tests - successful deletion
    it("should delete product successfully", async () => {
        const mockSelect = {
            select: jest.fn().mockResolvedValue({
                _id: "507f1f77bcf86cd799439011",
                name: "Test Product"
            })
        };
        productModel.findByIdAndDelete.mockReturnValue(mockSelect);

        await deleteProductController(req, res);

        expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
        expect(mockSelect.select).toHaveBeenCalledWith("-photo");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Deleted successfully"
        });
    });

    it("should handle deletion when product does not exist", async () => {
        const mockSelect = {
            select: jest.fn().mockResolvedValue(null)
        };
        productModel.findByIdAndDelete.mockReturnValue(mockSelect);

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
            success: true,
            message: "Product Deleted successfully"
        });
    });

    // Error handling tests
    it("should handle database errors", async () => {
        const errorMessage = new Error("Database error");
        const mockSelect = {
            select: jest.fn().mockRejectedValue(errorMessage)
        };
        productModel.findByIdAndDelete.mockReturnValue(mockSelect);

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting product",
            error: errorMessage
        });
    });

    it("should handle invalid MongoDB ObjectId format", async () => {
        req.params.pid = "invalid-id-format";
        const errorMessage = new Error("Cast to ObjectId failed");
        const mockSelect = {
            select: jest.fn().mockRejectedValue(errorMessage)
        };
        productModel.findByIdAndDelete.mockReturnValue(mockSelect);

        await deleteProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Error while deleting product",
            error: errorMessage
        });
    });

    // Edge cases
    describe("Edge cases", () => {
        it("should handle deletion with valid 24-character hex string ID", async () => {
            req.params.pid = "507f1f77bcf86cd799439011";
            const mockProduct = {
                _id: "507f1f77bcf86cd799439011",
                name: "Test Product",
                slug: "test-product"
            };
            const mockSelect = {
                select: jest.fn().mockResolvedValue(mockProduct)
            };
            productModel.findByIdAndDelete.mockReturnValue(mockSelect);

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Deleted successfully"
            });
        });

        it("should handle deletion attempt on already deleted product", async () => {
            const mockSelect = {
                select: jest.fn().mockResolvedValue(null)
            };
            productModel.findByIdAndDelete.mockReturnValue(mockSelect);

            await deleteProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Product Deleted successfully"
            });
        });

        it("should handle deletion with different valid ObjectId format", async () => {
            req.params.pid = "60d21b4667d0d8992e610c85";
            const mockSelect = {
                select: jest.fn().mockResolvedValue({
                    _id: "60d21b4667d0d8992e610c85"
                })
            };
            productModel.findByIdAndDelete.mockReturnValue(mockSelect);

            await deleteProductController(req, res);

            expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("60d21b4667d0d8992e610c85");
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
