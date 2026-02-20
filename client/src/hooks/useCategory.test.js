import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import useCategory from './useCategory';

jest.mock('axios');

// Suppress console for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});
afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

describe("useCategory Hook", () => {
    const mockCategories = [
        { _id: "cat1", name: "Electronics", slug: "electronics" },
        { _id: "cat2", name: "Books", slug: "books" },
        { _id: "cat3", name: "Clothing", slug: "clothing" },
    ];
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Success Cases
    describe("Success Cases", () => {
        test("should fetch and return all 3 categories on mount", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    message: "All Categories List",
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            // Wait for state to be populated - single waitFor for final state
            await waitFor(() => {
                expect(result.current).toEqual(mockCategories);
            }, { timeout: 3000 });

            // Verify API was called with correct endpoint
            expect(axios.get).toHaveBeenCalledTimes(1);
            expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
        });

        test("should return Electronics category", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            // ✅ Wait for state to be populated first
            await waitFor(() => {
                expect(result.current.length).toBeGreaterThan(0);
            }, { timeout: 3000 });

            // ✅ Then check the values (state is already settled)
            expect(result.current).toHaveLength(3);
            expect(result.current[0].name).toBe("Electronics");
            expect(result.current[0].slug).toBe("electronics");
        });

        test("should return Books category", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            // ✅ Wait for data to load before checking
            await waitFor(() => {
                expect(result.current.length).toBeGreaterThan(0);
            }, { timeout: 3000 });

            const books = result.current.find((cat) => cat.name === "Books");
            expect(books).toBeDefined();
            expect(books.slug).toBe("books");
        });

        test("should return Clothing category", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBeGreaterThan(0);
            }, { timeout: 3000 });

            const clothing = result.current.find((cat) => cat.name === "Clothing");
            expect(clothing).toBeDefined();
            expect(clothing.slug).toBe("clothing");
        });

        test("should fetch categories only once on mount", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result, rerender } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current).toEqual(mockCategories);
            }, { timeout: 3000 });

            // Rerender the hook
            rerender();

            // Should still have been called only once (no refetch on rerender)
            expect(axios.get).toHaveBeenCalledTimes(1);
        });

        test("should maintain category order from API", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            expect(result.current[0].name).toBe("Electronics");
            expect(result.current[1].name).toBe("Books");
            expect(result.current[2].name).toBe("Clothing");
        });
    });

    // Error Cases
    describe("Error Handling", () => {
        test("should handle API errors gracefully", async () => {
            const error = new Error("Network error");
            axios.get.mockRejectedValue(error);

            const { result } = renderHook(() => useCategory());

            // ✅ Wait for error to be processed
            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            }, { timeout: 3000 });

            // Categories should remain empty array after error
            expect(result.current).toEqual([]);
        });

        test("should handle 404 errors", async () => {
            const error = {
                response: {
                    status: 404,
                    data: { message: "Categories not found" },
                },
            };
            axios.get.mockRejectedValue(error);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            }, { timeout: 3000 });

            expect(result.current).toEqual([]);
        });

        test("should handle 500 server errors", async () => {
            const error = {
                response: {
                    status: 500,
                    data: {
                        success: false,
                        message: "Error while getting all categories"
                    },
                },
            };
            axios.get.mockRejectedValue(error);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            }, { timeout: 3000 });

            expect(result.current).toEqual([]);
        });

        test("should handle network timeout", async () => {
            const error = new Error("timeout of 5000ms exceeded");
            axios.get.mockRejectedValue(error);

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            }, { timeout: 3000 });

            expect(result.current).toEqual([]);
        });
    });

    // Data Structure Tests
    describe("Data Structure Handling", () => {
        test("should handle empty categories array", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    message: "All Categories List",
                    category: [],
                },
            });

            const { result } = renderHook(() => useCategory());

            // ✅ Wait for API call to complete
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            }, { timeout: 3000 });

            expect(result.current).toEqual([]);
        });

        test("should handle response with null category", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: null,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            }, { timeout: 3000 });

            // data?.category will be empty
            expect(result.current).toEqual([]);
        });

        test("should handle response with undefined category", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            }, { timeout: 3000 });

            // data?.category will be empty
            expect(result.current).toEqual([]);
        });

        test("should handle single category", async () => {
            const singleCategory = [mockCategories[0]];

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: singleCategory,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(1);
            }, { timeout: 3000 });

            expect(result.current).toEqual(singleCategory);
            expect(result.current[0].name).toBe("Electronics");
        });

        test("should handle categories with additional fields", async () => {
            const categoriesWithExtra = mockCategories.map((cat) => ({
                ...cat,
                createdAt: "2024-01-01T10:00:00Z",
                updatedAt: "2024-01-01T10:00:00Z",
                __v: 0,
            }));

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: categoriesWithExtra,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            expect(result.current).toEqual(categoriesWithExtra);
            expect(result.current[0].createdAt).toBeDefined();
        });
    });

    // Edge Cases
    describe("Edge Cases", () => {
        test("should handle malformed response data", async () => {
            axios.get.mockResolvedValue({
                data: "malformed string instead of object",
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            }, { timeout: 3000 });

            // data?.category will be empty for string
            expect(result.current).toEqual([]);
        });

        test("should handle empty response", async () => {
            axios.get.mockResolvedValue({});

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            }, { timeout: 3000 });

            // Empty response means data is empty
            expect(result.current).toEqual([]);
        });

        test("should handle categories with missing slug", async () => {
            const categoriesNoSlug = [
                { _id: "1", name: "Electronics" }, // Missing slug
                { _id: "2", name: "Books" },
                { _id: "3", name: "Clothing" },
            ];

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: categoriesNoSlug,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            expect(result.current).toEqual(categoriesNoSlug);
        });

        test("should handle duplicate category names", async () => {
            const duplicateCategories = [
                { _id: "1", name: "Electronics", slug: "electronics" },
                { _id: "2", name: "Electronics", slug: "electronics-2" },
                { _id: "3", name: "Books", slug: "books" },
            ];

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: duplicateCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            expect(result.current).toEqual(duplicateCategories);
            const electronics = result.current.filter(
                (cat) => cat.name === "Electronics"
            );
            expect(electronics).toHaveLength(2);
        });

        test("should handle categories in different order", async () => {
            const reorderedCategories = [
                { _id: "3", name: "Clothing", slug: "clothing" },
                { _id: "1", name: "Electronics", slug: "electronics" },
                { _id: "2", name: "Books", slug: "books" },
            ];

            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: reorderedCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            expect(result.current[0].name).toBe("Clothing");
            expect(result.current[1].name).toBe("Electronics");
            expect(result.current[2].name).toBe("Books");
        });

        test("should handle case-sensitive category names", async () => {
            axios.get.mockResolvedValue({
                data: {
                    success: true,
                    category: mockCategories,
                },
            });

            const { result } = renderHook(() => useCategory());

            await waitFor(() => {
                expect(result.current.length).toBe(3);
            }, { timeout: 3000 });

            // Names should be exactly as stored
            expect(result.current[0].name).toBe("Electronics"); // Not "electronics"
            expect(result.current[1].name).toBe("Books"); // Not "books"
            expect(result.current[2].name).toBe("Clothing"); // Not "clothing"
        });
    });
});