// Aw Jean Leng Adrian, A0277537N
/**
 * Stress Test Data Seeding Script
 *
 * Generates a large dataset of products and categories for stress testing
 * the searchProductController and productFiltersController endpoints.
 *
 * Usage:
 *     node stress-tests/seedStressTestData.js
 *
 * Environment Variables:
 *     MONGO_URL - MongoDB connection string
 *     STRESS_TEST_PRODUCTS - Number of products to generate (default: 10000)
 *     STRESS_TEST_CATEGORIES - Number of categories to generate (default: 50)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import slugify from "slugify";

dotenv.config();

const ADJECTIVES = [
    "Premium", "Professional", "Ultra", "Super", "Mega", "Deluxe", "Elite", "Pro",
    "Advanced", "Smart", "Digital", "Wireless", "Portable", "Compact", "Heavy-Duty",
    "Lightweight", "High-Performance", "Eco-Friendly", "Ergonomic", "Waterproof",
    "Classic", "Modern", "Vintage", "Retro", "Industrial", "Minimalist", "Luxury",
    "Budget", "Essential", "Premium", "Ultimate", "Standard", "Basic", "Enhanced"
];

const PRODUCT_TYPES = [
    "Laptop", "Smartphone", "Tablet", "Camera", "Headphones", "Speaker", "Monitor",
    "Keyboard", "Mouse", "Charger", "Cable", "Adapter", "Stand", "Case", "Cover",
    "Bag", "Backpack", "Wallet", "Watch", "Glasses", "Sunglasses", "Hat", "Shirt",
    "Jacket", "Shoes", "Boots", "Sneakers", "Sandals", "Belt", "Tie", "Scarf",
    "Chair", "Desk", "Lamp", "Shelf", "Cabinet", "Drawer", "Mattress", "Pillow",
    "Blanket", "Towel", "Curtain", "Rug", "Blender", "Mixer", "Toaster", "Kettle",
    "Coffee Maker", "Microwave", "Oven", "Refrigerator", "Dishwasher", "Vacuum",
    "Air Purifier", "Humidifier", "Fan", "Heater", "Iron", "Dryer", "Washer",
    "Drill", "Saw", "Hammer", "Screwdriver", "Wrench", "Pliers", "Level", "Tape",
    "Paintbrush", "Roller", "Ladder", "Toolbox", "Workbench", "Generator", "Pump"
];

const BRANDS = [
    "TechPro", "GadgetMax", "SmartLife", "ElectroZone", "DigiWorld", "ProMaster",
    "UltraGear", "NextGen", "PowerPlus", "SpeedForce", "EcoTech", "GreenWave",
    "SkyHigh", "DeepBlue", "FireStorm", "IceQueen", "SunRise", "MoonLight",
    "StarBright", "ThunderBolt", "WindRunner", "EarthCore", "WaterFlow", "MetalForge",
    "CrystalClear", "DiamondEdge", "GoldStandard", "SilverLine", "BronzeAge", "IronWill"
];

const MATERIALS = [
    "Aluminum", "Steel", "Carbon Fiber", "Plastic", "Wood", "Leather", "Fabric",
    "Silicon", "Rubber", "Glass", "Ceramic", "Titanium", "Copper", "Brass", "Bronze"
];

const COLORS = [
    "Black", "White", "Silver", "Gold", "Rose Gold", "Space Gray", "Midnight Blue",
    "Forest Green", "Ruby Red", "Ocean Blue", "Sunset Orange", "Purple Haze",
    "Coral Pink", "Slate Gray", "Pearl White", "Jet Black", "Champagne", "Bronze"
];

const CATEGORY_NAMES = [
    "Electronics", "Computers", "Mobile Phones", "Audio & Video", "Cameras",
    "Home & Kitchen", "Furniture", "Bedding", "Bathroom", "Outdoor Living",
    "Clothing", "Men's Fashion", "Women's Fashion", "Kids' Wear", "Accessories",
    "Sports & Outdoors", "Fitness Equipment", "Camping Gear", "Water Sports",
    "Tools & Hardware", "Power Tools", "Hand Tools", "Building Materials",
    "Automotive", "Car Accessories", "Motorcycle Parts", "Tires & Wheels",
    "Books & Media", "Music & Movies", "Video Games", "Toys & Games",
    "Health & Beauty", "Personal Care", "Skincare", "Haircare", "Makeup",
    "Food & Grocery", "Beverages", "Snacks", "Organic Foods", "Baby Products",
    "Pet Supplies", "Dog Products", "Cat Products", "Office Supplies", "Stationery",
    "Garden & Patio", "Plants & Seeds", "Jewelry", "Watches", "Art & Crafts"
];

const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomPick = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
};

const generateProductName = (index) => {
    const adj = randomPick(ADJECTIVES);
    const brand = randomPick(BRANDS);
    const type = randomPick(PRODUCT_TYPES);
    const color = randomPick(COLORS);
    const material = randomPick(MATERIALS);

    const variants = [
        `${adj} ${brand} ${type}`,
        `${brand} ${adj} ${type} ${color}`,
        `${type} by ${brand} - ${adj} Edition`,
        `${brand} ${type} ${material} Series`,
        `${adj} ${type} - ${brand} ${color}`,
        `${brand} ${adj} ${material} ${type}`,
    ];

    return `${randomPick(variants)} #${index}`;
};

const generateDescription = (name) => {
    const features = [
        "High-quality construction with premium materials",
        "Designed for optimal performance and durability",
        "Easy to use with intuitive controls",
        "Sleek modern design fits any style",
        "Energy-efficient and eco-friendly",
        "Compact size perfect for any space",
        "Built to last with a solid warranty",
        "Advanced technology for superior results",
        "Comfortable and ergonomic design",
        "Versatile functionality for multiple uses",
        "Fast and reliable performance",
        "Industry-leading quality and craftsmanship",
        "Innovative features for enhanced experience",
        "Lightweight yet incredibly sturdy",
        "Perfect for professionals and enthusiasts alike",
    ];

    const numFeatures = randomInt(2, 4);
    const selectedFeatures = [];

    for (let i = 0; i < numFeatures; i++) {
        const feature = randomPick(features);
        if (!selectedFeatures.includes(feature)) {
            selectedFeatures.push(feature);
        }
    }

    return `${name}. ${selectedFeatures.join(". ")}.`;
};

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, lowercase: true },
});

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        slug: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        category: { type: mongoose.ObjectId, ref: "Category", required: true },
        quantity: { type: Number, required: true },
        photo: { data: Buffer, contentType: String },
        shipping: { type: Boolean },
    },
    { timestamps: true }
);

productSchema.index({ name: "text", description: "text" });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 1 });

const Category = mongoose.model("Category", categorySchema);
const Product = mongoose.model("Products", productSchema);

async function seedCategories(numCategories) {
    console.log(`\nSeeding ${numCategories} categories...`);
    const categories = [];

    const categoryNames = [...CATEGORY_NAMES];
    while (categoryNames.length < numCategories) {
        categoryNames.push(`Category ${categoryNames.length + 1}`);
    }

    for (let i = 0; i < numCategories; i++) {
        const name = categoryNames[i];
        const slug = slugify(name, { lower: true });

        try {
            let category = await Category.findOne({ slug });
            if (!category) {
                category = await Category.create({ name, slug });
                console.log(`    Created category: ${name}`);
            } else {
                console.log(`    Category exists: ${name}`);
            }
            categories.push(category);
        } catch (error) {
            if (error.code === 11000) {
                const existing = await Category.findOne({ slug });
                if (existing) {
                    categories.push(existing);
                }
            } else {
                console.error(`    Error creating category ${name}:`, error.message);
            }
        }
    }

    return categories;
}

async function seedProducts(categories, numProducts) {
    console.log(`\nSeeding ${numProducts} products...`);

    const batchSize = 500;
    let created = 0;
    let skipped = 0;

    for (let batch = 0; batch < Math.ceil(numProducts / batchSize); batch++) {
        const products = [];
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, numProducts);

        for (let i = startIdx; i < endIdx; i++) {
            const name = generateProductName(i);
            const slug = slugify(name, { lower: true, strict: true });
            const category = randomPick(categories);

            let price;
            const priceRange = Math.random();
            if (priceRange < 0.2) {
                price = randomInt(10, 50);
            } else if (priceRange < 0.7) {
                price = randomInt(50, 500);
            } else {
                price = randomInt(500, 5000);
            }

            products.push({
                name,
                slug,
                description: generateDescription(name),
                price,
                category: category._id,
                quantity: randomInt(0, 1000),
                shipping: Math.random() > 0.3,
            });
        }

        try {
            const result = await Product.insertMany(products, { ordered: false });
            created += result.length;
        } catch (error) {
            if (error.writeErrors) {
                created += error.insertedDocs?.length || 0;
                skipped += error.writeErrors.length;
            } else {
                console.error(`    Batch ${batch + 1} error:`, error.message);
            }
        }

        const progress = Math.round((endIdx / numProducts) * 100);
        process.stdout.write(`\r    Progress: ${progress}% (${created} created, ${skipped} skipped)`);
    }

    console.log(`\n    Completed: ${created} products created, ${skipped} skipped`);
    return created;
}

async function getStats() {
    const categoryCount = await Category.countDocuments();
    const productCount = await Product.countDocuments();

    const priceStats = await Product.aggregate([
        {
            $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
                avgPrice: { $avg: "$price" },
            },
        },
    ]);

    const categoryDistribution = await Product.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category",
            },
        },
        { $unwind: "$category" },
        { $project: { name: "$category.name", count: 1 } },
    ]);

    return { categoryCount, productCount, priceStats, categoryDistribution };
}

async function main() {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        console.error("Error: MONGO_URL environment variable is required");
        process.exit(1);
    }

    const numProducts = parseInt(process.env.STRESS_TEST_PRODUCTS || "10000", 10);
    const numCategories = parseInt(process.env.STRESS_TEST_CATEGORIES || "50", 10);

    console.log("=".repeat(60));
    console.log("Stress Test Data Seeding");
    console.log("=".repeat(60));
    console.log(`Target: ${numProducts} products, ${numCategories} categories`);
    console.log(`MongoDB: ${mongoUrl.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")}`);

    try {
        await mongoose.connect(mongoUrl);
        console.log("\nConnected to MongoDB successfully");

        const startTime = Date.now();

        const categories = await seedCategories(numCategories);
        await seedProducts(categories, numProducts);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log("\n" + "=".repeat(60));
        console.log("Database Statistics");
        console.log("=".repeat(60));

        const stats = await getStats();
        console.log(`Total Categories: ${stats.categoryCount}`);
        console.log(`Total Products: ${stats.productCount}`);

        if (stats.priceStats[0]) {
            const ps = stats.priceStats[0];
            console.log(`Price Range: $${ps.minPrice} - $${ps.maxPrice} (avg: $${ps.avgPrice.toFixed(2)})`);
        }

        console.log("\nTop 10 Categories by Product Count:");
        stats.categoryDistribution.forEach((cat, i) => {
            console.log(`    ${i + 1}. ${cat.name}: ${cat.count} products`);
        });

        console.log(`\nSeeding completed in ${duration} seconds`);
        console.log("=".repeat(60));

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\nDatabase connection closed");
    }
}

main();
