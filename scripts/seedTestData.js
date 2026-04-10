import categoryModel from "../models/categoryModel.js";
import productModel from "../models/productModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data from JSON files
const loadJSONFile = (filename) => {
  const filePath = path.join(__dirname, filename); // nosemgrep - filename is hardcoded, no user input
  const fileContent = fs.readFileSync(filePath, "utf8");
  return JSON.parse(fileContent);
};

const shouldDisableSeeding = () => process.env.DISABLE_TEST_DATA_SEED === "true";

const seedCategories = async () => {
  const categoriesData = loadJSONFile("test.categories.json");
  const categoryMap = {};

  for (const cat of categoriesData) {
    const existing = await categoryModel.findOne({ slug: cat.slug });

    if (!existing) {
      const created = await categoryModel.create({
        name: cat.name,
        slug: cat.slug,
      });
      categoryMap[cat.slug] = created._id;
      console.log(`Category created: ${cat.name}`.green);
    } else {
      categoryMap[cat.slug] = existing._id;
      console.log(`Category already exists: ${cat.name}`.cyan);
    }
  }

  return categoryMap;
};

const seedProducts = async (categoryMap) => {
  const productsData = loadJSONFile("test.products.json");

  for (const prod of productsData) {
    const existing = await productModel.findOne({ slug: prod.slug });

    // Find category by matching ObjectId or slug
    let categoryId = null;

    // Try to find category by the original ObjectId from JSON
    const categoryOid = prod.category?.$oid;
    if (categoryOid) {
      // Match by the original category data
      const categoriesData = loadJSONFile("test.categories.json");
      const matchingCategory = categoriesData.find(c => c._id.$oid === categoryOid);
      if (matchingCategory && categoryMap[matchingCategory.slug]) {
        categoryId = categoryMap[matchingCategory.slug];
      }
    }

    if (!categoryId) {
      console.log(`Warning: Category not found for product ${prod.name}`.yellow);
      continue;
    }

    if (!existing) {
      // Decode base64 photo data if it exists
      let photoData = null;
      if (prod.photo?.data?.$binary?.base64) {
        photoData = {
          data: Buffer.from(prod.photo.data.$binary.base64, "base64"),
          contentType: "image/jpeg",
        };
      }

      await productModel.create({
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        price: prod.price,
        category: categoryId,
        quantity: prod.quantity,
        photo: photoData,
        shipping: prod.shipping !== undefined ? prod.shipping : false,
      });
      console.log(`Product created: ${prod.name}`.green);
    } else {
      // Update existing product
      existing.name = prod.name;
      existing.description = prod.description;
      existing.price = prod.price;
      existing.category = categoryId;
      existing.quantity = prod.quantity;
      existing.shipping = prod.shipping !== undefined ? prod.shipping : false;

      // Only update photo if it doesn't exist or if we have new photo data
      if ((!existing.photo || !existing.photo.data) && prod.photo?.data?.$binary?.base64) {
        existing.photo = {
          data: Buffer.from(prod.photo.data.$binary.base64, "base64"),
          contentType: "image/jpeg",
        };
      }

      await existing.save();
      console.log(`Product updated: ${prod.name}`.blue);
    }
  }
};

const seedTestData = async () => {
  if (shouldDisableSeeding()) {
    console.log("Test data seeding disabled via DISABLE_TEST_DATA_SEED".yellow);
    return;
  }

  try {
    console.log("Starting test data seeding...".bgBlue.white);

    const categoryMap = await seedCategories();
    await seedProducts(categoryMap);

    console.log("Test data seeding completed successfully!".bgGreen.black);
  } catch (error) {
    console.error("Error seeding test data:".bgRed.white, error);
    throw error;
  }
};

export default seedTestData;
