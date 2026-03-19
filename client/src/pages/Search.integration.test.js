// Aw Jean Leng Adrian, A0277537N

// Integration tests for Search functionality
// Tests the interaction between SearchInput, SearchProvider, Search page, and API

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import SearchInput from '../components/Form/SearchInput';
import Search from './Search';
import { SearchProvider, useSearch } from '../context/search';

// Mock Layout component to avoid unnecessary dependencies
jest.mock('../components/Layout', () => ({ children, title }) => (
    <div data-testid="layout-mock">
        <div data-testid="layout-title">{title}</div>
        {children}
    </div>
));

describe('Search Integration Tests - SearchInput + SearchProvider + Search Page + API', () => {
    // Helper component to probe search context state
    const SearchStateProbe = () => {
        const [values] = useSearch();
        return (
            <div style={{ display: 'none' }} aria-hidden="true">
                <div data-testid="context-keyword">{values.keyword || 'NO_KEYWORD'}</div>
                <div data-testid="context-results-count">{values.results?.length || 0}</div>
                <div data-testid="context-results-data">
                    {JSON.stringify(values.results || [])}
                </div>
            </div>
        );
    };

    // Helper component to probe current location
    const LocationProbe = () => {
        const location = useLocation();
        return <div data-testid="location-path">{location.pathname}</div>;
    };

    // Helper to render the complete integrated app
    const renderSearchApp = (initialPath = '/') => {
        return render(
            <SearchProvider>
                <MemoryRouter initialEntries={[initialPath]}>
                    <SearchStateProbe />
                    <LocationProbe />
                    <Routes>
                        <Route path="/" element={<SearchInput />} />
                        <Route path="/search" element={<Search />} />
                    </Routes>
                </MemoryRouter>
            </SearchProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Context State Management', () => {
        test('renders SearchInput with SearchProvider and updates context state when typing', async () => {
            renderSearchApp('/');

            // Verify initial state
            expect(screen.getByTestId('context-keyword')).toHaveTextContent('NO_KEYWORD');
            expect(screen.getByTestId('context-results-count')).toHaveTextContent('0');

            // Type "laptop" in input
            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'laptop' } });

            // Verify context state updates to {keyword: "laptop", results: []}
            await waitFor(() => {
                expect(screen.getByTestId('context-keyword')).toHaveTextContent('laptop');
                expect(screen.getByTestId('context-results-count')).toHaveTextContent('0');
            });
        });

        test('input field reflects updated value (two-way binding)', () => {
            renderSearchApp('/');

            const input = screen.getByPlaceholderText('Search');

            // Type initial value
            fireEvent.change(input, { target: { value: 'phone' } });
            expect(input).toHaveValue('phone');
            expect(screen.getByTestId('context-keyword')).toHaveTextContent('phone');

            // Update to new value
            fireEvent.change(input, { target: { value: 'tablet' } });
            expect(input).toHaveValue('tablet');
            expect(screen.getByTestId('context-keyword')).toHaveTextContent('tablet');
        });

        test('context state persists across component re-renders', async () => {
            const { rerender } = renderSearchApp('/');

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'laptop' } });

            expect(screen.getByTestId('context-keyword')).toHaveTextContent('laptop');

            // Force re-render
            rerender(
                <SearchProvider>
                    <MemoryRouter initialEntries={['/']}>
                        <SearchStateProbe />
                        <LocationProbe />
                        <Routes>
                            <Route path="/" element={<SearchInput />} />
                            <Route path="/search" element={<Search />} />
                        </Routes>
                    </MemoryRouter>
                </SearchProvider>
            );

            // State should persist
            await waitFor(() => {
                expect(screen.getByTestId('context-keyword')).toHaveTextContent('laptop');
            });
        });
    });

    describe('API Integration Flow', () => {
        test('type "laptop" and submit → API call → context state updates with results', async () => {
            // Mock API response with 2 laptop products
            const mockProducts = [
                {
                    _id: 'prod1',
                    name: 'Dell Laptop',
                    description: 'High-performance laptop',
                    price: 999,
                    slug: 'dell-laptop',
                },
                {
                    _id: 'prod2',
                    name: 'HP Laptop',
                    description: 'Business laptop',
                    price: 1299,
                    slug: 'hp-laptop',
                },
            ];

            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'laptop' } });

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            // Verify axios calls real API
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop');
            });

            // Verify context state updates with API results
            await waitFor(() => {
                expect(screen.getByTestId('context-keyword')).toHaveTextContent('laptop');
                expect(screen.getByTestId('context-results-count')).toHaveTextContent('2');
            });

            const resultsData = JSON.parse(screen.getByTestId('context-results-data').textContent);
            expect(resultsData).toHaveLength(2);
            expect(resultsData[0].name).toBe('Dell Laptop');
            expect(resultsData[1].name).toBe('HP Laptop');
        });

        test('Search component automatically renders results from updated context', async () => {
            const mockProducts = [
                { _id: 'prod1', name: 'Dell Laptop', description: 'High-performance laptop', price: 999 },
                { _id: 'prod2', name: 'HP Laptop', description: 'Business laptop', price: 1299 },
            ];

            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'laptop' } });
            fireEvent.submit(screen.getByRole('search'));

            // Wait for navigation and results to appear
            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // Verify Search page displays products from context
            await waitFor(() => {
                expect(screen.getByText('Search Results')).toBeInTheDocument();
                expect(screen.getByText('Found 2')).toBeInTheDocument();
            });

            // Check if product cards are rendered
            expect(screen.getByText('Dell Laptop')).toBeInTheDocument();
            expect(screen.getByText('HP Laptop')).toBeInTheDocument();
        });
    });

    describe('Navigation Integration', () => {
        test('submit search form → navigate to /search page', async () => {
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: [] });

            renderSearchApp('/');

            // Initially on home page
            expect(screen.getByTestId('location-path')).toHaveTextContent('/');

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'test' } });
            fireEvent.submit(screen.getByRole('search'));

            // Should navigate to /search
            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });
        });

        test('navigation occurs after successful API response', async () => {
            const mockProducts = [{ _id: 'p1', name: 'Product', description: 'Test', price: 100 }];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');

            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'product' } });
            fireEvent.submit(screen.getByRole('search'));

            // Navigation should happen after API call completes
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            });

            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // Results should be displayed
            await waitFor(() => {
                expect(screen.getByText('Product')).toBeInTheDocument();
            });
        });

        test('after navigation, Search page displays products from context state', async () => {
            const mockProducts = [
                { _id: 'p1', name: 'Textbook A', description: 'Math textbook', price: 50 },
                { _id: 'p2', name: 'Textbook B', description: 'Science textbook', price: 60 },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');

            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'textbook' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // Verify products are displayed
            await waitFor(() => {
                expect(screen.getByText('Textbook A')).toBeInTheDocument();
                expect(screen.getByText('Textbook B')).toBeInTheDocument();
                expect(screen.queryAllByText(/Math textbook/).length).toBeGreaterThan(0);
                expect(screen.queryAllByText(/Science textbook/).length).toBeGreaterThan(0);
            });
        });
    });

    describe('Search Results Display', () => {
        test('context has 2 products → render Search component → 2 product cards displayed', async () => {
            const mockProducts = [
                { _id: 'p1', name: 'Product 1', description: 'Description 1', price: 100 },
                { _id: 'p2', name: 'Product 2', description: 'Description 2', price: 200 },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'product' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByText('Found 2')).toBeInTheDocument();
            });

            // Check products are displayed with correct data
            expect(screen.getByText('Product 1')).toBeInTheDocument();
            expect(screen.getByText('Product 2')).toBeInTheDocument();
            expect(screen.queryAllByText(/Description 1/).length).toBeGreaterThan(0);
            expect(screen.queryAllByText(/Description 2/).length).toBeGreaterThan(0);
            expect(screen.getByText('$ 100')).toBeInTheDocument();
            expect(screen.getByText('$ 200')).toBeInTheDocument();
        });

        test('context has 0 products → verify "No Products Found" message displays', async () => {
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: [] });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'nonexistent' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByText('No Products Found')).toBeInTheDocument();
            });

            // Should not have "Found X" text
            expect(screen.queryByText(/Found \d+/)).not.toBeInTheDocument();
        });

        test('context has 5 products → verify count message shows "Found 5"', async () => {
            const mockProducts = [
                { _id: 'p1', name: 'Prod 1', description: 'Desc 1', price: 10 },
                { _id: 'p2', name: 'Prod 2', description: 'Desc 2', price: 20 },
                { _id: 'p3', name: 'Prod 3', description: 'Desc 3', price: 30 },
                { _id: 'p4', name: 'Prod 4', description: 'Desc 4', price: 40 },
                { _id: 'p5', name: 'Prod 5', description: 'Desc 5', price: 50 },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'prod' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByText('Found 5')).toBeInTheDocument();
            });

            // Verify all 5 products are rendered
            for (let i = 1; i <= 5; i++) {
                expect(screen.getByText(`Prod ${i}`)).toBeInTheDocument();
            }
        });
    });

    describe('End-to-End Search Flow', () => {
        test('complete flow: type → submit → API call → context update → navigate → results render', async () => {
            const mockProducts = [
                { _id: 't1', name: 'Math Textbook', description: 'Calculus textbook', price: 75 },
                { _id: 't2', name: 'Physics Textbook', description: 'Quantum physics textbook', price: 85 },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');

            // 1. Type "textbook"
            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'textbook' } });
            expect(screen.getByTestId('context-keyword')).toHaveTextContent('textbook');

            // 2. Submit form
            fireEvent.submit(screen.getByRole('search'));

            // 3. API call to real backend endpoint
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/textbook');
            });

            // 4. Context update
            await waitFor(() => {
                expect(screen.getByTestId('context-results-count')).toHaveTextContent('2');
            });

            // 5. Navigate to /search
            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // 6. Results render on Search page
            await waitFor(() => {
                expect(screen.getByText('Search Results')).toBeInTheDocument();
                expect(screen.getByText('Found 2')).toBeInTheDocument();
                expect(screen.getByText('Math Textbook')).toBeInTheDocument();
                expect(screen.getByText('Physics Textbook')).toBeInTheDocument();
            });
        });

        test('verify displayed products match API response data', async () => {
            const apiResponse = [
                {
                    _id: 'unique-id-1',
                    name: 'Laptop Pro',
                    description: 'Professional laptop for developers',
                    price: 1999,
                    slug: 'laptop-pro',
                },
                {
                    _id: 'unique-id-2',
                    name: 'Laptop Air',
                    description: 'Lightweight laptop for students',
                    price: 1299,
                    slug: 'laptop-air',
                },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: apiResponse });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'laptop' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // Verify displayed products match API response
            const contextData = JSON.parse(screen.getByTestId('context-results-data').textContent);
            expect(contextData).toEqual(apiResponse);

            // Verify rendered content matches API data
            await waitFor(() => {
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
                expect(screen.getByText('Laptop Air')).toBeInTheDocument();
                expect(screen.queryAllByText(/Professional laptop/).length).toBeGreaterThan(0);
                expect(screen.queryAllByText(/Lightweight laptop/).length).toBeGreaterThan(0);
                expect(screen.getByText('$ 1999')).toBeInTheDocument();
                expect(screen.getByText('$ 1299')).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        test('API returns error → context state remains unchanged', async () => {
            // Mock API to fail
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Network error'));

            renderSearchApp('/');

            // Search that will fail
            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'error' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            // Context keyword updates but results should remain unchanged (no navigation)
            expect(screen.getByTestId('context-keyword')).toHaveTextContent('error');
            // Should remain on current page (not navigate)
            expect(screen.getByTestId('location-path')).toHaveTextContent('/');

            consoleSpy.mockRestore();
        });

        test('API returns empty array → context updates to empty and shows "No Products Found"', async () => {
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: [] });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'nothing' } });
            fireEvent.submit(screen.getByRole('search'));

            // Context should update to empty results
            await waitFor(() => {
                expect(screen.getByTestId('context-results-count')).toHaveTextContent('0');
            });

            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/search');
            });

            // Search page should show "No Products Found"
            await waitFor(() => {
                expect(screen.getByText('No Products Found')).toBeInTheDocument();
            });
        });

        test('API error prevents navigation and toast (error logged only)', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Server error'));

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'fail' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            // Should remain on current page (not navigate)
            expect(screen.getByTestId('location-path')).toHaveTextContent('/');

            consoleSpy.mockRestore();
        });
    });

    describe('Product Card Rendering Details', () => {
        test('product cards display with correct structure and buttons', async () => {
            const mockProducts = [
                {
                    _id: 'test-product-1',
                    name: 'Test Product',
                    description: 'This is a test product with a long description',
                    price: 299,
                },
            ];
            jest.spyOn(axios, 'get').mockResolvedValueOnce({ data: mockProducts });

            renderSearchApp('/');
            fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'test' } });
            fireEvent.submit(screen.getByRole('search'));

            await waitFor(() => {
                expect(screen.getByText('Test Product')).toBeInTheDocument();
            });

            // Verify truncated description (substring 0-30)
            expect(screen.queryAllByText(/This is a test product with a/).length).toBeGreaterThan(0);

            // Verify buttons are present
            expect(screen.getByText('More Details')).toBeInTheDocument();
            expect(screen.getByText('ADD TO CART')).toBeInTheDocument();

            // Verify image src
            const image = screen.getByAltText('Test Product');
            expect(image).toHaveAttribute('src', '/api/v1/product/product-photo/test-product-1');
        });
    });
});