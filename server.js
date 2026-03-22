import express from "express";
import "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import seedAdminUser from "./scripts/seedAdminUser.js";
import seedTestData from "./scripts/seedTestData.js";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import orderRoutes from './routes/orderRoute.js'
import testOrderRoutes from './routes/testOrderRoute.js'
import cors from "cors";

// configure env
dotenv.config();

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/auth", orderRoutes);
if (process.env.DEV_MODE === "test") {
    app.use("/api/v1/auth", testOrderRoutes);
}
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);

// rest api

app.get('/', (req,res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;
const shouldRunE2ESeed = process.env.E2E_SEED_ADMIN === "true";
const shouldSeedTestData = process.env.E2E_SEED_TEST_DATA === "true";

const startServer = async () => {
    try {
        await connectDB();
        if (shouldRunE2ESeed) {
            await seedAdminUser();
        }
        if (shouldSeedTestData) {
            await seedTestData();
        }
        app.listen(PORT, () => {
            console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
        });
    } catch (error) {
        console.log(`Error starting server: ${error}`.bgRed.white);
        process.exit(1);
    }
};

startServer();
