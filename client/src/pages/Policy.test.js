// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Policy from './Policy';

jest.mock('../components/Layout', () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

describe('Policy Component Unit Tests', () => {
  test('renders Policy component without crashing', () => {
    render(<Policy />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  test('renders privacy policy image with correct alt text', () => {
    render(<Policy />);
    const img = screen.getByAltText('contactus');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/contactus.jpeg');
  });

  test('renders privacy policy paragraphs', () => {
    render(<Policy />);
    const paragraphs = screen.getAllByText(/add privacy policy/i);
    expect(paragraphs.length).toBe(7);

    expect(paragraphs.length).toBeGreaterThan(0);
  });
});
