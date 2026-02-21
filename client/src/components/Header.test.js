// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import useCategory from '../hooks/useCategory';
import toast from 'react-hot-toast';

jest.mock('../context/auth');
jest.mock('../context/cart');
jest.mock('../hooks/useCategory');

jest.mock('../components/Form/SearchInput', () => () => (
  <div data-testid="search-input" />
));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
}));

describe('Header component', () => {
  let setAuthMock;

  const renderHeader = () =>
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

  beforeEach(() => {
    setAuthMock = jest.fn();

    useCart.mockReturnValue([[{ _id: '1' }, { _id: '2' }]]);
    useCategory.mockReturnValue([{ name: 'Electronics', slug: 'electronics' }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders brand and search input', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);

    renderHeader();

    expect(screen.getByText(/Virtual Vault/i)).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  test('shows Register and Login when user is not authenciated', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);

    renderHeader();

    expect(screen.getByText('Register')).toBeInTheDocument();
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  test('shows user name and dashboard link when logged in', () => {
    useAuth.mockReturnValue([
      { user: { name: 'John', role: 0 }, token: 'token' },
      setAuthMock,
    ]);

    renderHeader();

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('links to admin dashboard when user role is admin', () => {
    useAuth.mockReturnValue([
      { user: { name: 'Admin', role: 1 }, token: 'token' },
      setAuthMock,
    ]);

    renderHeader();

    const dashboardLink = screen.getByText('Dashboard');

    expect(dashboardLink).toHaveAttribute('href', '/dashboard/admin');
  });

  test('renders categories from hook', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);

    renderHeader();

    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  test('shows cart count correctly', () => {
    useAuth.mockReturnValue([{ user: null, token: '' }, setAuthMock]);

    renderHeader();

    expect(screen.getByText('Cart')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('handleLogout clears auth, localStorage and shows toast', () => {
    useAuth.mockReturnValue([
      { user: { name: 'John', role: 0 }, token: 'token' },
      setAuthMock,
    ]);

    renderHeader();

    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    expect(setAuthMock).toHaveBeenCalledWith({
      user: null,
      token: '',
    });

    expect(localStorage.getItem('auth')).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
  });
});
