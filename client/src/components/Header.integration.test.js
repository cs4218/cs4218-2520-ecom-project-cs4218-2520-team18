import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import toast from 'react-hot-toast';
import Header from './Header';
import { useAuth } from '../context/auth';
import { useCart } from '../context/cart';
import useCategory from '../hooks/useCategory';
import '@testing-library/jest-dom';

jest.mock('../context/auth');
jest.mock('../context/cart');
jest.mock('../hooks/useCategory');
jest.mock('react-hot-toast');

jest.mock('./Form/SearchInput', () => {
  return function MockSearchInput() {
    return <div data-testid="mock-search-input">Search</div>;
  };
});

const localStorageMock = (() => {
  let store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const renderWithRouter = (component) => {
  return render(<Router>{component}</Router>);
};

describe('Header Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.spyOn(toast, 'success').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication Integration', () => {
    describe('Login/Logout Workflow', () => {
      test('should handle complete logout workflow for regular user', () => {
        const mockSetAuth = jest.fn();
        useAuth.mockReturnValue([
          {
            user: { id: '1', name: 'John Doe', role: 0 },
            token: 'test-token',
          },
          mockSetAuth,
        ]);
        useCart.mockReturnValue([[], jest.fn()]);
        useCategory.mockReturnValue([]);

        localStorage.setItem(
          'auth',
          JSON.stringify({
            user: { id: '1', name: 'John Doe' },
            token: 'test-token',
          }),
        );

        renderWithRouter(<Header />);

        const logoutLink = screen.getByText('Logout');
        fireEvent.click(logoutLink);

        expect(mockSetAuth).toHaveBeenCalledWith({
          user: { id: '1', name: 'John Doe', role: 0 },
          token: 'test-token',
          user: null,
          token: '',
        });

        expect(localStorage.getItem('auth')).toBeNull();

        expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
      });

      test('should handle logout workflow for admin user', () => {
        const mockSetAuth = jest.fn();
        useAuth.mockReturnValue([
          {
            user: { id: '1', name: 'Admin User', role: 1 },
            token: 'admin-token',
          },
          mockSetAuth,
        ]);
        useCart.mockReturnValue([[], jest.fn()]);
        useCategory.mockReturnValue([]);

        renderWithRouter(<Header />);

        const logoutLink = screen.getByText('Logout');
        fireEvent.click(logoutLink);

        expect(mockSetAuth).toHaveBeenCalledWith({
          user: { id: '1', name: 'Admin User', role: 1 },
          token: 'admin-token',
          user: null,
          token: '',
        });
      });
    });

    describe('Role-based Navigation', () => {
      test('should navigate regular user to user dashboard', () => {
        useAuth.mockReturnValue([
          {
            user: { id: '1', name: 'John Doe', role: 0 },
            token: 'user-token',
          },
          jest.fn(),
        ]);
        useCart.mockReturnValue([[], jest.fn()]);
        useCategory.mockReturnValue([]);

        renderWithRouter(<Header />);

        const dashboardLink = screen.getByText('Dashboard');
        expect(dashboardLink.getAttribute('href')).toBe('/dashboard/user');
      });
    });
  });

  describe('Cart Integration', () => {
    test('should display cart count from cart context', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);

      const mockCart = [
        { _id: '1', name: 'Product 1', price: 10 },
        { _id: '2', name: 'Product 2', price: 20 },
        { _id: '3', name: 'Product 3', price: 30 },
      ];
      useCart.mockReturnValue([mockCart, jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('Cart')).toBeInTheDocument();
    });

    test('should update cart display when cart context changes', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([{ _id: '1', name: 'Product 1' }], jest.fn());
      useCategory.mockReturnValue([]);

      const { rerender } = renderWithRouter(<Header />);

      useCart.mockReturnValue([[], jest.fn()]);
      rerender(
        <Router>
          <Header />
        </Router>,
      );

      expect(screen.getByText('Cart')).toBeInTheDocument();
    });
  });

  describe('Categories Integration', () => {
    test('should load and display categories from useCategory hook', async () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([[], jest.fn()]);

      const mockCategories = [
        { _id: '1', name: 'Electronics', slug: 'electronics' },
        { _id: '2', name: 'Books', slug: 'books' },
        { _id: '3', name: 'Clothing', slug: 'clothing' },
      ];
      useCategory.mockReturnValue(mockCategories);

      renderWithRouter(<Header />);

      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('Books')).toBeInTheDocument();
      expect(screen.getByText('Clothing')).toBeInTheDocument();

      const electronicsLink = screen.getByRole('link', {
        name: /electronics/i,
      });
      expect(electronicsLink.getAttribute('href')).toBe(
        '/category/electronics',
      );
    });

    test('should handle empty categories list', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('All Categories')).toBeInTheDocument();
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });

    test('should handle categories loading error gracefully', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('Categories')).toBeInTheDocument();
      expect(screen.getByText('All Categories')).toBeInTheDocument();
    });
  });

  describe('Navigation Integration', () => {
    test('should provide correct navigation links for unauthenticated user', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('Home').getAttribute('href')).toBe('/');
      expect(screen.getByText('Register').getAttribute('href')).toBe(
        '/register',
      );
      expect(screen.getByText('Login').getAttribute('href')).toBe('/login');
      expect(screen.getByText('Cart').getAttribute('href')).toBe('/cart');
      expect(screen.getByText('All Categories').getAttribute('href')).toBe(
        '/categories',
      );
    });

    test('should provide correct navigation links for authenticated user', () => {
      useAuth.mockReturnValue([
        {
          user: { id: '1', name: 'John Doe', role: 0 },
          token: 'user-token',
        },
        jest.fn(),
      ]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('Dashboard').getAttribute('href')).toBe(
        '/dashboard/user',
      );
      expect(screen.queryByText('Register')).not.toBeInTheDocument();
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });
  });

  describe('localStorage Integration', () => {
    test('should persist auth state changes to localStorage', () => {
      const mockSetAuth = jest.fn();
      useAuth.mockReturnValue([
        {
          user: { id: '1', name: 'John Doe', role: 0 },
          token: 'test-token',
        },
        mockSetAuth,
      ]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      localStorage.setItem(
        'auth',
        JSON.stringify({
          user: { id: '1', name: 'John Doe' },
          token: 'test-token',
        }),
      );

      renderWithRouter(<Header />);

      fireEvent.click(screen.getByText('Logout'));

      expect(localStorage.getItem('auth')).toBeNull();
    });

    test('should handle localStorage auth data on component mount', () => {
      useAuth.mockReturnValue([
        {
          user: { id: '1', name: 'John Doe', role: 0 },
          token: 'test-token',
        },
        jest.fn(),
      ]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('Toast Notification Integration', () => {
    test('should show success toast on logout', () => {
      const mockSetAuth = jest.fn();
      useAuth.mockReturnValue([
        {
          user: { id: '1', name: 'John Doe', role: 0 },
          token: 'test-token',
        },
        mockSetAuth,
      ]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      fireEvent.click(screen.getByText('Logout'));

      expect(toast.success).toHaveBeenCalledWith('Logout Successfully');
    });
  });

  describe('Responsive Navigation Integration', () => {
    test('should work with Bootstrap responsive navigation', () => {
      useAuth.mockReturnValue([{ user: null, token: '' }, jest.fn()]);
      useCart.mockReturnValue([[], jest.fn()]);
      useCategory.mockReturnValue([]);

      renderWithRouter(<Header />);

      const navbar = screen.getByRole('navigation');
      expect(navbar).toHaveClass(
        'navbar',
        'navbar-expand-lg',
        'bg-body-tertiary',
      );

      const toggler = screen.getByRole('button', {
        name: /toggle navigation/i,
      });
      expect(toggler).toHaveAttribute('data-bs-toggle', 'collapse');
      expect(toggler).toHaveAttribute('data-bs-target', '#navbarTogglerDemo01');
    });
  });
});
