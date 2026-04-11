// Volume Testing — Teardown Script
// Removes all data inserted by seed-volume-data.js.
//
// Usage:
//   node teardown-volume-data.js

import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import orderModel from "../../models/orderModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const VT_PREFIX = "vt_";

async function main() {
  console.log("\nVolume Testing — Teardown Script");
  console.log("===================================\n");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URL);
  console.log(`Connected to ${mongoose.connection.host}\n`);

  // Remove volume-test users and collect their IDs for order cleanup
  const vtUserFilter = { email: { $regex: `^${VT_PREFIX}.*@volumetest\\.com$` } };
  const vtUsers = await userModel.find(vtUserFilter).select("_id").lean();
  const vtUserIds = vtUsers.map((u) => u._id);

  const userCount = await userModel.countDocuments(vtUserFilter);
  if (userCount > 0) {
    const res = await userModel.deleteMany(vtUserFilter);
    console.log(`Deleted ${res.deletedCount} volume-test users.`);
  } else {
    console.log("No volume-test users found.");
  }

  // Remove volume-test categories
  const vtCategoryFilter = { slug: { $regex: `^${VT_PREFIX}` } };
  const catCount = await categoryModel.countDocuments(vtCategoryFilter);
  if (catCount > 0) {
    const res = await categoryModel.deleteMany(vtCategoryFilter);
    console.log(`Deleted ${res.deletedCount} volume-test categories.`);
  } else {
    console.log("No volume-test categories found.");
  }

  // Remove volume-test products
  const vtProductFilter = { slug: { $regex: `^${VT_PREFIX}` } };
  const prodCount = await productModel.countDocuments(vtProductFilter);
  if (prodCount > 0) {
    const res = await productModel.deleteMany(vtProductFilter);
    console.log(`Deleted ${res.deletedCount} volume-test products.`);
  } else {
    console.log("No volume-test products found.");
  }

  // Remove orders placed by volume-test users
  if (vtUserIds.length > 0) {
    const orderFilter = { buyer: { $in: vtUserIds } };
    const orderCount = await orderModel.countDocuments(orderFilter);
    if (orderCount > 0) {
      const res = await orderModel.deleteMany(orderFilter);
      console.log(`Deleted ${res.deletedCount} volume-test orders.`);
    } else {
      console.log("No volume-test orders found.");
    }
  } else {
    console.log("No volume-test user IDs found — skipping order cleanup.");
  }

  console.log("\nTeardown complete.\n");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Teardown failed:", err);
  process.exit(1);
});
