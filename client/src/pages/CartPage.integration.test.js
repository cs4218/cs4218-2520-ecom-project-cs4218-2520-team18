import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CartPage from './CartPage';
import { BrowserRouter } from 'react-router-dom';

global.mockCart = [];
global.mockSetCart = jest.fn();

jest.mock('../context/cart', () => ({
  useCart: () => [global.mockCart, global.mockSetCart],
}));

jest.mock('../context/search', () => ({
  __esModule: true,
  useSearch: () => [{ keyword: '', results: [] }, jest.fn()],
  SearchProvider: ({ children }) => children,
}));

const mockUseAuth = jest.fn();
jest.mock('../context/auth', () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));

jest.mock('axios');
const axios = require('axios');
axios.get.mockResolvedValue({ data: {} });
axios.post.mockResolvedValue({ data: { success: true } });

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  success: jest.fn(),
  Toaster: () => <div data-testid="toaster" />,
}));

// jest.mock('braintree-web-drop-in-react', () => ({
//   __esModule: true,
//   default: function MockDropIn({ onInstance }) {
//     const React = require('react');
//     React.useEffect(() => {
//       onInstance({
//         requestPaymentMethod: jest
//           .fn()
//           .mockResolvedValue({ nonce: 'fake-nonce' }),
//       });
//     }, []);
//     return React.createElement('div', { 'data-testid': 'dropin' });
//   },
// }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  global.mockCart = [
    { _id: '1', name: 'Test Product', price: 100, description: 'desc' },
  ];
  global.mockSetCart = jest.fn((updater) => {
    global.mockCart =
      typeof updater === 'function' ? updater(global.mockCart) : updater;
  });
  mockUseAuth.mockImplementation(() => [
    { token: 'abc', user: { name: 'Alice', address: '123 Main St' } },
    jest.fn(),
  ]);
  axios.get.mockResolvedValue({ data: {} });
  axios.post.mockResolvedValue({ data: {} });
  mockNavigate.mockReset();
});

function renderCartPage() {
  return render(
    <BrowserRouter>
      <CartPage />
    </BrowserRouter>,
  );
}

test('renders cart items and summary', () => {
  renderCartPage();
  expect(screen.getByText('Test Product')).toBeInTheDocument();
  expect(screen.getByText(/Cart Summary/i)).toBeInTheDocument();
  expect(screen.getByText(/Total :/i)).toBeInTheDocument();
});

test('removes item from cart', async () => {
  renderCartPage();
  expect(screen.getByText('Test Product')).toBeInTheDocument();

  const removeBtn = screen.getByText('Remove');
  fireEvent.click(removeBtn);

  await waitFor(() => {
    expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
  });
});

test('shows address and update button for logged-in user', () => {
  renderCartPage();
  expect(screen.getByText('Current Address')).toBeInTheDocument();
  expect(screen.getByText('123 Main St')).toBeInTheDocument();
  expect(screen.getByText('Update Address')).toBeInTheDocument();
});

test('handles payment and navigates to orders', async () => {
  axios.get.mockResolvedValue({ data: { clientToken: 'token' } });
  axios.post.mockResolvedValue({ data: { success: true } });

  renderCartPage();

  await screen.findByTestId('dropin');

  const payBtn = screen.getByRole('button', { name: /Make Payment/i });
  fireEvent.click(payBtn);

  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalled();
  });
  // eslint-disable-next-line no-console
  console.log('mockNavigate calls:', mockNavigate.mock.calls);
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard/user/orders');
});

test('shows login prompt for guest', () => {
  mockUseAuth.mockImplementation(() => [
    { token: null, user: null },
    jest.fn(),
  ]);
  renderCartPage();
  const matches = screen.getAllByText(/Please Login to checkout/i);
  expect(matches.length).toBeGreaterThan(0);
  expect(
    screen.getByRole('button', { name: /Please Login to checkout/i }),
  ).toBeInTheDocument();
});
