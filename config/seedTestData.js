import slugify from "slugify";
import { hashPassword } from "../helpers/authHelper.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

const ensureUser = async ({ email, password, role, name }) => {
  const existing = await userModel.findOne({ email });
  if (existing) {
    return existing;
  }

  const hashedPassword = await hashPassword(password);
  return userModel.create({
    name,
    email,
    password: hashedPassword,
    phone: "+12025550123",
    address: "123 Test Street",
    DOB: "1990-01-01",
    answer: "test",
    role,
  });
};

const ensureCategory = async (name) => {
  const slug = slugify(name, { lower: true });
  const existing = await categoryModel.findOne({ slug });
  if (existing) {
    return existing;
  }
  return categoryModel.create({ name, slug });
};

const ensureProduct = async ({ name, categoryId }) => {
  const slug = slugify(name, { lower: true });
  const existing = await productModel.findOne({ slug });
  if (existing) {
    return existing;
  }
  return productModel.create({
    name,
    slug,
    description: "Seeded product for Playwright E2E tests",
    price: 49.99,
    category: categoryId,
    quantity: 10,
    shipping: true,
  });
};

const ensureOrder = async ({ buyerId, productId }) => {
  const existing = await orderModel.findOne({ buyer: buyerId });
  if (existing) {
    return existing;
  }
  return orderModel.create({
    products: [productId],
    buyer: buyerId,
    payment: { success: true },
    status: "Not Process",
  });
};

export const seedTestData = async () => {
  try {
    const admin = await ensureUser({
      email: "admin@example.com",
      password: "Admin123",
      role: 1,
      name: "Admin User",
    });

    const buyer = await ensureUser({
      email: "buyer@example.com",
      password: "Buyer123",
      role: 0,
      name: "Order Buyer",
    });

    const category = await ensureCategory("Seed Category");
    const product = await ensureProduct({
      name: "Seed Product",
      categoryId: category._id,
    });

    await ensureOrder({ buyerId: buyer._id, productId: product._id });
  } catch (error) {
    console.error("Error seeding E2E test data", error);
  }
};
