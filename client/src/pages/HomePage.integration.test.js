// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import HomePage from './HomePage';

jest.mock('../context/cart', () => ({
  useCart: () => [[], jest.fn()],
}));
jest.mock('../context/auth', () => ({
  useAuth: () => [null, jest.fn()],
}));
jest.mock('../hooks/useCategory', () => ({
  __esModule: true,
  default: () => [],
}));
jest.mock('../context/search', () => ({
  __esModule: true,
  useSearch: () => [{ keyword: '', results: [] }, jest.fn()],
  SearchProvider: ({ children }) => <div>{children}</div>,
}));

jest.mock('axios');
jest.mock('react-hot-toast', () => {
  const actual = jest.requireActual('react');
  const success = jest.fn();
  const Toaster = () =>
    actual.createElement('div', { 'data-testid': 'toaster' });
  return {
    __esModule: true,
    default: { success },
    success,
    Toaster,
  };
});

const mockCategories = [
  { _id: 'cat1', name: 'Category 1' },
  { _id: 'cat2', name: 'Category 2' },
];
const mockProducts = [
  {
    _id: 'prod1',
    name: 'Product 1',
    price: 100,
    description: 'Desc',
    slug: 'product-1',
  },
  {
    _id: 'prod2',
    name: 'Product 2',
    price: 200,
    description: 'Desc',
    slug: 'product-2',
  },
];

beforeEach(() => {
  axios.get.mockImplementation((url) => {
    if (url.includes('get-category')) {
      return Promise.resolve({
        data: { success: true, category: mockCategories },
      });
    }
    if (url.includes('product-list')) {
      return Promise.resolve({ data: { products: mockProducts } });
    }
    if (url.includes('product-count')) {
      return Promise.resolve({ data: { total: 10 } });
    }
    return Promise.resolve({ data: {} });
  });
  axios.post.mockResolvedValue({ data: { products: mockProducts } });
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderPage = () =>
  render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>,
  );

test('renders categories and products from API', async () => {
  renderPage();

  expect(await screen.findByText('Category 1')).toBeInTheDocument();
  expect(await screen.findByText('Product 1')).toBeInTheDocument();
});

test('filters products by category', async () => {
  renderPage();
  const categoryCheckbox = await screen.findByRole('checkbox', {
    name: /category 1/i,
  });
  fireEvent.click(categoryCheckbox);
  await screen.findByText('Product 1');
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('product-filters'),
    expect.objectContaining({ checked: ['cat1'] }),
  );
});

test('adds product to cart and shows toast', async () => {
  renderPage();
  const addButton = await screen.findAllByText('ADD TO CART');
  fireEvent.click(addButton[0]);
  expect(toast.success).toHaveBeenCalledWith('Item Added to cart');
  expect(localStorage.getItem('cart')).toContain('Product 1');
});

test('navigates to product details', async () => {
  renderPage();
  const detailsButton = await screen.findAllByText('More Details');
  fireEvent.click(detailsButton[0]);
});

test('loads more products on button click', async () => {
  renderPage();
  const loadMoreButton = await screen.findByText('Loadmore');
  fireEvent.click(loadMoreButton);
  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('product-list/2'),
  );
});
