// Billy Ho, A0252588R

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import ProductDetails from './ProductDetails';

// Mock dependencies
jest.mock('axios');
jest.mock('react-router-dom', () => ({
    useParams: jest.fn(),
    useNavigate: jest.fn(),
}));

// Mock Layout component to isolate ProductDetails
jest.mock('../components/Layout', () => ({
    __esModule: true,
    default: ({ children }) => <div data-testid="layout">{children}</div>
}));

import { useParams, useNavigate } from 'react-router-dom';

describe('ProductDetails Page', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Component rendering', () => {
        it('should render without React warnings or errors', async () => {
            // Arrange
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const mockProduct = {
                _id: '123',
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99,
                category: { _id: 'cat123', name: 'Test Category' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(/Product Details/i)).toBeInTheDocument();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
            expect(consoleErrorSpy).not.toHaveBeenCalled();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('getProduct function', () => {
        it('should fetch product when slug param exists', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Test Product',
                description: 'Test Description',
                price: 99.99,
                category: { _id: 'cat123', name: 'Test Category' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/test-product');
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should not fetch product when slug param is missing', () => {
            // Arrange
            useParams.mockReturnValue({ slug: null });

            // Act
            render(<ProductDetails />);

            // Assert
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('should not fetch product when slug param is undefined', () => {
            // Arrange
            useParams.mockReturnValue({});

            // Act
            render(<ProductDetails />);

            // Assert
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('should handle error when fetching product fails', async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const error = new Error('API error');
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockRejectedValueOnce(error);

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
                expect(axios.get).toHaveBeenCalledTimes(1);
            });

            consoleLogSpy.mockRestore();
        });
    });

    describe('getSimilarProduct function', () => {
        it('should fetch similar products with correct URL format', async () => {
            // Arrange
            const mockProduct = {
                _id: 'prod789',
                name: 'Main Product',
                category: { _id: 'cat999' }
            };
            useParams.mockReturnValue({ slug: 'main-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/related-product/prod789/cat999');
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should handle error when fetching similar products fails', async () => {
            // Arrange
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            const error = new Error('API error');
            const mockProduct = {
                _id: 'prod123',
                category: { _id: 'cat123' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockRejectedValueOnce(error);

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(error);
                expect(axios.get).toHaveBeenCalledTimes(2);
            });

            consoleLogSpy.mockRestore();
        });
    });

    describe('Product display', () => {
        it('should display product name when product data is loaded', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Gaming Laptop',
                description: 'High performance laptop',
                price: 1299.99,
                category: { _id: 'cat1', name: 'Electronics' }
            };
            useParams.mockReturnValue({ slug: 'gaming-laptop' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(/Name : Gaming Laptop/i)).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should display product description when product data is loaded', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Test Product',
                description: 'Amazing product description',
                price: 99.99,
                category: { _id: 'cat1', name: 'Category' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(/Description : Amazing product description/i)).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should display category name when product data is loaded', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Test Product',
                description: 'Description',
                price: 50,
                category: { _id: 'cat1', name: 'Electronics' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText(/Category : Electronics/i)).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Similar products display', () => {
        it('should display "No Similar Products found" when relatedProducts is empty', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Test Product',
                category: { _id: 'cat1' }
            };
            useParams.mockReturnValue({ slug: 'test-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('No Similar Products found')).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should not display "No Similar Products found" when relatedProducts has items', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Main Product',
                category: { _id: 'cat1' }
            };
            const mockRelatedProducts = [
                {
                    _id: '456',
                    name: 'Related Product 1',
                    description: 'Related description',
                    price: 49.99,
                    slug: 'related-1'
                }
            ];
            useParams.mockReturnValue({ slug: 'main-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: mockRelatedProducts }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.queryByText('No Similar Products found')).toBeNull();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });

        it('should display related product names when available', async () => {
            // Arrange
            const mockProduct = {
                _id: '123',
                name: 'Main Product',
                category: { _id: 'cat1' }
            };
            const mockRelatedProducts = [
                {
                    _id: '456',
                    name: 'Similar Product',
                    description: 'This is a similar product description',
                    price: 29.99,
                    slug: 'similar-product'
                }
            ];
            useParams.mockReturnValue({ slug: 'main-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: mockRelatedProducts }
            });

            // Act
            render(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(screen.getByText('Similar Product')).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Navigation', () => {
        it('should navigate to correct product page when "More Details" is clicked', async () => {
            // Arrange
            const mockNavigate = jest.fn();
            useNavigate.mockReturnValue(mockNavigate);

            const mockProduct = {
                _id: '123',
                name: 'Main Product',
                category: { _id: 'cat1' }
            };
            const mockRelatedProducts = [
                {
                    _id: '456',
                    name: 'Related Product',
                    description: 'Related description goes here and it is quite long',
                    price: 29.99,
                    slug: 'related-product-slug'
                }
            ];
            useParams.mockReturnValue({ slug: 'main-product' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: mockRelatedProducts }
            });

            // Act
            const { getByText } = render(<ProductDetails />);
            await waitFor(() => {
                expect(screen.getByText('Related Product')).toBeTruthy();
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
            const moreDetailsButton = getByText('More Details');
            moreDetailsButton.click();

            // Assert
            expect(mockNavigate).toHaveBeenCalledWith('/product/related-product-slug');
        });
    });

    describe('useEffect dependencies', () => {
        it('should refetch product when slug param changes', async () => {
            // Arrange
            const mockProduct1 = {
                _id: '123',
                name: 'Product 1',
                category: { _id: 'cat1' }
            };
            const mockProduct2 = {
                _id: '456',
                name: 'Product 2',
                category: { _id: 'cat2' }
            };

            useParams.mockReturnValue({ slug: 'product-1' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct1 }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            // Act
            const { rerender } = render(<ProductDetails />);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/product-1');
                expect(axios.get).toHaveBeenCalledTimes(2);
            });

            useParams.mockReturnValue({ slug: 'product-2' });
            axios.get.mockResolvedValueOnce({
                data: { product: mockProduct2 }
            });
            axios.get.mockResolvedValueOnce({
                data: { products: [] }
            });

            rerender(<ProductDetails />);

            // Assert
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/get-product/product-2');
                expect(axios.get).toHaveBeenCalledTimes(4);
            });
        });
    });
});
