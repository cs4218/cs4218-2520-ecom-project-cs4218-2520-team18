// Billy Ho Cheng En, A0252588R

import {
  braintreeTokenController,
  brainTreePaymentController,
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  relatedProductController,
  productCategoryController,
  createProductController,
  updateProductController,
  deleteProductController
} from './productController';
import braintree from 'braintree';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import fs from "fs";

jest.mock("../models/productModel.js");
jest.mock('../models/categoryModel.js');
jest.mock("fs");

jest.mock('../models/orderModel.js', () => {
  return jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(true),
  }));
});

jest.mock('braintree', () => {
  const mockGatewayInstance = {
    clientToken: {
      generate: jest.fn(),
    },
    transaction: {
      sale: jest.fn(),
    },
  };

  return {
    BraintreeGateway: jest.fn(() => mockGatewayInstance),
    Environment: { Sandbox: 'Sandbox' },
  };
});

jest.spyOn(console, 'log').mockImplementation(() => {});

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
        { field: 'category', error: 'Category is Required' },
    ];

    const requiredNumericFields = [
        { field: 'price', error: 'Price is Required' },
        { field: 'quantity', error: 'Quantity is Required' }
    ];

    it.each(requiredFields)("should return error if $field is missing", async ({ field, error }) => {
        req.fields[field] = "";

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it.each([...requiredFields, ...requiredNumericFields])("should return error if $field is undefined", async ({ field, error }) => {
        delete req.fields[field];

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it("should return error if photo size exceeds 1MB", async () => {
        req.files.photo.size = 1500000;

        await createProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo should be less than 1MB"
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

        expect(res.status).toHaveBeenCalledWith(400);
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
            message: "Error in creating product"
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
            message: "Error in creating product"
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

            expect(res.status).toHaveBeenCalledWith(400);
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
        { field: 'category', error: 'Category is Required' },
    ];

    const requiredNumericFields = [
        { field: 'price', error: 'Price is Required' },
        { field: 'quantity', error: 'Quantity is Required' }
    ];

    it.each(requiredFields)("should return error if $field is missing", async ({ field, error }) => {
        req.fields[field] = "";

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it.each([...requiredFields, ...requiredNumericFields])("should return error if $field is undefined", async ({ field, error }) => {
        delete req.fields[field];

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({ error });
    });

    it("should return error if photo size exceeds 1MB", async () => {
        req.files.photo.size = 1500000;

        await updateProductController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
            error: "Photo should be less than 1MB"
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

        expect(res.status).toHaveBeenCalledWith(400);
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
        expect(res.status).toHaveBeenCalledWith(200);
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
        expect(res.status).toHaveBeenCalledWith(200);
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
            message: "Error in Update product"
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
            message: "Error in Update product"
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
            message: "Error in Update product"
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

            expect(res.status).toHaveBeenCalledWith(200);
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

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it("should handle updating with zero price", async () => {
            req.fields.price = 0;
            delete req.files.photo;
            const mockProduct = {
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it("should handle updating with zero quantity", async () => {
            req.fields.quantity = 0;
            delete req.files.photo;
            const mockProduct = {
                save: jest.fn().mockResolvedValue(true)
            };
            productModel.findByIdAndUpdate.mockResolvedValue(mockProduct);

            await updateProductController(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
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
            expect(res.status).toHaveBeenCalledWith(200);
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

            expect(res.status).toHaveBeenCalledWith(200);
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

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.send).toHaveBeenCalledWith({
            success: false,
            message: "Product not found"
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

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Product not found"
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

// Sherwyn Ng, A0255132N
describe('Braintree Controller Unit Tests', () => {
  let req, res, mockGateway;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGateway = new braintree.BraintreeGateway();

    req = {
      body: {},
      user: { _id: 'user123' },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
  });

  describe('braintreeTokenController', () => {
    test('should generate and send client token', async () => {
      const mockResponse = { clientToken: 'fake-token' };

      mockGateway.clientToken.generate.mockImplementation((obj, cb) => {
        cb(null, mockResponse);
      });

      await braintreeTokenController(req, res);
      expect(res.send).toHaveBeenCalledWith(mockResponse);
    });

    test('should send 500 error if token generation fails', async () => {
      const mockError = new Error('Generation Failed');

      mockGateway.clientToken.generate.mockImplementation((obj, cb) => {
        cb(mockError, null);
      });

      await braintreeTokenController(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(mockError);
    });

    test('braintreeTokenController catches unexpected errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      mockGateway.clientToken.generate.mockImplementation(() => {
        throw new Error('Unexpected token error');
      });

      await braintreeTokenController(req, res);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toBeInstanceOf(Error);
      expect(consoleSpy.mock.calls[0][0].message).toBe(
        'Unexpected token error',
      );

      consoleSpy.mockRestore();
    });
  });

  describe('brainTreePaymentController', () => {
    test('should process payment successfully', async () => {
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 100 }, { price: 200 }],
      };

      const mockResult = {
        success: true,
        transaction: { id: 'tx123' },
      };

      mockGateway.transaction.sale.mockImplementation((payload, cb) => {
        cb(null, mockResult);
      });

      await brainTreePaymentController(req, res);

      expect(mockGateway.transaction.sale).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '300.00',
          paymentMethodNonce: 'fake-nonce',
        }),
        expect.any(Function),
      );

      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test('should return 401 if user is not authenticated', async () => {
      req.user = null;
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 100 }],
      };

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
      });
    });

    test('should return 400 if cart or nonce is missing', async () => {
      req.body = {
        nonce: '',
        cart: [],
      };

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid payment data',
      });
    });

    test('should return 400 if transaction fails', async () => {
      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 50 }],
      };

      const mockResult = {
        success: false,
        message: 'Transaction failed',
      };

      mockGateway.transaction.sale.mockImplementation((_, cb) => {
        cb(null, mockResult);
      });

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Transaction failed',
      });
    });

    test('should catch unexpected payment errors', async () => {
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      req.body = {
        nonce: 'fake-nonce',
        cart: [{ price: 100 }],
      };

      mockGateway.transaction.sale.mockImplementation(() => {
        throw new Error('Unexpected payment error');
      });

      await brainTreePaymentController(req, res);

      expect(consoleSpy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Payment failed',
      });

      consoleSpy.mockRestore();
    });
  });
});

// Billy Ho Cheng En, A0252588R
describe('Product Controller Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      params: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      set: jest.fn(),
    };
  });

  describe('getProductController', () => {
    // Helper to mock find().populate().select().limit().sort() chain
    const mockFindChain = (resolvedValue, shouldReject = false) => {
      const query = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn(),
      };
      query.sort[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.find = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return all products successfully', async () => {
      // Arrange
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1', category: 'cat1' },
        { _id: 'prod2', name: 'Product 2', category: 'cat2' },
      ];
      mockFindChain(mockProducts);

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 2,
        message: 'All Products',
        products: mockProducts,
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});
      const error = new Error('Database error');
      mockFindChain(error, true);

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error in getting products',
        error: error.message,
      });

      consoleSpy.mockRestore();
    });

    test('should return empty array when no products exist', async () => {
      // Arrange
      mockFindChain([]);

      // Act
      await getProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 0,
        message: 'All Products',
        products: [],
      });
    });

    test('should return all products without artificial limit', async () => {
      // Arrange
      const mockQuery = mockFindChain([]);

      // Act
      await getProductController(req, res);
      
      // Assert
      expect(mockQuery.limit).not.toHaveBeenCalled();
    });
  });

  describe('getSingleProductController', () => {
    // Helper to mock findOne().select().populate() chain
    const mockFindOneChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn(),
      };
      query.populate[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.findOne = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return single product successfully', async () => {
      // Arrange
      const mockProduct = {
        _id: 'prod1',
        name: 'Product 1',
        slug: 'product-1',
        category: { _id: 'cat1', name: 'Category 1' },
      };
      const mockQuery = mockFindOneChain(mockProduct);
      req.params.slug = 'product-1';

      // Act
      await getSingleProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Single Product Fetched',
        product: mockProduct,
      });
    });

    test('should return 404 when product not found', async () => {
      // Arrange
      mockFindOneChain(null);
      req.params.slug = 'non-existent';

      // Act
      await getSingleProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product not found',
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      mockFindOneChain(error, true);
      req.params.slug = 'product-1';

      // Act
      await getSingleProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting single product',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('productPhotoController', () => {
    // Helper to mock findById().select() chain
    const mockFindByIdChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn(),
      };
      query.select[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.findById = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return product photo successfully', async () => {
      // Arrange
      const mockProduct = {
        photo: {
          data: Buffer.from('fake image data'),
          contentType: 'image/jpeg',
        },
      };
      mockFindByIdChain(mockProduct);
      req.params.pid = 'prod123';

      // Act
      await productPhotoController(req, res);

      // Assert
      expect(res.set).toHaveBeenCalledWith('Content-type', 'image/jpeg');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockProduct.photo.data);
    });

    test('should return 404 when photo data is null', async () => {
      // Arrange
      const mockProduct = {
        photo: {
          data: null,
          contentType: 'image/jpeg',
        },
      };
      mockFindByIdChain(mockProduct);
      req.params.pid = 'prod123';

      // Act
      await productPhotoController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'No photo found',
      });
    });

    test('should return 404 when product not found', async () => {
      // Arrange
      mockFindByIdChain(null);
      req.params.pid = 'nonexistent';

      // Act
      await productPhotoController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Product not found',
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      mockFindByIdChain(error, true);
      req.params.pid = 'prod123';

      // Act
      await productPhotoController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting photo',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('productFiltersController', () => {
    test('should filter products by category and price range', async () => {
      // Arrange
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1', price: 100 },
        { _id: 'prod2', name: 'Product 2', price: 150 },
      ];

      req.body = {
        checked: ['cat1', 'cat2'],
        radio: [50, 200],
      };

      productModel.find = jest.fn().mockResolvedValue(mockProducts);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        category: ['cat1', 'cat2'],
        price: { $gte: 50, $lte: 200 },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    test('should filter with only minimum price when radio[1] is null using strict equality', async () => {
      // Arrange
      const mockProducts = [{ _id: 'prod1', name: 'Product 1', price: 500 }];

      req.body = {
        checked: [],
        radio: [500, null],
      };

      productModel.find = jest.fn().mockResolvedValue(mockProducts);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(productModel.find).toHaveBeenCalledWith({
        price: { $gte: 500 },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      req.body = {
        checked: [],
        radio: [],
      };

      productModel.find = jest.fn().mockRejectedValue(error);

      // Act
      await productFiltersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while filtering products',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('productCountController', () => {
    test('should return total product count', async () => {
      // Arrange
      const mockQuery = {
        estimatedDocumentCount: jest.fn().mockResolvedValue(42),
      };

      productModel.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: 42,
      });
    });

    test('should return zero when no products exist', async () => {
      // Arrange
      const mockQuery = {
        estimatedDocumentCount: jest.fn().mockResolvedValue(0),
      };

      productModel.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        total: 0,
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      const mockQuery = {
        estimatedDocumentCount: jest.fn().mockRejectedValue(error),
      };

      productModel.find = jest.fn().mockReturnValue(mockQuery);

      // Act
      await productCountController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Error in product count',
        error,
        success: false,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('productListController', () => {
    // Helper to mock find().select().skip().limit().sort() chain
    const mockPaginatedFindChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn(),
      };
      query.sort[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.find = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return paginated products for first page', async () => {
      // Arrange
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1' },
        { _id: 'prod2', name: 'Product 2' },
      ];
      mockPaginatedFindChain(mockProducts);

      // Act
      await productListController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    test('should skip correct number of products per page', async () => {
      // Arrange
      const mockQuery = mockPaginatedFindChain([]);
      req.params.page = '5';

      // Act
      await productListController(req, res);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(24); // 4 pages * 6 products
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      mockPaginatedFindChain(error, true);
      req.params.page = '1';

      // Act
      await productListController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'error in per page ctrl',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('searchProductController', () => {
    // Helper to mock find().select() chain
    const mockSearchChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn(),
      };
      query.select[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.find = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return products matching keyword in name or description', async () => {
      // Arrange
      const mockProducts = [
        { _id: 'prod1', name: 'Laptop', description: 'A computer' },
        { _id: 'prod2', name: 'Gaming Laptop', description: 'Fast computer' },
      ];

      // Act
      mockSearchChain(mockProducts);
      req.params.keyword = 'laptop';

      await searchProductController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(mockProducts);
    });

    test('should return empty array when no matches found', async () => {
      // Arranges
      mockSearchChain([]);
      req.params.keyword = 'nonexistent';

      // Act
      await searchProductController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      mockSearchChain(error, true);
      req.params.keyword = 'laptop';

      // Act
      await searchProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error In Search Product API',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('relatedProductController', () => {
    // Helper to mock find().select().limit().populate() chain
    const mockRelatedChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn(),
      };
      query.populate[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.find = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return related products from same category', async () => {
      // Arrange
      const mockProducts = [
        {
          _id: 'prod2',
          name: 'Related Product 1',
          category: { _id: 'cat1' },
        },
        {
          _id: 'prod3',
          name: 'Related Product 2',
          category: { _id: 'cat1' },
        },
      ];

      const mockQuery = mockRelatedChain(mockProducts);
      req.params.pid = 'prod1';
      req.params.cid = 'cat1';

      // Act
      await relatedProductController(req, res);

      // Assert
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    test('should return empty array when no related products found', async () => {
      // Arrange
      mockRelatedChain([]);
      req.params.pid = 'prod1';
      req.params.cid = 'cat1';

      // Act
      await relatedProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: [],
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      mockRelatedChain(error, true);
      req.params.pid = 'prod1';
      req.params.cid = 'cat1';

      // Act
      await relatedProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error while getting related product',
        error,
      });

      consoleSpy.mockRestore();
    });
  });

  describe('productCategoryController', () => {
    // Helper to mock the full query chain for pagination
    const mockCategoryProductsChain = (resolvedValue, shouldReject = false) => {
      const query = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        populate: jest.fn(),
      };
      query.populate[shouldReject ? 'mockRejectedValue' : 'mockResolvedValue'](resolvedValue);
      productModel.find = jest.fn().mockReturnValue(query);
      return query;
    };

    test('should return products by category slug (page 1, default)', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1', category: mockCategory },
        { _id: 'prod2', name: 'Product 2', category: mockCategory },
      ];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      const chain = mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(10);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'electronics' });
      expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
      expect(chain.select).toHaveBeenCalledWith('-photo');
      expect(chain.skip).toHaveBeenCalledWith(0);
      expect(chain.limit).toHaveBeenCalledWith(6);
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chain.populate).toHaveBeenCalledWith('category');
      expect(productModel.countDocuments).toHaveBeenCalledWith({ category: mockCategory });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
        total: 10,
      });
    });

    test('should handle database errors', async () => {
      // Arrange
      const consoleSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const error = new Error('Database error');
      categoryModel.findOne = jest.fn().mockRejectedValue(error);

      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error,
        message: 'Error While Getting products',
      });

      consoleSpy.mockRestore();
    });

    test('should return second page of products with correct skip/limit', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [
        { _id: 'prod7', name: 'Product 7', category: mockCategory },
        { _id: 'prod8', name: 'Product 8', category: mockCategory },
      ];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      const chain = mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(10);
      req.params.slug = 'electronics';
      req.params.page = '2';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(chain.skip).toHaveBeenCalledWith(6); // (2-1) * 6 = 6
      expect(chain.limit).toHaveBeenCalledWith(6);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
        total: 10,
      });
    });

    test('should return total count in response', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(25);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(productModel.countDocuments).toHaveBeenCalledWith({ category: mockCategory });
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          total: 25,
        })
      );
    });

    test('should handle empty category (no products)', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      mockCategoryProductsChain([]);
      productModel.countDocuments = jest.fn().mockResolvedValue(0);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: [],
        total: 0,
      });
    });

    test('should exclude photo field from results', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      const chain = mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(1);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(chain.select).toHaveBeenCalledWith('-photo');
    });

    test('should populate category reference', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      const chain = mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(1);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(chain.populate).toHaveBeenCalledWith('category');
    });

    test('should sort by createdAt descending', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [{ _id: 'prod1', name: 'Product 1' }];

      categoryModel.findOne = jest.fn().mockResolvedValue(mockCategory);
      const chain = mockCategoryProductsChain(mockProducts);
      productModel.countDocuments = jest.fn().mockResolvedValue(1);
      req.params.slug = 'electronics';

      // Act
      await productCategoryController(req, res);

      // Assert
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });
});
