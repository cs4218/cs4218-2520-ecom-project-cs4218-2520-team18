// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CartProvider, useCart } from './cart';

beforeEach(() => {
  localStorage.clear();
});

function TestComponent() {
  const [cart, setCart] = useCart();
  return (
    <div>
      <div data-testid="cart">{JSON.stringify(cart)}</div>
      <button
        onClick={() => {
          setCart([...cart, 'item1']);
          localStorage.setItem('cart', JSON.stringify([...cart, 'item1']));
        }}
      >
        Add Item
      </button>
    </div>
  );
}

test('initial cart is empty if localStorage is empty', () => {
  render(
    <CartProvider>
      <TestComponent />
    </CartProvider>,
  );
  expect(screen.getByTestId('cart').textContent).toBe('[]');
});

test('loads cart from localStorage if present', () => {
  localStorage.setItem('cart', JSON.stringify(['itemA']));
  render(
    <CartProvider>
      <TestComponent />
    </CartProvider>,
  );
  expect(screen.getByTestId('cart').textContent).toBe('["itemA"]');
});

test('adding item updates cart and localStorage', () => {
  render(
    <CartProvider>
      <TestComponent />
    </CartProvider>,
  );
  fireEvent.click(screen.getByText('Add Item'));
  expect(screen.getByTestId('cart').textContent).toBe('["item1"]');
  expect(JSON.parse(localStorage.getItem('cart'))).toEqual(['item1']);
});

test('cart persists after remount if localStorage is set', () => {
  localStorage.setItem('cart', JSON.stringify(['persisted']));
  const { unmount } = render(
    <CartProvider>
      <TestComponent />
    </CartProvider>,
  );
  unmount();
  render(
    <CartProvider>
      <TestComponent />
    </CartProvider>,
  );
  expect(screen.getByTestId('cart').textContent).toBe('["persisted"]');
});
