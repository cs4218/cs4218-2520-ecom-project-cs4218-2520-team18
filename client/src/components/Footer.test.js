// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';
import { describe } from 'node:test';

describe('Footer Component', () => {
  const renderFooter = () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
  };

  test('renders footer text', () => {
    renderFooter();

    expect(
      screen.getByText(/All Rights Reserved © TestingComp/i),
    ).toBeInTheDocument();
  });

  test('renders About link with correct route', () => {
    renderFooter();

    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  test('renders Contact link with correct route', () => {
    renderFooter();

    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  test('reders Privacy Policy link with correct route', () => {
    renderFooter();

    const policyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(policyLink).toHaveAttribute('href', '/policy');
  });
});
