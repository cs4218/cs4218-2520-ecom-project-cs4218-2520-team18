// Loh Ze Qing Norbert, A0277473R

/**
 * Teardown script for load-test users
 *
 * Removes all users whose email matches the load-test pattern.
 */

import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "../../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// .env from root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const EMAIL_PREFIX = "lt_user_";
const EMAIL_DOMAIN = "loadtest.com";

async function main() {
  console.log(`\nConnecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URL);
  console.log(`Connected to ${mongoose.connection.host}\n`);

  const filter = {
    email: { $regex: `^${EMAIL_PREFIX}.*@${EMAIL_DOMAIN}$` },
  };

  const count = await userModel.countDocuments(filter);

  if (count === 0) {
    console.log("No load-test users found. Nothing to remove.\n");
    await mongoose.disconnect();
    return;
  }

  console.log(`Removing ${count} load-test users...`);
  const result = await userModel.deleteMany(filter);
  console.log(`Deleted ${result.deletedCount} users.\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Teardown failed:", err);
  process.exit(1);
});
