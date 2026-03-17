// Lim Kok Liang, A0252776U

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  createProductController,
  updateProductController,
  deleteProductController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

jest.setTimeout(30000);

describe("productController - Integration Tests (Mongo Memory)", () => {
  let mongoServer;

  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  });

  const createCategory = async (overrides = {}) => {
    return categoryModel.create({
      name: "Electronics",
      slug: "electronics",
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
    test("creates and persists a product document", async () => {
      const category = await createCategory();

      const req = {
        fields: {
          name: "Gaming Keyboard",
          description: "Mechanical keyboard",
          price: 129.99,
          category: category._id,
          quantity: 20,
          shipping: true,
        },
        files: {},
      };
      const res = createResponse();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Created Successfully",
          products: expect.any(Object),
        }),
      );

      const createdProduct = await productModel.findOne({ name: "Gaming Keyboard" });
      expect(createdProduct).not.toBeNull();
      expect(createdProduct.slug).toBe("gaming-keyboard");
      expect(createdProduct.category.toString()).toBe(category._id.toString());
      expect(createdProduct.price).toBe(129.99);
      expect(createdProduct.quantity).toBe(20);
    });

    test("returns validation error and does not create a product", async () => {
      const category = await createCategory();

      const req = {
        fields: {
          name: "",
          description: "Missing name",
          price: 50,
          category: category._id,
          quantity: 5,
          shipping: false,
        },
        files: {},
      };
      const res = createResponse();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
      const count = await productModel.countDocuments({});
      expect(count).toBe(0);
    });
  });

  describe("updateProductController", () => {
    test("updates product fields and persists changes", async () => {
      const category = await createCategory({ name: "Accessories", slug: "accessories" });
      const initialProduct = await productModel.create({
        name: "Mouse",
        slug: "mouse",
        description: "Wireless mouse",
        price: 49.99,
        category: category._id,
        quantity: 15,
        shipping: false,
      });

      const req = {
        params: {
          pid: initialProduct._id,
        },
        fields: {
          name: "Gaming Mouse",
          description: "Wireless gaming mouse",
          price: 79.99,
          category: category._id,
          quantity: 10,
          shipping: true,
        },
        files: {},
      };
      const res = createResponse();

      await updateProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Product Updated Successfully",
          products: expect.any(Object),
        }),
      );

      const updatedProduct = await productModel.findById(initialProduct._id);
      expect(updatedProduct.name).toBe("Gaming Mouse");
      expect(updatedProduct.slug).toBe("gaming-mouse");
      expect(updatedProduct.description).toBe("Wireless gaming mouse");
      expect(updatedProduct.price).toBe(79.99);
      expect(updatedProduct.quantity).toBe(10);
      expect(updatedProduct.shipping).toBe(true);
    });
  });

  describe("deleteProductController", () => {
    test("deletes product and removes it from the database", async () => {
      const category = await createCategory({ name: "Peripherals", slug: "peripherals" });
      const product = await productModel.create({
        name: "Headset",
        slug: "headset",
        description: "Surround sound headset",
        price: 199.99,
        category: category._id,
        quantity: 7,
        shipping: true,
      });

      const req = {
        params: {
          pid: product._id,
        },
      };
      const res = createResponse();

      await deleteProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Deleted successfully",
      });

      const deletedProduct = await productModel.findById(product._id);
      expect(deletedProduct).toBeNull();
    });
  });
});
