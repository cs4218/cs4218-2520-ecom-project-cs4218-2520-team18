// Billy Ho Cheng En, A0252588R
// Volume Testing — Seed Script
// Inserts a large volume of categories, products, and orders directly into MongoDB
// to establish a high-data-volume baseline before running the k6 volume test.
//
// Usage:
//   node seed-volume-data.js
//
// Environment variables (optional):
//   VT_CATEGORIES  – number of categories to seed (default: 20)
//   VT_PRODUCTS    – number of products to seed    (default: 10000)
//   VT_ORDERS      – number of orders to seed      (default: 5000)
//   VT_USERS       – number of regular users to seed (default: 500)

import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { hashPassword } from "../../helpers/authHelper.js";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import orderModel from "../../models/orderModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// --- Configuration ---

const TOTAL_CATEGORIES = parseInt(process.env.VT_CATEGORIES, 10) || 20;
const TOTAL_PRODUCTS = parseInt(process.env.VT_PRODUCTS, 10) || 10000;
const TOTAL_ORDERS = parseInt(process.env.VT_ORDERS, 10) || 5000;
const TOTAL_USERS = parseInt(process.env.VT_USERS, 10) || 500;
const BATCH_SIZE = 500;
const SHARED_PASSWORD = "VolumeTest@123";

// Namespace prefix so teardown can identify and remove only volume-test data
const VT_PREFIX = "vt_";

// --- Helpers ---

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Seed categories ---

async function seedCategories() {
  const existing = await categoryModel.countDocuments({
    slug: { $regex: `^${VT_PREFIX}` },
  });

  if (existing >= TOTAL_CATEGORIES) {
    console.log(
      `  ${existing} volume-test categories already exist. Skipping.`
    );
    const cats = await categoryModel.find({ slug: { $regex: `^${VT_PREFIX}` } }).select("_id").lean();
    return cats.map((c) => c._id);
  }

  console.log(`  Seeding ${TOTAL_CATEGORIES} categories...`);
  const toCreate = TOTAL_CATEGORIES - existing;
  const docs = [];
  for (let i = existing; i < TOTAL_CATEGORIES; i++) {
    const name = `VolumeTest Category ${String(i).padStart(4, "0")}`;
    docs.push({ name, slug: `${VT_PREFIX}category-${String(i).padStart(4, "0")}` });
  }

  await categoryModel.insertMany(docs, { ordered: false });
  console.log(`  Created ${toCreate} categories.`);

  const cats = await categoryModel.find({ slug: { $regex: `^${VT_PREFIX}` } }).select("_id").lean();
  return cats.map((c) => c._id);
}

// --- Seed products ---

async function seedProducts(categoryIds) {
  const existing = await productModel.countDocuments({
    slug: { $regex: `^${VT_PREFIX}` },
  });

  if (existing >= TOTAL_PRODUCTS) {
    console.log(`  ${existing} volume-test products already exist. Skipping.`);
    const prods = await productModel.find({ slug: { $regex: `^${VT_PREFIX}` } }).select("_id price").lean();
    return prods;
  }

  const startIndex = existing;
  const toCreate = TOTAL_PRODUCTS - existing;
  console.log(
    `  Seeding ${toCreate} products (${startIndex} already exist)...`
  );

  let created = 0;

  for (let i = startIndex; i < TOTAL_PRODUCTS; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_PRODUCTS);
    const batch = [];

    for (let j = i; j < batchEnd; j++) {
      const idx = String(j).padStart(6, "0");
      const price = randomInt(100, 999999) / 100;
      batch.push({
        name: `VolumeTest Product ${idx}`,
        slug: `${VT_PREFIX}product-${idx}`,
        description: `Volume-test product #${j}. Used for flood/volume testing of the ecommerce system.`,
        price,
        category: randomItem(categoryIds),
        quantity: randomInt(0, 500),
        shipping: Math.random() > 0.5,
      });
    }

    await productModel.insertMany(batch, { ordered: false });
    created += batch.length;
    process.stdout.write(`\r    ${created} / ${toCreate}  (${((created / toCreate) * 100).toFixed(1)}%)`);
  }

  console.log("\n");
  const prods = await productModel.find({ slug: { $regex: `^${VT_PREFIX}` } }).select("_id price").lean();
  return prods;
}

// --- Seed admin user ---

async function seedAdminUser() {
  const ADMIN_EMAIL = "admin.e2e@example.com";
  const ADMIN_PASSWORD = "Password123";

  const existing = await userModel.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    console.log(`  Admin user already exists: ${ADMIN_EMAIL}`);
    if (existing.role !== 1) {
      existing.role = 1;
      await existing.save();
      console.log(`  Updated existing user to admin role.`);
    }
    return;
  }

  console.log(`  Creating admin user: ${ADMIN_EMAIL}`);
  const hashed = await hashPassword(ADMIN_PASSWORD);

  await userModel.create({
    name: "E2E Admin User",
    email: ADMIN_EMAIL,
    password: hashed,
    phone: "+14155550000",
    address: "1 Admin Street",
    answer: "blue",
    DOB: "2000-01-01",
    role: 1,
  });

  console.log(`  Admin user created successfully.\n`);
}

// --- Seed users ---

async function seedUsers() {
  const existing = await userModel.countDocuments({
    email: { $regex: `^${VT_PREFIX}.*@volumetest\\.com$` },
  });

  if (existing >= TOTAL_USERS) {
    console.log(`  ${existing} volume-test users already exist. Skipping.`);
    const users = await userModel.find({ email: { $regex: `^${VT_PREFIX}.*@volumetest\\.com$` } }).select("_id").lean();
    return users.map((u) => u._id);
  }

  const startIndex = existing;
  const toCreate = TOTAL_USERS - existing;
  console.log(`  Seeding ${toCreate} users (${startIndex} already exist)...`);

  const hashed = await hashPassword(SHARED_PASSWORD);
  let created = 0;

  for (let i = startIndex; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_USERS);
    const batch = [];

    for (let j = i; j < batchEnd; j++) {
      const idx = String(j).padStart(4, "0");
      batch.push({
        name: `VolumeTest User ${idx}`,
        email: `${VT_PREFIX}user_${idx}@volumetest.com`,
        password: hashed,
        phone: `+1${String(6500000000 + j)}`,
        address: `${j} Volume Test Road`,
        answer: "volumetest",
        DOB: "1995-06-15",
        role: 0,
      });
    }

    await userModel.insertMany(batch, { ordered: false });
    created += batch.length;
    process.stdout.write(`\r    ${created} / ${toCreate}  (${((created / toCreate) * 100).toFixed(1)}%)`);
  }

  console.log("\n");
  const users = await userModel.find({ email: { $regex: `^${VT_PREFIX}.*@volumetest\\.com$` } }).select("_id").lean();
  return users.map((u) => u._id);
}

// --- Seed orders ---

async function seedOrders(userIds, products) {
  // Count existing volume-test orders by checking buyer IDs among VT users
  const existingOrderCount = await orderModel.countDocuments({
    buyer: { $in: userIds },
  });

  if (existingOrderCount >= TOTAL_ORDERS) {
    console.log(`  ${existingOrderCount} volume-test orders already exist. Skipping.`);
    return;
  }

  const toCreate = TOTAL_ORDERS - existingOrderCount;
  console.log(`  Seeding ${toCreate} orders (${existingOrderCount} already exist)...`);

  // Status values must match the order model enum exactly
  const STATUSES = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
  const productIds = products.map((p) => p._id);
  let created = 0;

  for (let i = existingOrderCount; i < TOTAL_ORDERS; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_ORDERS);
    const batch = [];

    for (let j = i; j < batchEnd; j++) {
      const cartSize = randomInt(1, 5);
      const cartProductIds = [];
      for (let k = 0; k < cartSize; k++) {
        cartProductIds.push(randomItem(productIds));
      }

      batch.push({
        products: cartProductIds,
        payment: { success: Math.random() > 0.1 },
        buyer: randomItem(userIds),
        status: randomItem(STATUSES),
      });
    }

    await orderModel.insertMany(batch, { ordered: false });
    created += batch.length;
    process.stdout.write(`\r    ${created} / ${toCreate}  (${((created / toCreate) * 100).toFixed(1)}%)`);
  }

  console.log("\n");
}

// --- Main ---

async function main() {
  const startTime = Date.now();

  console.log("\nVolume Testing — Seed Script");
  console.log("================================");
  console.log(`  Admin       : admin.e2e@example.com`);
  console.log(`  Categories  : ${TOTAL_CATEGORIES}`);
  console.log(`  Products    : ${TOTAL_PRODUCTS}`);
  console.log(`  Users       : ${TOTAL_USERS}`);
  console.log(`  Orders      : ${TOTAL_ORDERS}`);
  console.log("");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URL);
  console.log(`Connected to ${mongoose.connection.host}\n`);

  console.log("[0/5] Admin User");
  await seedAdminUser();

  console.log("[1/5] Categories");
  const categoryIds = await seedCategories();

  console.log("[2/5] Products");
  const products = await seedProducts(categoryIds);

  console.log("[3/5] Users");
  const userIds = await seedUsers();

  console.log("[4/5] Orders");
  await seedOrders(userIds, products);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! Volume data seeded in ${elapsed}s.`);
  console.log(`  Admin email        : admin.e2e@example.com`);
  console.log(`  Admin password     : Password123`);
  console.log(`  User email pattern : ${VT_PREFIX}user_XXXX@volumetest.com`);
  console.log(`  User password      : ${SHARED_PASSWORD}`);
  console.log(`  Product slug prefix: ${VT_PREFIX}product-XXXXXX\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
