import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import axios from 'axios';
import CategoryProduct from './CategoryProduct';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  useParams: jest.fn(),
  useNavigate: jest.fn(),
}));

jest.mock('../components/Layout', () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>
}));

import { useParams, useNavigate } from 'react-router-dom';

describe('CategoryProduct Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrductsByCat function', () => {
    it('should fetch products when slug param exists', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics' };
      const mockProducts = [
        {
          _id: 'prod1',
          name: 'Laptop',
          description: 'High performance laptop',
          price: 999.99,
          slug: 'laptop'
        }
      ];
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory, products: mockProducts }
      });

      // Act
      render(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should not fetch products when slug param is missing', () => {
      // Arrange
      useParams.mockReturnValue({ slug: null });

      // Act
      render(<CategoryProduct />);

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should not fetch products when slug param is undefined', () => {
      // Arrange
      useParams.mockReturnValue({});

      // Act
      render(<CategoryProduct />);

      // Assert
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('should handle error when fetching products fails', async () => {
      // Arrange
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const error = new Error('Network error');
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockRejectedValueOnce(error);

      // Act
      render(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(consoleLogSpy).toHaveBeenCalledWith(error);
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Category display', () => {
    it('should display category name when data is loaded', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics' };
      const mockProducts = [];
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory, products: mockProducts }
      });

      // Act
      render(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Category - Electronics/i)).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should display product count when data is loaded', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics' };
      const mockProducts = [
        { _id: 'prod1', name: 'Product 1', description: 'Desc 1', price: 100, slug: 'prod-1' },
        { _id: 'prod2', name: 'Product 2', description: 'Desc 2', price: 200, slug: 'prod-2' }
      ];
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory, products: mockProducts }
      });

      // Act
      render(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/2 result found/i)).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });

    it('should display product names when products are loaded', async () => {
      // Arrange
      const mockCategory = { _id: 'cat1', name: 'Electronics' };
      const mockProducts = [
        {
          _id: 'prod1',
          name: 'Gaming Laptop',
          description: 'High performance gaming laptop',
          price: 1299.99,
          slug: 'gaming-laptop'
        }
      ];
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory, products: mockProducts }
      });

      // Act
      render(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Gaming Laptop')).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate when "More Details" is clicked', async () => {
      // Arrange
      const mockNavigate = jest.fn();
      useNavigate.mockReturnValue(mockNavigate);

      const mockCategory = { _id: 'cat1', name: 'Electronics' };
      const mockProducts = [
        {
          _id: 'prod1',
          name: 'Laptop',
          description: 'Great laptop for programming and gaming',
          price: 1299.99,
          slug: 'laptop-slug'
        }
      ];
      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory, products: mockProducts }
      });

      // Act
      const { getByText } = render(<CategoryProduct />);

      await waitFor(() => {
        expect(screen.getByText('Laptop')).toBeTruthy();
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      const moreDetailsButton = getByText('More Details');
      moreDetailsButton.click();

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('/product/laptop-slug');
    });
  });

  describe('useEffect dependencies', () => {
    it('should refetch products when slug param changes', async () => {
      // Arrange
      const mockCategory1 = { _id: 'cat1', name: 'Electronics' };
      const mockProducts1 = [
        { _id: 'prod1', name: 'Product 1', description: 'Desc 1', price: 100, slug: 'prod-1' }
      ];
      const mockCategory2 = { _id: 'cat2', name: 'Books' };
      const mockProducts2 = [
        { _id: 'prod2', name: 'Product 2', description: 'Desc 2', price: 20, slug: 'prod-2' }
      ];

      useParams.mockReturnValue({ slug: 'electronics' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory1, products: mockProducts1 }
      });

      // Act
      const { rerender } = render(<CategoryProduct />);

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/electronics');
        expect(axios.get).toHaveBeenCalledTimes(1);
      });

      useParams.mockReturnValue({ slug: 'books' });
      axios.get.mockResolvedValueOnce({
        data: { category: mockCategory2, products: mockProducts2 }
      });

      rerender(<CategoryProduct />);

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith('/api/v1/product/product-category/books');
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });
});
