// Aw Jean Leng Adrian, A0277537N

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SearchProvider, useSearch } from './search';

describe('Search Context', () => {
    // SearchProvider Tests
    describe('SearchProvider', () => {
        test('should provide initial search state', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const [searchState] = result.current;

            expect(searchState).toEqual({
                keyword: '',
                results: [],
            });
        });

        test('should provide setAuth function', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const [, setAuth] = result.current;

            expect(typeof setAuth).toBe('function');
        });

        test('should render children correctly', () => {
            const TestChild = () => <div data-testid="test-child">Test</div>;

            const { getByTestId } = require('@testing-library/react').render(
                <SearchProvider>
                    <TestChild />
                </SearchProvider>
            );

            expect(getByTestId('test-child')).toBeInTheDocument();
        });
    });

    // useSearch Hook Tests
    describe('useSearch Hook', () => {
        test('should return search state and setter', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            expect(result.current).toHaveLength(2);
            expect(result.current[0]).toEqual({ keyword: '', results: [] });
            expect(typeof result.current[1]).toBe('function');
        });

        test('should update keyword', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'laptop', results: [] });
            });

            const [searchState] = result.current;
            expect(searchState.keyword).toBe('laptop');
        });

        test('should update results', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const mockResults = [
                { _id: 'prod1', name: 'Product 1' },
                { _id: 'prod2', name: 'Product 2' },
            ];

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'laptop', results: mockResults });
            });

            const [searchState] = result.current;
            expect(searchState.results).toEqual(mockResults);
            expect(searchState.results).toHaveLength(2);
        });

        test('should update keyword and results together', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const mockResults = [{ _id: 'prod1', name: 'Gaming Laptop' }];

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'gaming', results: mockResults });
            });

            const [searchState] = result.current;
            expect(searchState).toEqual({
                keyword: 'gaming',
                results: mockResults,
            });
        });

        test('should preserve previous state when updating', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            act(() => {
                const [searchState, setAuth] = result.current;
                setAuth({ ...searchState, keyword: 'phone' });
            });

            const [searchState] = result.current;
            expect(searchState).toEqual({
                keyword: 'phone',
                results: [],
            });
        });

        test('should handle multiple updates', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            // First update
            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'laptop', results: [] });
            });

            expect(result.current[0].keyword).toBe('laptop');

            // Second update
            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'phone', results: [] });
            });

            expect(result.current[0].keyword).toBe('phone');

            // Third update with results
            const mockResults = [{ _id: 'prod1', name: 'iPhone' }];
            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'phone', results: mockResults });
            });

            expect(result.current[0].results).toEqual(mockResults);
        });

        test('should handle clearing search', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            // Set some data
            act(() => {
                const [, setAuth] = result.current;
                setAuth({
                    keyword: 'laptop',
                    results: [{ _id: 'prod1', name: 'Laptop' }],
                });
            });

            // Clear search
            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: '', results: [] });
            });

            const [searchState] = result.current;
            expect(searchState).toEqual({ keyword: '', results: [] });
        });

        test('should handle empty results array', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'nonexistent', results: [] });
            });

            const [searchState] = result.current;
            expect(searchState.results).toEqual([]);
            expect(searchState.keyword).toBe('nonexistent');
        });

        test('should handle large results array', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const largeResults = Array.from({ length: 100 }, (_, i) => ({
                _id: `prod${i}`,
                name: `Product ${i}`,
            }));

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'products', results: largeResults });
            });

            const [searchState] = result.current;
            expect(searchState.results).toHaveLength(100);
        });
    });

    // Context Sharing Tests
    describe('Context Sharing Between Components', () => {
        test('should share state between multiple hook instances', () => {
            const wrapper = ({ children }) => (
                <SearchProvider>{children}</SearchProvider>
            );
            
            const { result } = renderHook(() => useSearch(), { wrapper: SearchProvider });

            // Update from first hook
            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'shared', results: [] });
            });

            // Both hooks should see the same state
            expect(result.current[0].keyword).toBe('shared');
            expect(result.current[0].results).toEqual([]);
        });

        test('should maintain state across re-renders', () => {
            const { result, rerender } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'persistent', results: [] });
            });

            // Re-render
            rerender();

            const [searchState] = result.current;
            expect(searchState.keyword).toBe('persistent');
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        test('should handle updating with partial state', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            // Only update keyword
            act(() => {
                const [searchState, setAuth] = result.current;
                setAuth({ ...searchState, keyword: 'partial' });
            });

            const [state] = result.current;
            expect(state.keyword).toBe('partial');
            expect(state.results).toEqual([]);
        });

        test('should handle results with complex objects', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const complexResults = [
                {
                    _id: 'prod1',
                    name: 'Laptop',
                    price: 999,
                    specs: { cpu: 'i7', ram: '16GB' },
                },
            ];

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'laptop', results: complexResults });
            });

            const [searchState] = result.current;
            expect(searchState.results[0].specs).toEqual({ cpu: 'i7', ram: '16GB' });
        });

        test('should handle special characters in keyword', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: 'laptop & tablet', results: [] });
            });

            const [searchState] = result.current;
            expect(searchState.keyword).toBe('laptop & tablet');
        });

        test('should handle very long keyword', () => {
            const { result } = renderHook(() => useSearch(), {
                wrapper: SearchProvider,
            });

            const longKeyword = 'a'.repeat(1000);

            act(() => {
                const [, setAuth] = result.current;
                setAuth({ keyword: longKeyword, results: [] });
            });

            const [searchState] = result.current;
            expect(searchState.keyword).toHaveLength(1000);
        });
    });

    // Error Cases
    describe('Error Handling', () => {
        test('should throw error when useSearch is used outside provider', () => {
            // Suppress console error for this test
            const originalError = console.error;
            console.error = jest.fn();

            const { result } = renderHook(() => useSearch());
            expect(result.current).toBeUndefined();

            console.error = originalError;
        });
    });
});