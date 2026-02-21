// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import About from './About';

jest.mock('../components/Layout', () => ({ children, title }) => (
  <div data-testid="mock-layout" data-title={title}>
    {children}
  </div>
));

describe('About Component', () => {
  test('renders the About component with correct title prop in Layout', () => {
    render(<About />);

    const layout = screen.getByTestId('mock-layout');
    expect(layout).toHaveAttribute('data-title', 'About us - Ecommerce app');
  });

  test('renders the about image with correct alt text', () => {
    render(<About />);

    const image = screen.getByRole('img', { name: /contactus/i });

    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/images/about.jpeg');
  });

  test('renders the text content accurately', () => {
    render(<About />);

    expect(screen.getByText('Add text')).toBeInTheDocument();
  });

  test('image has responsive styling', () => {
    render(<About />);

    const image = screen.getByRole('img', { name: /contactus/i });

    // Testing specific inline styles if critical to the UI
    expect(image).toHaveStyle({ width: '100%' });
  });
});
