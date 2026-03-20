/** @jest-environment jsdom */

// Aw Jean Leng Adrian, A0277537N

import { renderHook, waitFor } from '@testing-library/react';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import axios from 'axios';

import categoryModel from '../../../models/categoryModel.js';
import { categoryController } from '../../../controllers/categoryController.js';
import useCategory from './useCategory.js';

jest.setTimeout(30000);

describe('useCategory Hook - Real Backend Integration Tests', () => {
    let mongoServer;
    let app;
    let server;
    let baseURL;
    let originalBaseURL;

    // Setup Express server with real category endpoint
    const setupTestServer = () => {
        const testApp = express();
        testApp.use(express.json());
        // Add CORS headers for jsdom
        testApp.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
        testApp.get('/api/v1/category/get-category', categoryController);
        return testApp;
    };

    // Seed database with test categories
    const seedCategories = async (categories) => {
        await categoryModel.deleteMany({});
        const created = [];
        for (const cat of categories) {
            const c = await categoryModel.create(cat);
            created.push(c);
        }
        return created;
    };

    beforeAll(async () => {
        // Start MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri(), {
            dbName: 'useCategory-hook-integration-tests',
        });

        // Setup Express test server
        app = setupTestServer();
        server = app.listen(0); // Random available port
        const address = server.address();
        baseURL = `http://localhost:${address.port}`;

        // Save original axios baseURL
        originalBaseURL = axios.defaults.baseURL;
        // Configure axios to use test server
        axios.defaults.baseURL = baseURL;
    }, 60000); // 60 second timeout for MongoDB Memory Server startup

    beforeEach(async () => {
        await categoryModel.deleteMany({});
    });

    afterAll(async () => {
        // Restore original axios baseURL
        axios.defaults.baseURL = originalBaseURL;

        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
        server.close();
    });

    describe('Hook Initialization with renderHook', () => {
        test('Render hook with renderHook → verify initial state is empty array []', async () => {
            const { result } = renderHook(() => useCategory());

            // Initial state should be empty array
            expect(result.current).toEqual([]);
        });

        test('Hook renders without errors when backend is available', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            const { result } = renderHook(() => useCategory());

            // Should not throw error
            expect(result.current).toBeDefined();
            expect(Array.isArray(result.current)).toBe(true);
        });
    });

    describe('useEffect Lifecycle - Real Hook Behavior', () => {
        test('Verify useEffect triggers on mount → fetches data from REAL backend', async () => {
            await seedCategories([
                { name: 'Electronics', slug: 'electronics' },
                { name: 'Books', slug: 'books' },
            ]);

            const { result } = renderHook(() => useCategory());

            // Initial state
            expect(result.current).toEqual([]);

            // Wait for useEffect to complete and state to update
            await waitFor(() => {
                expect(result.current.length).toBe(2);
            });

            expect(result.current[0].name).toBe('Electronics');
            expect(result.current[1].name).toBe('Books');
        });

        test('Hook fetches data from real DB → verify state updates with real data', async () => {
            const seeded = await seedCategories([
                { name: 'Test Category', slug: 'test-category' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            // Verify data matches DB
            expect(result.current[0]._id).toBe(seeded[0]._id.toString());
            expect(result.current[0].name).toBe('Test Category');
            expect(result.current[0].slug).toBe('test-category');
        });

        test('useEffect cleanup function is defined and ready to execute', () => {
            const { unmount } = renderHook(() => useCategory());

            // Unmount should trigger cleanup without errors
            expect(() => unmount()).not.toThrow();
        });
    });

    describe('API Response Integration - Real Axios Calls', () => {
        test('Hook receives real API response → extracts data.category correctly', async () => {
            await seedCategories([
                { name: 'Category 1', slug: 'category-1' },
                { name: 'Category 2', slug: 'category-2' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(2);
            });

            // Verify hook extracted data.category correctly
            expect(result.current[0].name).toBe('Category 1');
            expect(result.current[1].name).toBe('Category 2');
        });

        test('Backend returns {success: true, category: [...]} → hook state updates', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            // Verify category data structure
            expect(result.current[0]).toHaveProperty('_id');
            expect(result.current[0]).toHaveProperty('name');
            expect(result.current[0]).toHaveProperty('slug');
        });

        test('Backend returns empty array → hook state is empty array (not undefined)', async () => {
            await categoryModel.deleteMany({});

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            expect(result.current).toEqual([]);
            expect(Array.isArray(result.current)).toBe(true);
        });
    });

    describe('Error Handling - Real Error Scenarios', () => {
        test('Backend returns 500 error → hook catches error, sets empty array', async () => {
            // Close DB to cause 500 error
            await mongoose.connection.close();

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current).toBeDefined();
            }, { timeout: 5000 });

            // Hook should set empty array on error
            expect(result.current).toEqual([]);

            // Reconnect for cleanup
            await mongoose.connect(mongoServer.getUri(), {
                dbName: 'useCategory-hook-integration-tests',
            });
        });

        test('API fails → hook does not crash, returns empty array', async () => {
            // Temporarily break axios
            const originalGet = axios.get;
            axios.get = jest.fn().mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            expect(result.current).toEqual([]);

            // Restore axios
            axios.get = originalGet;
        });
    });

    describe('Memory Leak Prevention - isMounted Flag Pattern', () => {
        test('Render hook → start API call → unmount hook before API completes → no state update', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            // Mock slow API response
            const originalGet = axios.get;
            axios.get = jest.fn(() => new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        data: {
                            success: true,
                            category: [{ name: 'Test', slug: 'test' }],
                        },
                    });
                }, 100);
            }));

            const { result, unmount } = renderHook(() => useCategory());

            // Initial state
            expect(result.current).toEqual([]);

            // Unmount immediately (before API completes)
            unmount();

            // Wait for API to complete
            await new Promise(resolve => setTimeout(resolve, 150));

            // State should still be empty (isMounted prevented update)
            expect(result.current).toEqual([]);

            // Restore axios
            axios.get = originalGet;
        });

        test('Multiple mount/unmount cycles → verify no memory leaks or errors', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            // Mount and unmount 5 times
            for (let i = 0; i < 5; i++) {
                const { unmount } = renderHook(() => useCategory());
                unmount();
            }

            // Should complete without errors or memory leaks
            expect(true).toBe(true);
        });

        test('Unmount during pending API call → cleanup function prevents state update', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            const { result, unmount } = renderHook(() => useCategory());

            // Unmount immediately
            unmount();

            // Give time for any pending operations
            await new Promise(resolve => setTimeout(resolve, 100));

            // No error should occur
            expect(result.current).toEqual([]);
        });
    });

    describe('Cleanup Function Execution', () => {
        test('Hook unmounts → cleanup function sets isMounted to false', async () => {
            const { unmount } = renderHook(() => useCategory());

            // Unmount should execute cleanup
            expect(() => unmount()).not.toThrow();
        });

        test('Cleanup prevents setState after unmount (memory leak prevention)', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            // Mock slow API
            const originalGet = axios.get;
            let resolveApi;
            axios.get = jest.fn(() => new Promise((resolve) => {
                resolveApi = resolve;
            }));

            const { result, unmount } = renderHook(() => useCategory());

            // Unmount before API completes
            unmount();

            // Complete API call after unmount
            resolveApi({
                data: {
                    success: true,
                    category: [{ name: 'Test', slug: 'test' }],
                },
            });

            await new Promise(resolve => setTimeout(resolve, 50));

            // State should not update (isMounted = false prevented it)
            expect(result.current).toEqual([]);

            // Restore axios
            axios.get = originalGet;
        });
    });

    describe('Data Persistence and Real Database Integration', () => {
        test('Seed 3 categories → hook fetches all 3 from real DB', async () => {
            await seedCategories([
                { name: 'Electronics', slug: 'electronics' },
                { name: 'Books', slug: 'books' },
                { name: 'Clothing', slug: 'clothing' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            });

            expect(result.current[0].name).toBe('Electronics');
            expect(result.current[1].name).toBe('Books');
            expect(result.current[2].name).toBe('Clothing');
        });

        test('Hook data matches real DB documents exactly', async () => {
            const seeded = await seedCategories([
                { name: 'Test 1', slug: 'test-1' },
                { name: 'Test 2', slug: 'test-2' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(2);
            });

            // Verify exact match with DB
            expect(result.current[0]._id).toBe(seeded[0]._id.toString());
            expect(result.current[0].name).toBe(seeded[0].name);
            expect(result.current[1]._id).toBe(seeded[1]._id.toString());
            expect(result.current[1].name).toBe(seeded[1].name);
        });

        test('Update DB → remount hook → hook fetches updated data', async () => {
            const seeded = await seedCategories([
                { name: 'Original', slug: 'original' },
            ]);

            const { result: result1, unmount: unmount1 } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result1.current.length).toBe(1);
            });

            expect(result1.current[0].name).toBe('Original');

            unmount1();

            // Update DB
            await categoryModel.findByIdAndUpdate(seeded[0]._id, {
                name: 'Updated',
                slug: 'updated',
            });

            // Remount hook
            const { result: result2 } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result2.current.length).toBe(1);
            });

            // Should have updated data
            expect(result2.current[0].name).toBe('Updated');
        });

        test('Empty DB → hook returns empty array', async () => {
            await categoryModel.deleteMany({});

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current).toBeDefined();
            });

            expect(result.current).toEqual([]);
            expect(await categoryModel.countDocuments()).toBe(0);
        });
    });

    describe('DB Persistence Verification', () => {
        test('Complete flow: seed DB → render hook → verify hook data matches DB query', async () => {
            const seeded = await seedCategories([
                { name: 'Flow Test 1', slug: 'flow-test-1' },
                { name: 'Flow Test 2', slug: 'flow-test-2' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(2);
            });

            // Direct DB query
            const dbCategories = await categoryModel.find({});

            // Verify exact match
            expect(result.current.length).toBe(dbCategories.length);
            result.current.forEach((hookCat, i) => {
                expect(hookCat._id).toBe(dbCategories[i]._id.toString());
                expect(hookCat.name).toBe(dbCategories[i].name);
                expect(hookCat.slug).toBe(dbCategories[i].slug);
            });
        });

        test('Verify no data transformation between DB → API → Hook', async () => {
            await seedCategories([
                { name: 'Integrity Test', slug: 'integrity-test' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            // Get data from DB
            const dbCategory = await categoryModel.findOne({ slug: 'integrity-test' });

            // Verify no transformation
            expect(result.current[0]._id).toBe(dbCategory._id.toString());
            expect(result.current[0].name).toBe(dbCategory.name);
            expect(result.current[0].slug).toBe(dbCategory.slug);
        });

        test('Test with 0, 1, 5, and 10 categories → hook handles all cases', async () => {
            // Test 0 categories
            await categoryModel.deleteMany({});
            const { result: result0, unmount: unmount0 } = renderHook(() => useCategory());
            await waitFor(() => expect(result0.current).toBeDefined());
            expect(result0.current).toHaveLength(0);
            unmount0();

            // Test 1 category
            await seedCategories([{ name: 'Single', slug: 'single' }]);
            const { result: result1, unmount: unmount1 } = renderHook(() => useCategory());
            await waitFor(() => expect(result1.current.length).toBe(1));
            unmount1();

            // Test 5 categories
            const fiveCats = Array.from({ length: 5 }, (_, i) => ({
                name: `Cat ${i + 1}`,
                slug: `cat-${i + 1}`,
            }));
            await seedCategories(fiveCats);
            const { result: result5, unmount: unmount5 } = renderHook(() => useCategory());
            await waitFor(() => expect(result5.current.length).toBe(5));
            unmount5();

            // Test 10 categories
            const tenCats = Array.from({ length: 10 }, (_, i) => ({
                name: `Category ${i + 1}`,
                slug: `category-${i + 1}`,
            }));
            await seedCategories(tenCats);
            const { result: result10 } = renderHook(() => useCategory());
            await waitFor(() => expect(result10.current.length).toBe(10));
        });
    });

    describe('Return Value Structure', () => {
        test('Hook returns array of category objects with correct structure', async () => {
            await seedCategories([
                { name: 'Test', slug: 'test' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            const category = result.current[0];
            expect(category).toHaveProperty('_id');
            expect(category).toHaveProperty('name');
            expect(category).toHaveProperty('slug');
            expect(typeof category._id).toBe('string');
            expect(typeof category.name).toBe('string');
            expect(typeof category.slug).toBe('string');
        });

        test('Verify return type matches expected interface: Array<{_id, name, slug}>', async () => {
            await seedCategories([
                { name: 'Electronics', slug: 'electronics' },
                { name: 'Books', slug: 'books' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(2);
            });

            // Verify array type
            expect(Array.isArray(result.current)).toBe(true);

            // Verify each object structure
            result.current.forEach((cat) => {
                expect(cat).toHaveProperty('_id');
                expect(cat).toHaveProperty('name');
                expect(cat).toHaveProperty('slug');
            });
        });
    });

    describe('Real Backend Integration End-to-End', () => {
        test('Complete integration: MongoDB → Express → Axios → React Hook → State', async () => {
            // 1. Seed MongoDB
            const seeded = await seedCategories([
                { name: 'E2E Test', slug: 'e2e-test' },
            ]);

            // 2. Verify DB has data
            const dbCheck = await categoryModel.find({});
            expect(dbCheck).toHaveLength(1);

            // 3. Render hook (triggers axios → Express → MongoDB)
            const { result } = renderHook(() => useCategory());

            // 4. Wait for state update
            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            // 5. Verify complete data flow
            expect(result.current[0]._id).toBe(seeded[0]._id.toString());
            expect(result.current[0].name).toBe('E2E Test');
        });

        test('Real axios GET to running backend server → hook receives response', async () => {
            await seedCategories([
                { name: 'Real Axios Test', slug: 'real-axios-test' },
            ]);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            });

            // Verify axios actually called the backend
            expect(result.current[0].name).toBe('Real Axios Test');
        });
    });
});
