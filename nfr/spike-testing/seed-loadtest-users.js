// Loh Ze Qing Norbert, A0277473R
/**
 * Seed 5,000 Load-Test Users
 *
 * Populates MongoDB with unique test accounts for the k6 test suite.
 */

import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { hashPassword } from "../../helpers/authHelper.js";
import userModel from "../../models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// .env from root
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// --- Configuration ---

const TOTAL_USERS = parseInt(process.env.LT_USERS, 10) || 5000;
const BATCH_SIZE = 500; // avoid memory pressure
const SHARED_PASSWORD = "LoadTest@123"; // pre-hashed in loop
const EMAIL_DOMAIN = "loadtest.com";
const EMAIL_PREFIX = "lt_user_";

// --- Main ---

async function main() {
  const startTime = Date.now();

  console.log(`\nConnecting to MongoDB...`);
  await mongoose.connect(process.env.MONGO_URL);
  console.log(`Connected to ${mongoose.connection.host}\n`);

  // Hash once for all users
  console.log(`Hashing shared password...`);
  const hashed = await hashPassword(SHARED_PASSWORD);

  // Check existing to support resumption
  const existingCount = await userModel.countDocuments({
    email: { $regex: `^${EMAIL_PREFIX}.*@${EMAIL_DOMAIN}$` },
  });

  if (existingCount >= TOTAL_USERS) {
    console.log(
      `${existingCount} load-test users already exist (>= ${TOTAL_USERS}). Nothing to do.`
    );
    await mongoose.disconnect();
    return;
  }

  const startIndex = existingCount; 
  const toCreate = TOTAL_USERS - existingCount;
  console.log(
    `Seeding ${toCreate} users (${startIndex} already exist)...\n`
  );

  let created = 0;

  for (let i = startIndex; i < TOTAL_USERS; i += BATCH_SIZE) {
    const batchEnd = Math.min(i + BATCH_SIZE, TOTAL_USERS);
    const batch = [];

    for (let j = i; j < batchEnd; j++) {
      const padded = String(j).padStart(5, "0");
      batch.push({
        name: `Load Test User ${padded}`,
        email: `${EMAIL_PREFIX}${padded}@${EMAIL_DOMAIN}`,
        password: hashed,
        phone: `+1${String(4150000000 + j)}`, 
        address: `${j} Load Test Avenue`,
        answer: "loadtest",
        DOB: "2000-01-01",
        role: 0,
      });
    }

    // Batched insert
    await userModel.insertMany(batch, { ordered: false });
    created += batch.length;

    const pct = ((created / toCreate) * 100).toFixed(1);
    process.stdout.write(
      `\r   ${created} / ${toCreate}  (${pct}%)`
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nDone! Seeded ${created} users in ${elapsed}s.`);
  console.log(`   Email pattern : ${EMAIL_PREFIX}XXXXX@${EMAIL_DOMAIN}`);
  console.log(`   Password      : ${SHARED_PASSWORD}\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
