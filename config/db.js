import mongoose from "mongoose";
import colors from "colors";
import dns from "node:dns/promises";
import { MongoMemoryServer } from "mongodb-memory-server";

dns.setServers(["1.1.1.1"]);

let inMemoryMongoServer;
let shutdownHookRegistered = false;

const stopInMemoryMongo = async () => {
    if (!inMemoryMongoServer) {
        return;
    }
    try {
        await inMemoryMongoServer.stop();
        console.log("In-memory MongoDB stopped".bgBlue.white);
    } catch (error) {
        console.log(`Error while stopping in-memory MongoDB ${error}`.bgRed.white);
    } finally {
        inMemoryMongoServer = undefined;
    }
};

const registerShutdownHook = () => {
    if (shutdownHookRegistered) {
        return;
    }
    shutdownHookRegistered = true;

    const gracefulShutdown = async () => {
        await stopInMemoryMongo();
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
    process.on("exit", gracefulShutdown);
};

const connectDB = async () => {
    try {
        const useInMemoryMongo = process.env.USE_IN_MEMORY_MONGO === "true";
        let mongoUri = process.env.MONGO_URL;

        if (useInMemoryMongo) {
            inMemoryMongoServer = await MongoMemoryServer.create();
            mongoUri = inMemoryMongoServer.getUri();
            registerShutdownHook();
            console.log("Using in-memory MongoDB for E2E run".bgBlue.white);
        }

        const conn = await mongoose.connect(mongoUri);
        console.log(`Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white);
    } catch (error) {
        console.log(`Error in Mongodb ${error}`.bgRed.white);
        process.exit(1);
    }
};

export default connectDB;