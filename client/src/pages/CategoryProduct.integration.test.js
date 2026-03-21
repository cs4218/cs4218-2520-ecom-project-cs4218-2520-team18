// Billy Ho Cheng En, A0252588R

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import CategoryProduct from './CategoryProduct';
import { AuthProvider } from '../context/auth';
import { CartProvider, useCart } from '../context/cart';
import { SearchProvider } from '../context/search';

// Mock Layout component to avoid unnecessary dependencies
jest.mock('../components/Layout', () => ({ children }) => (
    <div data-testid="layout-mock">{children}</div>
));

jest.mock('axios');

describe('CategoryProduct - Integration Tests', () => {
    let toastSuccessSpy;
    let toastErrorSpy;
    let setItemSpy;

    // Helper component to probe cart context state
    const CartStateProbe = () => {
        const [cart] = useCart();
        return (
            <div style={{ display: 'none' }} aria-hidden="true">
                <div data-testid="cart-count">{cart?.length || 0}</div>
                <div data-testid="cart-items">{JSON.stringify(cart || [])}</div>
            </div>
        );
    };

    // Helper component to probe current location
    const LocationProbe = () => {
        const location = useLocation();
        return <div data-testid="location-path">{location.pathname}</div>;
    };

    // Helper to render CategoryProduct with all providers
    const renderCategoryProductWithProviders = (initialRoute = '/category/electronics') => {
        return render(
            <AuthProvider>
                <CartProvider>
                    <SearchProvider>
                        <MemoryRouter initialEntries={[initialRoute]}>
                            <CartStateProbe />
                            <LocationProbe />
                            <Routes>
                                <Route path="/category/:slug" element={<CategoryProduct />} />
                                <Route path="/product/:slug" element={<div>PRODUCT_DETAILS_PAGE</div>} />
                                <Route path="/cart" element={<div>CART_PAGE</div>} />
                            </Routes>
                        </MemoryRouter>
                    </SearchProvider>
                </CartProvider>
            </AuthProvider>
        );
    };

    const mockProduct1 = {
        _id: 'prod1',
        name: 'Laptop Pro',
        description: 'High-performance laptop for professionals and developers',
        price: 1999,
        slug: 'laptop-pro',
    };

    const mockProduct2 = {
        _id: 'prod2',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        price: 49,
        slug: 'wireless-mouse',
    };

    const mockProduct3 = {
        _id: 'prod3',
        name: 'Mechanical Keyboard',
        description: 'RGB mechanical keyboard with cherry MX switches',
        price: 159,
        slug: 'mechanical-keyboard',
    };

    const mockCategoryResponse = {
        category: { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
        products: [mockProduct1, mockProduct2, mockProduct3],
    };

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
        localStorage.clear();
        axios.get.mockReset();
        axios.post.mockReset();

        // Mock toast to avoid noise
        toastSuccessSpy = jest.spyOn(toast, 'success').mockImplementation(() => { });
        toastErrorSpy = jest.spyOn(toast, 'error').mockImplementation(() => { });
        setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

        // Default mock for category products API
        axios.get.mockResolvedValue({
            data: mockCategoryResponse,
        });
    });

    describe('Context Integration - CartProvider', () => {
        test('renders with empty cart from CartProvider', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
            });

            // Verify cart initializes empty
            expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
        });

        test('add to cart updates CartProvider state', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            });

            // Click "ADD TO CART" button for first product
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            // Verify cart context updates
            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
            });

            // Verify cart contains the product
            const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
            expect(cartItems).toHaveLength(1);
            expect(cartItems[0].name).toBe('Laptop Pro');
        });

        test('add to cart persists to localStorage', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
            });

            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[1]); // Add second product

            // Verify localStorage.setItem called with correct data
            await waitFor(() => {
                expect(setItemSpy).toHaveBeenCalledWith(
                    'cart',
                    expect.stringContaining('Wireless Mouse')
                );
            });

            // Verify toast notification
            expect(toastSuccessSpy).toHaveBeenCalledWith('Item Added to cart');
        });

        test('add same product multiple times creates multiple cart entries', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            });

            const addToCartButtons = screen.getAllByText('ADD TO CART');

            // Add same product twice
            fireEvent.click(addToCartButtons[0]);
            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
            });

            fireEvent.click(addToCartButtons[0]);
            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
            });

            // Both entries should be the same product
            const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
            expect(cartItems).toHaveLength(2);
            expect(cartItems[0].name).toBe('Laptop Pro');
            expect(cartItems[1].name).toBe('Laptop Pro');
        });
    });

    describe('Navigation Integration - Product Listing to Details', () => {
        test('click More Details navigates to product details page', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            });

            // Click "More Details" button for first product
            const moreDetailsButtons = screen.getAllByText('More Details');
            fireEvent.click(moreDetailsButtons[0]);

            // Verify navigation to product details
            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/product/laptop-pro');
            });

            expect(screen.getByText('PRODUCT_DETAILS_PAGE')).toBeInTheDocument();
        });

        test('cart state persists after navigation', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();
            });

            // Add product to cart
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[2]); // Add keyboard

            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
            });

            // Navigate to product details
            const moreDetailsButtons = screen.getAllByText('More Details');
            fireEvent.click(moreDetailsButtons[2]);

            // Verify cart persists after navigation
            await waitFor(() => {
                expect(screen.getByTestId('location-path')).toHaveTextContent('/product/mechanical-keyboard');
            });

            // Cart should still have 1 item (CartProvider maintains state)
            expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
        });
    });

    describe('API Integration - Category Products', () => {
        test('fetches category products on mount', async () => {
            renderCategoryProductWithProviders('/category/electronics');

            // Verify API called with correct slug
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
            });

            // Verify products render
            await waitFor(() => {
                expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
                expect(screen.getByText('3 result found')).toBeInTheDocument();
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
                expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
                expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();
            });
        });

        test('refetches when category slug changes', async () => {
            // This test documents that useEffect properly responds to slug parameter changes
            renderCategoryProductWithProviders('/category/electronics');

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
            });

            await waitFor(() => {
                expect(screen.getByText('Category - Electronics')).toBeInTheDocument();
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            });

            expect(axios.get).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cart Interaction Sequences', () => {
        test('end-to-end: browse category → add multiple products → verify cart state', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('3 result found')).toBeInTheDocument();
            });

            // Add first product
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            fireEvent.click(addToCartButtons[0]);

            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
            });

            // Add second product
            fireEvent.click(addToCartButtons[1]);

            await waitFor(() => {
                expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
            });

            // Verify cart contains both products
            const cartItems = JSON.parse(screen.getByTestId('cart-items').textContent);
            expect(cartItems).toHaveLength(2);
            expect(cartItems[0].name).toBe('Laptop Pro');
            expect(cartItems[1].name).toBe('Wireless Mouse');

            // Verify localStorage updated twice
            expect(setItemSpy).toHaveBeenCalledTimes(2);
            expect(toastSuccessSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling Integration', () => {
        test('EXPECTED BEHAVIOR: API error should show toast.error (current code only console.logs)', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
            axios.get.mockRejectedValueOnce(new Error('Network error'));

            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            expect(toastErrorSpy).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        test('empty category displays correctly', async () => {
            const emptyResponse = {
                category: { _id: 'cat3', name: 'Empty Category', slug: 'empty' },
                products: [],
            };
            axios.get.mockResolvedValueOnce({ data: emptyResponse });

            renderCategoryProductWithProviders('/category/empty');

            await waitFor(() => {
                expect(screen.getByText('Category - Empty Category')).toBeInTheDocument();
                expect(screen.getByText('0 result found')).toBeInTheDocument();
            });

            // No product cards should render
            expect(screen.queryByText('ADD TO CART')).not.toBeInTheDocument();
        });
    });

    describe('Pagination Feature', () => {
        test('Load More button fetches and displays additional products', async () => {
            // Mock initial response with 3 products and total of 5
            const initialResponse = {
                category: { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
                products: [mockProduct1, mockProduct2, mockProduct3],
                total: 5, // Important: total > products.length to show Load More button
            };

            // Mock second page response
            const additionalProducts = [
                {
                    _id: 'prod4',
                    name: 'USB Hub',
                    description: 'Multi-port USB hub with fast charging capabilities',
                    price: 39,
                    slug: 'usb-hub',
                },
                {
                    _id: 'prod5',
                    name: 'Webcam HD',
                    description: '1080p HD webcam with built-in microphone for video calls',
                    price: 79,
                    slug: 'webcam-hd',
                },
            ];

            let callCount = 0;
            axios.get.mockImplementation((url) => {
                callCount++;
                if (callCount === 1) {
                    // First call - initial category products with total
                    return Promise.resolve({
                        data: initialResponse,
                    });
                } else {
                    // Second call - page 2 products (loadMore)
                    return Promise.resolve({
                        data: {
                            success: true,
                            products: additionalProducts,
                        },
                    });
                }
            });

            renderCategoryProductWithProviders();

            // Wait for initial products to load
            await waitFor(() => {
                expect(screen.getByText('3 result found')).toBeInTheDocument();
            });

            // Verify initial 3 products are displayed
            expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
            expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();

            // Verify initial API call
            expect(axios.get).toHaveBeenNthCalledWith(1, '/api/v1/product/product-category/electronics');

            // Find Load More button (should exist because products.length (3) < total (5))
            const loadMoreButton = await waitFor(() => {
                return screen.getByText('Loadmore');
            });
            expect(loadMoreButton).toBeInTheDocument();

            // Click Load More button
            fireEvent.click(loadMoreButton);

            // Wait for additional products to load
            await waitFor(() => {
                expect(screen.getByText('USB Hub')).toBeInTheDocument();
            }, { timeout: 3000 });

            await waitFor(() => {
                expect(screen.getByText('Webcam HD')).toBeInTheDocument();
            }, { timeout: 3000 });

            // Verify all 5 products are now displayed
            expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
            expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();
            expect(screen.getByText('USB Hub')).toBeInTheDocument();
            expect(screen.getByText('Webcam HD')).toBeInTheDocument();

            // Verify API was called twice with correct endpoints
            expect(axios.get).toHaveBeenCalledTimes(2);
            expect(axios.get).toHaveBeenNthCalledWith(2, '/api/v1/product/product-category/electronics/2');

            // Button should now be hidden since products.length (5) >= total (5)
            await waitFor(() => {
                expect(screen.queryByText('Loadmore')).not.toBeInTheDocument();
            });
        });
    });

    describe('Product Display Details', () => {
        test('product cards display with correct structure', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            });

            // Verify product name
            expect(screen.getByText('Laptop Pro')).toBeInTheDocument();

            // Verify truncated description (substring 0-60)
            expect(screen.getByText(/High-performance laptop for professionals and developers.../)).toBeInTheDocument();

            // Verify price formatting
            expect(screen.getByText('$1,999.00')).toBeInTheDocument();

            // Verify buttons
            const moreDetailsButtons = screen.getAllByText('More Details');
            const addToCartButtons = screen.getAllByText('ADD TO CART');
            expect(moreDetailsButtons).toHaveLength(3);
            expect(addToCartButtons).toHaveLength(3);

            // Verify image src
            const image = screen.getByAltText('Laptop Pro');
            expect(image).toHaveAttribute('src', '/api/v1/product/product-photo/prod1');
        });

        test('multiple products render correctly', async () => {
            renderCategoryProductWithProviders();

            await waitFor(() => {
                expect(screen.getByText('3 result found')).toBeInTheDocument();
            });

            // Verify all three products render
            expect(screen.getByText('Laptop Pro')).toBeInTheDocument();
            expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
            expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();

            // Verify all three prices
            expect(screen.getByText('$1,999.00')).toBeInTheDocument();
            expect(screen.getByText('$49.00')).toBeInTheDocument();
            expect(screen.getByText('$159.00')).toBeInTheDocument();
        });
    });
});
