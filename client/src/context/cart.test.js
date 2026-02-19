import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './cart'; // Adjust path as needed

describe('CartContext and useCart Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('should initialize with an empty array if localStorage is empty', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    const [cart] = result.current;
    expect(cart).toEqual([]);
  });

  test('should hydrate state from localStorage on mount', () => {
    const mockCart = [{ _id: '1', name: 'Product 1', price: 10 }];
    localStorage.setItem('cart', JSON.stringify(mockCart));

    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    const [cart] = result.current;
    expect(cart).toEqual(mockCart);
  });

  test('should update cart state when setCart is called', () => {
    const { result } = renderHook(() => useCart(), {
      wrapper: CartProvider,
    });

    const [, setCart] = result.current;
    const newItem = { _id: '2', name: 'Product 2', price: 20 };

    act(() => {
      setCart([newItem]);
    });

    const [cart] = result.current;
    expect(cart).toEqual([newItem]);
  });

  test('should provide cart state to child components', () => {
    const TestComponent = () => {
      const [cart] = useCart();
      return <div data-testid="cart-length">{cart.length}</div>;
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    expect(screen.getByTestId('cart-length')).toHaveTextContent('0');
  });
});
