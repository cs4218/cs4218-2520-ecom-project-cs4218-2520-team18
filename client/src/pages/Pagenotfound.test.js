import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Pagenotfound from './Pagenotfound';

jest.mock('./../components/Layout', () => ({ children, title }) => (
  <div data-testid="mock-layout" data-title={title}>
    {children}
  </div>
));

describe('Pagenotfound Component', () => {
  const setup = () => {
    render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>,
    );
  };

  test('renders the correct title in Layout', () => {
    setup();
    const layout = screen.getByTestId('mock-layout');
    expect(layout).toHaveAttribute('data-title', 'go back- page not found');
  });

  test('renders 404 error code heading', () => {
    setup();
    const heading404 = screen.getByRole('heading', { name: /404/i, level: 1 });
    expect(heading404).toBeInTheDocument();
  });

  test("renders 'Oops' message", () => {
    setup();
    const subHeading = screen.getByRole('heading', {
      name: /oops ! page not found/i,
      level: 2,
    });
    expect(subHeading).toBeInTheDocument();
  });

  test("renders 'Go Back' link with correct destination", () => {
    setup();
    const link = screen.getByRole('link', { name: /go back/i });

    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
