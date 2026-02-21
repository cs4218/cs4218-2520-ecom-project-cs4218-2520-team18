// Sherwyn Ng, A0255132N
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import Layout from '../components/Layout';
import { beforeEach } from 'node:test';

jest.mock('../components/Header', () => () => <div data-testid="header" />);

jest.mock('../components/Footer', () => () => <div data-testid="footer" />);

jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

beforeEach(() => {
  document.head.innerHTML = '';
});

describe('Layout component', () => {
  afterEach(() => {
    cleanup();
    document.head.innerHTML = '';
    document.title = '';
    jest.clearAllMocks();
  });

  test('renders Header, Footer, Toaster and children', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>,
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('sets custom title and meta tags', async () => {
    render(
      <Layout
        title="Custom Title"
        description="Custom Description"
        keywords="react,jest"
        author="John Doe"
      >
        <div />
      </Layout>,
    );

    await waitFor(() => {
      expect(document.title).toBe('Custom Title');
    });

    // eslint-disable-next-line testing-library/no-node-access
    const description = document.querySelector('meta[name="description"]');
    // eslint-disable-next-line testing-library/no-node-access
    const keywords = document.querySelector('meta[name="keywords"]');
    // eslint-disable-next-line testing-library/no-node-access
    const author = document.querySelector('meta[name="author"]');

    expect(description).toHaveAttribute('content', 'Custom Description');
    expect(keywords).toHaveAttribute('content', 'react,jest');
    expect(author).toHaveAttribute('content', 'John Doe');
  });

  test('uses default props when no metadata props are provided', async () => {
    render(
      <Layout>
        <div />
      </Layout>,
    );

    await waitFor(() => {
      expect(document.title).toBe('Ecommerce app - shop now');
    });

    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'mern stack project',
    );

    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('meta[name="keywords"]')).toHaveAttribute(
      'content',
      'mern,react,node,mongodb',
    );

    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('meta[name="author"]')).toHaveAttribute(
      'content',
      'Techinfoyt',
    );
  });
});
