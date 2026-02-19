import React from 'react';
import {
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from '@testing-library/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import '@testing-library/jest-dom/extend-expect';
import DropIn from 'braintree-web-drop-in-react';
import { useCart } from '../context/cart';
import { useAuth } from '../context/auth';
import CartPage from './CartPage';

jest.mock('axios');
jest.mock('react-hot-toast');

jest.mock('../components/Layout.js', () => ({ children }) => (
  <div>{children}</div>
));

jest.mock('../context/cart', () => ({ useCart: jest.fn() }));

jest.mock('../context/auth', () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('react-router-dom', () => ({
  __esModule: true,
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

jest.mock('braintree-web-drop-in-react', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => <div>MockDropIn</div>),
}));

Object.defineProperty(window, 'localStorage', {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const renderAndFlushEffects = async () => {
  render(<CartPage />);
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');
  });
};

describe('CartPage', () => {
  beforeEach(() => {
    useNavigate.mockReturnValue(jest.fn());
    jest.spyOn(console, 'log').mockImplementation(() => {});

    axios.get.mockResolvedValue({ data: { clientToken: 'fake-client-token' } });
    axios.post.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('renders loading state and empty cart message', async () => {
    useAuth.mockReturnValue([null, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);

    await renderAndFlushEffects();

    expect(screen.getByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    expect(screen.queryByText(/Make Payment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Processing .... /i)).not.toBeInTheDocument();
  });

  test('removeCartItem catches and logs error when localStorage.setItem throws', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    localStorage.setItem.mockImplementationOnce(() => {
      throw new Error('localStorage error');
    });

    const setCartMock = jest.fn();
    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        description: 'A sturdy wooden table.',
        price: 199,
      },
    ];

    useAuth.mockReturnValue([
      { user: { name: 'John Doe' }, token: 'mockToken' },
      jest.fn(),
    ]);
    useCart.mockReturnValue([mockCart, setCartMock]);

    await renderAndFlushEffects();

    const removeBtn = await screen.findByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    expect(consoleSpy.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(consoleSpy.mock.calls[0][0].message).toBe('localStorage error');

    consoleSpy.mockRestore();
  });

  test('handlePayment catches and logs error when payment fails', async () => {
    const error = new Error('Payment failed');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const mockNavigate = jest.fn();
    const setCart = jest.fn();

    useNavigate.mockReturnValue(mockNavigate);

    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        description: 'A sturdy wooden table.',
        price: 199,
      },
    ];

    useAuth.mockReturnValue([
      {
        user: { name: 'John Doe', address: '123 Computing St' },
        token: 'mockToken',
      },
      jest.fn(),
    ]);

    useCart.mockReturnValue([mockCart, setCart]);

    axios.get.mockResolvedValueOnce({
      data: { clientToken: 'mock-client-token' },
    });

    DropIn.mockImplementationOnce(({ onInstance }) => {
      setTimeout(() => {
        onInstance({
          requestPaymentMethod: jest.fn().mockRejectedValue(error),
        });
      }, 0);
      return <div>MockDropIn</div>;
    });

    await renderAndFlushEffects();

    const makePaymentButton = await screen.findByText(/Make Payment/i);
    await waitFor(() => expect(makePaymentButton).not.toBeDisabled());

    fireEvent.click(makePaymentButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(error);
    });

    expect(setCart).not.toHaveBeenCalled();
    expect(localStorage.removeItem).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('renders cart items correctly', async () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        description: 'A sturdy wooden table.',
        price: 199,
      },
    ];
    const mockUser = { user: { name: 'John Doe' }, token: 'mockToken' };

    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([mockCart, jest.fn()]);

    await renderAndFlushEffects();

    axios.get.mockResolvedValue({ data: { clientToken: 'mockToken' } });

    await waitFor(() => {
      expect(
        screen.getByText((content) => /hello\s+john\s+doe/i.test(content)),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/You Have 1 items in your cart/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Price : 199')).toBeInTheDocument();
  });

  test('totalPrice catches and logs error when toLocaleString throws', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest
      .spyOn(Number.prototype, 'toLocaleString')
      .mockImplementationOnce(() => {
        throw new Error('Formatting error');
      });

    const mockCart = [
      {
        _id: '1',
        name: 'Test Item',
        price: 100,
        description: 'Test Description',
      },
    ];
    useAuth.mockReturnValue([
      { token: 'mockToken', user: { name: 'John Doe' } },
      jest.fn(),
    ]);
    useCart.mockReturnValue([mockCart, jest.fn()]);

    await renderAndFlushEffects();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });

  test('shows "Update Address" button when logged in but no address is provided', async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);

    const mockUser = {
      user: { name: 'John Doe', address: '' },
      token: 'mockToken',
    };

    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);

    await renderAndFlushEffects();

    const updateBtn = await screen.findByRole('button', {
      name: /update address/i,
    });
    expect(updateBtn).toBeInTheDocument();

    fireEvent.click(updateBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/profile');
  });

  test('navigates to login with state when "Please Login to checkout" is clicked', async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);

    useAuth.mockReturnValue([{ token: '', user: null }, jest.fn()]);

    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        price: 100,
        description: 'A sturdy wooden table.',
      },
    ];
    useCart.mockReturnValue([mockCart, jest.fn()]);

    await renderAndFlushEffects();

    const loginBtn = await screen.findByRole('button', {
      name: /please login to checkout/i,
    });
    expect(loginBtn).toBeInTheDocument();

    fireEvent.click(loginBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/login', {
      state: '/cart',
    });
  });

  test('removes an item from the cart and updates localStorage', async () => {
    const mockUser = { user: { name: 'John Doe' }, token: 'mockToken' };
    const setCartMock = jest.fn();
    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        description: 'A sturdy wooden table.',
        price: 199,
      },
    ];
    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([mockCart, setCartMock]);

    await renderAndFlushEffects();

    expect(await screen.findByText(/Price : 199/i)).toBeInTheDocument();

    localStorage.setItem('cart', JSON.stringify(mockCart));

    const removeBtn = await screen.findByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    await waitFor(() => expect(setCartMock).toHaveBeenCalledWith([]));
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'cart',
      JSON.stringify([]),
    );
  });

  test('navigates to profile page when updating address', async () => {
    const mockNavigate = jest.fn();
    useNavigate.mockReturnValue(mockNavigate);

    const mockUser = {
      user: { name: 'John Doe', address: '123 Main St' },
      token: 'mockToken',
    };
    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);

    await renderAndFlushEffects();

    const updateBtn = await screen.findByRole('button', {
      name: /update address/i,
    });
    fireEvent.click(updateBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/profile');
  });

  test('handles payment process correctly', async () => {
    const mockCart = [
      {
        _id: '1',
        name: 'Table',
        description: 'A sturdy wooden table.',
        price: 199,
      },
    ];
    const mockUser = {
      user: { name: 'John Doe', address: '123 Computing St' },
      token: 'mockToken',
    };
    const setCart = jest.fn();
    const mockNavigate = jest.fn();

    useNavigate.mockReturnValue(mockNavigate);
    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([mockCart, setCart]);

    axios.get.mockResolvedValue({ data: { clientToken: 'mockToken' } });

    DropIn.mockImplementationOnce(({ onInstance }) => {
      setTimeout(() => {
        onInstance({
          requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: 'nonce' }),
        });
      }, 1);
      return <div>MockDropIn</div>;
    });

    axios.post.mockResolvedValueOnce({ data: null });
    localStorage.setItem('cart', JSON.stringify(mockCart));

    await renderAndFlushEffects();

    expect(useAuth).toBeCalled();
    expect(useCart).toBeCalled();
    expect(axios.get).toHaveBeenCalledWith('/api/v1/product/braintree/token');

    expect(await screen.findByText('MockDropIn')).toBeInTheDocument();
    const makePaymentButton = await screen.findByText(/Make Payment/i);
    await waitFor(() => expect(makePaymentButton).not.toBeDisabled());

    fireEvent.click(makePaymentButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/v1/product/braintree/payment',
        {
          nonce: 'nonce',
          cart: mockCart,
        },
      );
    });

    expect(setCart).toHaveBeenCalledWith([]);
    expect(localStorage.removeItem).toHaveBeenCalledWith('cart');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
    expect(toast.success).toHaveBeenCalledWith(
      'Payment Completed Successfully ',
    );
  });

  test('displays empty cart message', async () => {
    const mockUser = {
      user: { name: 'John Doe', address: '123 Computing St' },
      token: 'mockToken',
    };
    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);

    await renderAndFlushEffects();

    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
  });

  test('handles error fetching Braintree token', async () => {
    const error = new Error('Network Error');
    axios.get.mockRejectedValueOnce(error);

    const mockUser = {
      user: { name: 'John Doe', address: '123 Computing St' },
    };
    useAuth.mockReturnValue([mockUser, jest.fn()]);
    useCart.mockReturnValue([[], jest.fn()]);

    await renderAndFlushEffects();

    await waitFor(() => expect(console.log).toHaveBeenCalledWith(error));
    expect(screen.queryByText(/Make Payment/i)).not.toBeInTheDocument();
  });
});
