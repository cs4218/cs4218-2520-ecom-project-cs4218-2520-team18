// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from './HomePage';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import { __setCartMock as setCartMock } from '../context/cart';
import { __navigateMock as navigateMock } from 'react-router-dom';

jest.mock('../components/Layout', () => ({ children, title }) => (
  <div data-testid="layout">
    <h1>{title}</h1>
    {children}
  </div>
));

jest.mock('@ant-design/icons', () => ({
  ReloadOutlined: () => <span data-testid="reload-icon" />,
}));

jest.mock('../components/Prices', () => ({
  Prices: [{ _id: '1', name: '$0 to $50', array: [0, 50] }],
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));

jest.mock('axios');

jest.mock('../context/cart', () => {
  const setCartMock = jest.fn();
  return {
    useCart: () => [[], setCartMock],
    __setCartMock: setCartMock,
  };
});

jest.mock('react-router-dom', () => {
  const navigateMock = jest.fn();
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => navigateMock,
    __navigateMock: navigateMock,
  };
});

const renderPage = async () => {
  render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>,
  );

  await screen.findByText(/Filter By Category/i);
};

describe('HomePage Component - Full Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({ data: { success: true, category: [] } });
      }
      if (url.includes('/api/v1/product/product-count')) {
        return Promise.resolve({ data: { total: 0 } });
      }
      if (url.includes('/api/v1/product/product-list')) {
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockResolvedValue({ data: { products: [] } });
  });

  test('renders homepage layout, banner, and initial data', async () => {
    await renderPage();

    await screen.findByTestId('layout');
    await screen.findByAltText('bannerimage');
    await screen.findByText(/Filter By Category/i);
  });

  test('fetches and displays categories and products', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: 'c1', name: 'Electronics' }],
          },
        });
      }
      if (url.includes('/api/v1/product/product-list')) {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: 'p1',
                name: 'Laptop',
                price: 999,
                description: 'Best laptop',
                slug: 'laptop',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { total: 1 } });
    });

    await renderPage();

    expect(await screen.findByText('Electronics')).toBeInTheDocument();
    expect(await screen.findByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('$999.00')).toBeInTheDocument();
  });

  test('does not call getAllProducts when both filters are selected', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: 'c1', name: 'Electronics' }],
          },
        });
      }
      return Promise.resolve({ data: { total: 1, products: [] } });
    });

    await renderPage();

    const checkbox = await screen.findByLabelText('Electronics');
    const radio = screen.getByLabelText('$0 to $50');

    jest.clearAllMocks();

    fireEvent.click(checkbox);

    fireEvent.click(radio);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/product-filters',
        expect.objectContaining({
          checked: ['c1'],
          radio: [0, 50],
        }),
      );
    });

    const getCalls = axios.get.mock.calls.filter((call) =>
      call[0].includes('/api/v1/product/product-list'),
    );

    expect(getCalls.length).toBeLessThanOrEqual(1);
  });

  test('triggers filter update when category checkbox is clicked', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: 'c1', name: 'Electronics' }],
          },
        });
      }
      return Promise.resolve({ data: { total: 0, products: [] } });
    });

    await renderPage();

    const checkbox = await screen.findByLabelText('Electronics');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/product-filters',
        {
          checked: ['c1'],
          radio: [],
        },
      );
    });
  });

  test('logs error when filterProduct API call fails', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: 'c1', name: 'Electronics' }],
          },
        });
      }
      return Promise.resolve({ data: { total: 0, products: [] } });
    });

    axios.post.mockRejectedValueOnce(new Error('Filter API failed'));

    await renderPage();

    const checkbox = await screen.findByLabelText('Electronics');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('removes category ID from filter when checkbox is unchecked (handleFilter else branch)', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/category/get-category')) {
        return Promise.resolve({
          data: {
            success: true,
            category: [{ _id: 'c1', name: 'Electronics' }],
          },
        });
      }
      return Promise.resolve({ data: { total: 0, products: [] } });
    });

    await renderPage();

    const categoryOption = await screen.findByText('Electronics');

    fireEvent.click(categoryOption);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/product-filters',
        expect.objectContaining({ checked: ['c1'] }),
      );
    });

    fireEvent.click(categoryOption);

    await waitFor(() => {
      const postCalledWithEmpty = axios.post.mock.calls.some(
        (call) => call[1].checked.length === 0,
      );
      const getCalledAsFallback = axios.get.mock.calls.some((call) =>
        call[0].includes('/api/v1/product/product-list'),
      );

      expect(postCalledWithEmpty || getCalledAsFallback).toBe(true);
    });
  });

  test('triggers filter update when price radio is clicked', async () => {
    await renderPage();
    const radio = screen.getByLabelText('$0 to $50');
    fireEvent.click(radio);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/product-filters',
        {
          checked: [],
          radio: [0, 50],
        },
      );
    });
  });

  test('increments page and loads more products', async () => {
    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({
        data: {
          products: [
            { _id: 'p1', name: 'P1', price: 1, description: 'D1', slug: 's1' },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          products: [
            { _id: 'p2', name: 'P2', price: 2, description: 'D2', slug: 's2' },
          ],
        },
      });

    await renderPage();

    await screen.findByText('P1');

    const loadMoreBtn = screen.getByText(/Loadmore/i);
    fireEvent.click(loadMoreBtn);

    expect(await screen.findByText('P2')).toBeInTheDocument();
    expect(await screen.findByText('P1')).toBeInTheDocument();
  });

  test('handles error when loading more products', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get
      .mockResolvedValueOnce({ data: { success: true, category: [] } })
      .mockResolvedValueOnce({ data: { total: 2 } })
      .mockResolvedValueOnce({
        data: {
          products: [
            { _id: 'p1', name: 'P1', price: 1, description: 'D1', slug: 's1' },
          ],
        },
      })
      .mockRejectedValueOnce(new Error('Load more failed'));

    await renderPage();

    await screen.findByText('P1');

    fireEvent.click(screen.getByText(/Loadmore/i));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  test('adds product to cart and updates localStorage', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/product/product-list')) {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: 'p1',
                name: 'Test Product',
                price: 10,
                description: 'Test desc',
                slug: 'test',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { total: 1, category: [] } });
    });

    await renderPage();

    const cartBtn = await screen.findByText('ADD TO CART');
    fireEvent.click(cartBtn);

    expect(setCartMock).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('Item Added to cart');

    const savedCart = JSON.parse(localStorage.getItem('cart'));
    expect(savedCart[0].name).toBe('Test Product');
  });

  test('navigates to product detail page', async () => {
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/v1/product/product-list')) {
        return Promise.resolve({
          data: {
            products: [
              {
                _id: 'p1',
                name: 'Detail Item',
                price: 5,
                description: 'Desc',
                slug: 'detail-item',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { total: 1, category: [] } });
    });

    await renderPage();

    const detailsBtn = await screen.findByText('More Details');
    fireEvent.click(detailsBtn);

    expect(navigateMock).toHaveBeenCalledWith('/product/detail-item');
  });

  test('reset filters reloads window', async () => {
    const reloadMock = jest.fn();
    delete window.location;
    window.location = { reload: reloadMock };

    await renderPage();
    fireEvent.click(screen.getByText(/RESET FILTERS/i));

    expect(reloadMock).toHaveBeenCalled();
  });

  test('logs error on API failure', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error('Network Error'));

    await renderPage();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
