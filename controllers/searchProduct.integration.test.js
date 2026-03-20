// Aw Jean Leng Adrian, A0277537N

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import request from 'supertest';

import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';
import { searchProductController } from './productController.js';

jest.setTimeout(30000);

describe('Search Product Backend Integration Tests - Real API + MongoDB', () => {
    let mongoServer;
    let app;
    let categoryId;

    // Setup Express server with real search endpoint
    const setupTestServer = () => {
        const testApp = express();
        testApp.use(express.json());
        testApp.get('/api/v1/product/search/:keyword', searchProductController);
        return testApp;
    };

    // Seed database with test products
    const seedProducts = async (products) => {
        await productModel.deleteMany({});
        const created = [];
        for (const product of products) {
            const p = await productModel.create({ ...product, category: categoryId });
            created.push(p);
        }
        return created;
    };

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri(), {
            dbName: 'search-backend-integration-tests',
        });

        const category = await categoryModel.create({
            name: 'Electronics',
            slug: 'electronics',
        });
        categoryId = category._id;

        app = setupTestServer();
    });

    beforeEach(async () => {
        await productModel.deleteMany({});
    });

    afterAll(async () => {
        await categoryModel.deleteMany({});
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    describe('API Integration with Real Database', () => {
        test('Seed DB with 3 products (2 laptops,1 phone) → GET /search/laptop → returns 2 laptops from DB', async () => {
            await seedProducts([
                { name: 'Dell Laptop', slug: 'dell-laptop', description: 'High-performance laptop', price: 1499, quantity: 10 },
                { name: 'HP Laptop', slug: 'hp-laptop', description: 'Business laptop', price: 1299, quantity: 15 },
                { name: 'iPhone', slug: 'iphone', description: 'Smartphone', price: 999, quantity: 20 },
            ]);

            const response = await request(app).get('/api/v1/product/search/laptop').expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('Dell Laptop');
            expect(response.body[1].name).toBe('HP Laptop');

            // Verify DB actually has these products
            const dbProducts = await productModel.find({
                $or: [
                    { name: { $regex: 'laptop', $options: 'i' } },
                    { description: { $regex: 'laptop', $options: 'i' } },
                ],
            });
            expect(dbProducts).toHaveLength(2);
        });

        test('After API call → response data matches actual DB documents', async () => {
            const seeded = await seedProducts([
                { name: 'MacBook Pro', slug: 'macbook-pro', description: 'Apple laptop', price: 2499, quantity: 5 },
                { name: 'MacBook Air', slug: 'macbook-air', description: 'Lightweight laptop', price: 1299, quantity: 8 },
            ]);

            const response = await request(app).get('/api/v1/product/search/macbook').expect(200);

            expect(response.body).toHaveLength(2);
            expect(response.body[0]._id).toBe(seeded[0]._id.toString());
            expect(response.body[0].name).toBe('MacBook Pro');
            expect(response.body[1]._id).toBe(seeded[1]._id.toString());
            expect(response.body[1].name).toBe('MacBook Air');
        });
    });

    describe('Search Results from Real Database', () => {
        test('Search by product name returns matching products', async () => {
            await seedProducts([
                { name: 'Gaming Laptop', slug: 'gaming-laptop', description: 'High-end laptop', price: 1999, quantity: 4 },
                { name: 'Mouse', slug: 'mouse', description: 'Wireless mouse', price: 29, quantity: 50 },
            ]);

            const response = await request(app).get('/api/v1/product/search/laptop').expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('Gaming Laptop');
        });

        test('Search by description keyword returns matching products', async () => {
            await seedProducts([
                { name: 'Samsung Phone', slug: 'samsung-phone', description: 'Professional camera smartphone', price: 899, quantity: 12 },
                { name: 'Canon Camera', slug: 'canon-camera', description: 'DSLR camera for professionals', price: 1599, quantity: 6 },
            ]);

            const response = await request(app).get('/api/v1/product/search/professional').expect(200);

            expect(response.body).toHaveLength(2);
        });

        test('Case-insensitive search', async () => {
            await seedProducts([
                { name: 'LAPTOP GAMING', slug: 'laptop-gaming', description: 'HIGH-PERFORMANCE', price: 1999, quantity: 5 },
            ]);

            const response = await request(app).get('/api/v1/product/search/gaming').expect(200);

            expect(response.body).toHaveLength(1);
            expect(response.body[0].name).toBe('LAPTOP GAMING');
        });

        test('No matching products returns empty array', async () => {
            await seedProducts([
                { name: 'Tablet', slug: 'tablet', description: 'Android tablet', price: 300, quantity: 2 },
            ]);

            const response = await request(app).get('/api/v1/product/search/nonexistent').expect(200);

            expect(response.body).toEqual([]);
        });

        test('Empty DB returns empty array', async () => {
            await productModel.deleteMany({});

            const response = await request(app).get('/api/v1/product/search/anything').expect(200);

            expect(response.body).toEqual([]);
            expect(await productModel.countDocuments()).toBe(0);
        });
    });

    describe('End-to-End with Database Verification', () => {
        test('Complete flow: seed DB → API call → verify response matches DB state', async () => {
            const seeded = await seedProducts([
                { name: 'Math Textbook', slug: 'math-textbook', description: 'Calculus textbook', price: 75, quantity: 10 },
                { name: 'Physics Textbook', slug: 'physics-textbook', description: 'Physics textbook', price: 85, quantity: 8 },
            ]);

            const response = await request(app).get('/api/v1/product/search/textbook').expect(200);

            expect(response.body).toHaveLength(2);

            const dbResults = await productModel.find({
                $or: [
                    { name: { $regex: 'textbook', $options: 'i' } },
                    { description: { $regex: 'textbook', $options: 'i' } },
                ],
            }).select('-photo');

            expect(response.body[0]._id).toBe(dbResults[0]._id.toString());
            expect(response.body[1]._id).toBe(dbResults[1]._id.toString());
        });
    });
});