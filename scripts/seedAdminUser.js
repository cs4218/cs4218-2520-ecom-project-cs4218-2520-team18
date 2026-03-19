import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";

const DEFAULTS = {
  name: "E2E Admin User",
  email: "admin.e2e@example.com",
  password: "Password123",
  phone: "+14155550000",
  address: "1 Admin Street",
  answer: "blue",
  dob: "2000-01-01",
};

const shouldDisableSeeding = () => process.env.DISABLE_ADMIN_SEED === "true";

const readSeedConfig = () => ({
  name: process.env.SEED_ADMIN_NAME || DEFAULTS.name,
  email: (process.env.SEED_ADMIN_EMAIL || DEFAULTS.email).trim().toLowerCase(),
  password: process.env.SEED_ADMIN_PASSWORD || DEFAULTS.password,
  phone: process.env.SEED_ADMIN_PHONE || DEFAULTS.phone,
  address: process.env.SEED_ADMIN_ADDRESS || DEFAULTS.address,
  answer: process.env.SEED_ADMIN_ANSWER || DEFAULTS.answer,
  dob: process.env.SEED_ADMIN_DOB || DEFAULTS.dob,
});

const applyIfChanged = (document, field, nextValue) => {
  if (document[field] !== nextValue) {
    document[field] = nextValue;
    return true;
  }
  return false;
};

const seedAdminUser = async () => {
  if (shouldDisableSeeding()) {
    return;
  }

  const seedConfig = readSeedConfig();

  if (!seedConfig.email || !seedConfig.password) {
    console.log("Admin seeding skipped due to missing email/password".bgYellow.black);
    return;
  }

  const existingAdmin = await userModel.findOne({ email: seedConfig.email });

  if (!existingAdmin) {
    const hashedPassword = await hashPassword(seedConfig.password);

    await userModel.create({
      name: seedConfig.name,
      email: seedConfig.email,
      password: hashedPassword,
      phone: seedConfig.phone,
      address: seedConfig.address,
      answer: seedConfig.answer,
      DOB: seedConfig.dob,
      role: 1,
    });

    console.log(`Admin seed created: ${seedConfig.email}`.bgGreen.black);
    return;
  }

  let hasChanges = false;

  hasChanges = applyIfChanged(existingAdmin, "name", seedConfig.name) || hasChanges;
  hasChanges = applyIfChanged(existingAdmin, "phone", seedConfig.phone) || hasChanges;
  hasChanges = applyIfChanged(existingAdmin, "address", seedConfig.address) || hasChanges;
  hasChanges = applyIfChanged(existingAdmin, "answer", seedConfig.answer) || hasChanges;
  hasChanges = applyIfChanged(existingAdmin, "DOB", seedConfig.dob) || hasChanges;

  if (existingAdmin.role !== 1) {
    existingAdmin.role = 1;
    hasChanges = true;
  }

  const passwordMatches = await comparePassword(seedConfig.password, existingAdmin.password);
  if (!passwordMatches) {
    existingAdmin.password = await hashPassword(seedConfig.password);
    hasChanges = true;
  }

  if (hasChanges) {
    await existingAdmin.save();
    console.log(`Admin seed updated: ${seedConfig.email}`.bgBlue.white);
    return;
  }

  console.log(`Admin seed already up to date: ${seedConfig.email}`.bgCyan.white);
};

export default seedAdminUser;
