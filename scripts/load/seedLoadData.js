import dotenv from "dotenv";
import connectDB from "../../config/db.js";
import userModel from "../../models/userModel.js";
import categoryModel from "../../models/categoryModel.js";
import productModel from "../../models/productModel.js";
import orderModel from "../../models/orderModel.js";
import { hashPassword } from "../../helpers/authHelper.js";
import slugify from "slugify";

dotenv.config();

const envNumber = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const config = {
  categories: envNumber("LOAD_SEED_CATEGORIES", 30),
  products: envNumber("LOAD_SEED_PRODUCTS", 5000),
  users: envNumber("LOAD_SEED_USERS", 1000),
  orders: envNumber("LOAD_SEED_ORDERS", 10000),
  password: process.env.LOAD_SEED_DEFAULT_PASSWORD || "Password123",
};

const toE164 = (index) => `+1415${String(1000000 + index).slice(-7)}`;

const ensureLoadAdmin = async () => {
  const email = "admin.load@example.com";
  const existing = await userModel.findOne({ email });
  const password = await hashPassword(config.password);

  if (existing) {
    existing.role = 1;
    existing.password = password;
    existing.name = "Load Admin";
    existing.phone = "+14155550999";
    existing.address = "99 Admin Street";
    existing.answer = "blue";
    existing.DOB = "1990-10-10";
    await existing.save();
    return existing;
  }

  return userModel.create({
    name: "Load Admin",
    email,
    password,
    phone: "+14155550999",
    address: "99 Admin Street",
    answer: "blue",
    DOB: "1990-10-10",
    role: 1,
  });
};

const ensureLoadUsers = async () => {
  const hashedPassword = await hashPassword(config.password);
  const operations = [];

  for (let i = 1; i <= config.users; i += 1) {
    const email = `load.user${i}@example.com`;
    operations.push({
      updateOne: {
        filter: { email },
        update: {
          $set: {
            name: `Load User ${i}`,
            email,
            password: hashedPassword,
            phone: toE164(i),
            address: `${i} Load Street`,
            answer: "blue",
            DOB: `199${i % 10}-0${(i % 9) + 1}-0${(i % 9) + 1}`.replace(/-00/g, "-01"),
            role: 0,
          },
        },
        upsert: true,
      },
    });
  }

  if (operations.length) {
    await userModel.bulkWrite(operations, { ordered: false });
  }
};

const ensureCategories = async () => {
  const categoryIds = [];
  for (let i = 1; i <= config.categories; i += 1) {
    const name = `Load Category ${i}`;
    const slug = slugify(name, { lower: true, strict: true });
    const category = await categoryModel.findOneAndUpdate(
      { slug },
      { name, slug },
      { upsert: true, new: true }
    );
    categoryIds.push(category._id);
  }
  return categoryIds;
};

const ensureProducts = async (categoryIds) => {
  const operations = [];

  for (let i = 1; i <= config.products; i += 1) {
    const name = `Load Product ${i}`;
    const slug = slugify(name, { lower: true, strict: true });
    const category = categoryIds[i % categoryIds.length];
    operations.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: {
            name,
            slug,
            description: `Synthetic product ${i} for load testing`,
            price: Math.round((5 + ((i * 13) % 500)) * 100) / 100,
            category,
            quantity: 100 + (i % 50),
            shipping: i % 2 === 0,
          },
        },
        upsert: true,
      },
    });

    if (operations.length >= 1000) {
      await productModel.bulkWrite(operations.splice(0, operations.length), { ordered: false });
    }
  }

  if (operations.length) {
    await productModel.bulkWrite(operations, { ordered: false });
  }
};

const ensureOrders = async () => {
  const users = await userModel.find({ role: 0 }).select("_id").limit(Math.max(config.users, 1));
  const products = await productModel.find({}).select("_id").limit(Math.max(config.products, 50));

  if (!users.length || !products.length) {
    throw new Error("Cannot seed orders without users and products");
  }

  const existingCount = await orderModel.countDocuments();
  if (existingCount >= config.orders) {
    return;
  }

  const needed = config.orders - existingCount;
  const statuses = ["Not Processed", "Processing", "Shipped", "Delivered", "Cancelled"];
  const docs = [];

  for (let i = 0; i < needed; i += 1) {
    const buyer = users[i % users.length]._id;
    const p1 = products[i % products.length]._id;
    const p2 = products[(i * 7) % products.length]._id;

    docs.push({
      buyer,
      products: [p1, p2],
      payment: { synthetic: true, amount: 10 + (i % 500), method: "mock" },
      status: statuses[i % statuses.length],
    });

    if (docs.length >= 1000) {
      await orderModel.insertMany(docs.splice(0, docs.length), { ordered: false });
    }
  }

  if (docs.length) {
    await orderModel.insertMany(docs, { ordered: false });
  }
};

const main = async () => {
  await connectDB();

  console.log("Starting load data seeding with config:", config);
  await ensureLoadAdmin();
  await ensureLoadUsers();
  const categoryIds = await ensureCategories();
  await ensureProducts(categoryIds);
  await ensureOrders();

  console.log("Load data seeding complete");
  process.exit(0);
};

main().catch((error) => {
  console.error("Load seed failed", error);
  process.exit(1);
});
