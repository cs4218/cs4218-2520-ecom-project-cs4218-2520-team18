// Aw Jean Leng Adrian, A0277537N

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Search from './Search';
import { useSearch } from '../context/search';

// Mock dependencies
jest.mock('../context/search');
jest.mock('../components/Layout', () => {
    return function Layout({ children, title }) {
        return (
            <div data-testid="layout" data-title={title}>
                {children}
            </div>
        );
    };
});

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Search Component', () => {
    const mockSetValues = jest.fn();

    // Using real test product data
    const mockProducts = [
        {
            _id: '66db427fdb0119d9234b27f1',
            name: 'Textbook',
            description: 'A comprehensive textbook for students',
            price: 79.99,
        },
        {
            _id: 'prod2',
            name: 'Wireless Mouse',
            description: 'Ergonomic wireless mouse with precision tracking',
            price: 49,
        },
        {
            _id: 'prod3',
            name: 'Mechanical Keyboard',
            description: 'RGB mechanical keyboard with cherry MX switches',
            price: 129,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Rendering Tests
    describe('Component Rendering', () => {
        test('should render with Layout and correct title', () => {
            useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

            renderWithRouter(<Search />);

            expect(screen.getByTestId('layout')).toBeInTheDocument();
            expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'Search results');
        });

        test('should render heading', () => {
            useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Search Resuts')).toBeInTheDocument();
        });

        test('should have correct container structure', () => {
            useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

            const { container } = renderWithRouter(<Search />);

            expect(container.querySelector('.container')).toBeInTheDocument();
            expect(container.querySelector('.text-center')).toBeInTheDocument();
        });
    });

    // Empty State Tests
    describe('Empty State', () => {
        test('should display "No Products Found" when results are empty', () => {
            useSearch.mockReturnValue([{ keyword: 'laptop', results: [] }, mockSetValues]);

            renderWithRouter(<Search />);

            expect(screen.getByText('No Products Found')).toBeInTheDocument();
        });

        test('should not display product cards when no results', () => {
            useSearch.mockReturnValue([{ keyword: '', results: [] }, mockSetValues]);

            const { container } = renderWithRouter(<Search />);

            expect(container.querySelectorAll('.card')).toHaveLength(0);
        });
    });

    // Product Display Tests
    describe('Product Display', () => {
        test('should display correct count of products found', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Found 3')).toBeInTheDocument();
        });

        test('should render all product cards', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            const { container } = renderWithRouter(<Search />);

            const cards = container.querySelectorAll('.card');
            expect(cards).toHaveLength(3);
        });

        test('should display product names', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Textbook')).toBeInTheDocument();
            expect(screen.getByText('Wireless Mouse')).toBeInTheDocument();
            expect(screen.getByText('Mechanical Keyboard')).toBeInTheDocument();
        });

        test('should display truncated descriptions (30 chars)', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('A comprehensive textbook for s...')).toBeInTheDocument();
            expect(screen.getByText('Ergonomic wireless mouse with ...')).toBeInTheDocument();
        });

        test('should display product prices with dollar sign', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('$ 79.99')).toBeInTheDocument();
            expect(screen.getByText('$ 49')).toBeInTheDocument();
            expect(screen.getByText('$ 129')).toBeInTheDocument();
        });

        test('should display product images with correct src and alt', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            const images = screen.getAllByRole('img');
            expect(images).toHaveLength(3);
            expect(images[0]).toHaveAttribute('src', '/api/v1/product/product-photo/66db427fdb0119d9234b27f1');
            expect(images[0]).toHaveAttribute('alt', 'Textbook');
            expect(images[1]).toHaveAttribute('src', '/api/v1/product/product-photo/prod2');
            expect(images[1]).toHaveAttribute('alt', 'Wireless Mouse');
        });

        test('should display action buttons for each product', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            const moreDetailsButtons = screen.getAllByText('More Details');
            const addToCartButtons = screen.getAllByText('ADD TO CART');

            expect(moreDetailsButtons).toHaveLength(3);
            expect(addToCartButtons).toHaveLength(3);
        });

        test('should have correct button classes', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [mockProducts[0]] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            const moreDetailsBtn = screen.getByText('More Details');
            const addToCartBtn = screen.getByText('ADD TO CART');

            expect(moreDetailsBtn).toHaveClass('btn', 'btn-primary', 'ms-1');
            expect(addToCartBtn).toHaveClass('btn', 'btn-secondary', 'ms-1');
        });
    });

    // Count Message Tests
    describe('Count Messages', () => {
        test('should display "Found 1" for single product', () => {
            useSearch.mockReturnValue([
                { keyword: 'mouse', results: [mockProducts[1]] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Found 1')).toBeInTheDocument();
        });

        test('should display "Found 2" for two products', () => {
            useSearch.mockReturnValue([
                { keyword: 'gaming', results: [mockProducts[0], mockProducts[2]] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Found 2')).toBeInTheDocument();
        });

        test('should not display "No Products Found" when products exist', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: mockProducts },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.queryByText('No Products Found')).not.toBeInTheDocument();
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        test('should handle product with very long description', () => {
            const longDescProduct = {
                _id: 'prod4',
                name: 'Test Product',
                description: 'This is a very long description that should be truncated to exactly 30 characters and then have ellipsis added',
                price: 99,
            };

            useSearch.mockReturnValue([
                { keyword: 'test', results: [longDescProduct] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('This is a very long descriptio...')).toBeInTheDocument();
        });

        test('should handle product with short description', () => {
            const shortDescProduct = {
                _id: 'prod5',
                name: 'Short Desc Product',
                description: 'Short',
                price: 10,
            };

            useSearch.mockReturnValue([
                { keyword: 'test', results: [shortDescProduct] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Short...')).toBeInTheDocument();
        });

        test('should handle product with zero price', () => {
            const freeProduct = {
                _id: 'prod6',
                name: 'Free Product',
                description: 'This product is free',
                price: 0,
            };

            useSearch.mockReturnValue([
                { keyword: 'free', results: [freeProduct] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('$ 0')).toBeInTheDocument();
        });

        test('should handle product with decimal price', () => {
            useSearch.mockReturnValue([
                { keyword: 'textbook', results: [mockProducts[0]] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('$ 79.99')).toBeInTheDocument();
        });

        test('should handle products with special characters in name', () => {
            const specialCharProduct = {
                _id: 'prod8',
                name: 'Product & Special "Chars"',
                description: 'Product with special characters',
                price: 50,
            };

            useSearch.mockReturnValue([
                { keyword: 'special', results: [specialCharProduct] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            expect(screen.getByText('Product & Special "Chars"')).toBeInTheDocument();
        });

        test('should handle large number of products', () => {
            const manyProducts = Array.from({ length: 50 }, (_, i) => ({
                _id: `prod${i}`,
                name: `Product ${i}`,
                description: `Description for product ${i}`,
                price: i * 10,
            }));

            useSearch.mockReturnValue([
                { keyword: 'product', results: manyProducts },
                mockSetValues,
            ]);

            const { container } = renderWithRouter(<Search />);

            expect(screen.getByText('Found 50')).toBeInTheDocument();
            expect(container.querySelectorAll('.card')).toHaveLength(50);
        });
    });

    // Layout Structure Tests
    describe('Layout Structure', () => {
        test('should have flex-wrap container for products', () => {
            useSearch.mockReturnValue([
                { keyword: 'test', results: mockProducts },
                mockSetValues,
            ]);

            const { container } = renderWithRouter(<Search />);

            const flexContainer = container.querySelector('.d-flex.flex-wrap');
            expect(flexContainer).toBeInTheDocument();
            expect(flexContainer).toHaveClass('mt-4');
        });

        test('should have correct card styling', () => {
            useSearch.mockReturnValue([
                { keyword: 'test', results: [mockProducts[0]] },
                mockSetValues,
            ]);

            const { container } = renderWithRouter(<Search />);

            const card = container.querySelector('.card');
            expect(card).toHaveClass('m-2');
            expect(card).toHaveStyle({ width: '18rem' });
        });

        test('should have card-img-top class on images', () => {
            useSearch.mockReturnValue([
                { keyword: 'test', results: [mockProducts[0]] },
                mockSetValues,
            ]);

            renderWithRouter(<Search />);

            const image = screen.getByRole('img');
            expect(image).toHaveClass('card-img-top');
        });

        test('should have card-body with correct structure', () => {
            useSearch.mockReturnValue([
                { keyword: 'test', results: [mockProducts[0]] },
                mockSetValues,
            ]);

            const { container } = renderWithRouter(<Search />);

            const cardBody = container.querySelector('.card-body');
            expect(cardBody).toBeInTheDocument();

            const title = cardBody.querySelector('.card-title');
            const texts = cardBody.querySelectorAll('.card-text');

            expect(title).toBeInTheDocument();
            expect(texts).toHaveLength(2);
        });
    });
});
