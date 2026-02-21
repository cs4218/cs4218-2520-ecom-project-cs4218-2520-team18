// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Contact from './Contact';

jest.mock('../components/Layout', () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

describe('Contact Component', () => {
  test('renders without crashing', () => {
    render(<Contact />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  test('renders CONTACT US heading', () => {
    render(<Contact />);
    expect(
      screen.getByRole('heading', { name: /contact us/i }),
    ).toBeInTheDocument();
  });

  test('renders contact description text', () => {
    render(<Contact />);
    expect(
      screen.getByText(/for any query or info about product/i),
    ).toBeInTheDocument();
  });

  test('renders email address', () => {
    render(<Contact />);
    expect(screen.getByText(/www.help@ecommerceapp.com/i)).toBeInTheDocument();
  });

  test('renders phone number', () => {
    render(<Contact />);
    expect(screen.getByLabelText('phone')).toBeInTheDocument();
  });

  test('renders toll-free support number', () => {
    render(<Contact />);
    expect(screen.getByLabelText('customer-service')).toBeInTheDocument();
  });

  test('renders contact image with correct alt text', () => {
    render(<Contact />);
    const img = screen.getByRole('img', { name: /contactus/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/contactus.jpeg');
  });
});
