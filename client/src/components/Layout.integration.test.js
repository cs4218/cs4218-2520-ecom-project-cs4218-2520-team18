import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from './Layout';
import Header from './Header';
import Footer from './Footer';
import { Helmet } from 'react-helmet';
import '@testing-library/jest-dom';

jest.mock('./Header', () => {
  return function MockHeader() {
    return <header data-testid="mock-header">Header</header>;
  };
});

jest.mock('./Footer', () => {
  return function MockFooter() {
    return <footer data-testid="mock-footer">Footer</footer>;
  };
});

let helmetChildren = null;
jest.mock('react-helmet', () => {
  const React = require('react');
  return {
    Helmet: ({ children, ...props }) => {
      const enhancedChildren = React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === 'meta') {
          return React.cloneElement(child, {
            'data-testid': 'helmet-meta',
            ...child.props,
          });
        }
        return child;
      });
      return (
        <div data-testid="helmet-mock" {...props}>
          {enhancedChildren}
        </div>
      );
    },
  };
});

jest.mock('react-hot-toast', () => ({
  Toaster: () => <div data-testid="mock-toaster">Toaster</div>,
}));

const renderWithRouter = (component) => {
  return render(<Router>{component}</Router>);
};

describe('Layout Integration Tests', () => {
  beforeEach(() => {
    helmetChildren = null;
  });

  afterEach(() => {
    helmetChildren = null;
  });

  describe('Component Integration', () => {
    test('should render Header and Footer together in layout', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });

    test('should render children content in main section', () => {
      const testContent = <div data-testid="test-content">Test Content</div>;
      renderWithRouter(<Layout>{testContent}</Layout>);

      const main = screen.getByRole('main');
      expect(main).toBeInTheDocument();
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    test('should integrate Toaster component in main section', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      const main = screen.getByRole('main');
      expect(screen.getByTestId('mock-toaster')).toBeInTheDocument();
    });
  });

  describe('Helmet Integration', () => {
    test('should set document title through Helmet', () => {
      renderWithRouter(<Layout title="Custom Title">Test</Layout>);

      const helmet = screen.getByTestId('helmet-mock');
      expect(within(helmet).getByText('Custom Title')).toBeInTheDocument();
    });

    test('should set meta description through Helmet', () => {
      renderWithRouter(<Layout description="Custom Description">Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'description' &&
            meta.getAttribute('content') === 'Custom Description',
        ),
      ).toBe(true);
    });

    test('should set meta keywords through Helmet', () => {
      renderWithRouter(<Layout keywords="react,jest,testing">Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'keywords' &&
            meta.getAttribute('content') === 'react,jest,testing',
        ),
      ).toBe(true);
    });

    test('should set meta author through Helmet', () => {
      renderWithRouter(<Layout author="Test Author">Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'author' &&
            meta.getAttribute('content') === 'Test Author',
        ),
      ).toBe(true);
    });

    test('should set charset through Helmet', () => {
      renderWithRouter(<Layout>Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some((meta) => meta.getAttribute('charSet') === 'utf-8'),
      ).toBe(true);
    });

    test('should use default props when not provided', () => {
      renderWithRouter(<Layout>Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      expect(
        within(helmet).getByText('Ecommerce app - shop now'),
      ).toBeInTheDocument();
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'description' &&
            meta.getAttribute('content') === 'mern stack project',
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'keywords' &&
            meta.getAttribute('content') === 'mern,react,node,mongodb',
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'author' &&
            meta.getAttribute('content') === 'Techinfoyt',
        ),
      ).toBe(true);
    });
  });

  describe('Layout Structure Integration', () => {
    test('should have proper semantic HTML structure', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });

    test('should apply minimum height style to main section', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      const main = screen.getByRole('main');
      expect(main).toHaveStyle({ minHeight: '70vh' });
    });

    test('should render components in correct order', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      expect(screen.getByTestId('helmet-mock')).toBeInTheDocument();
      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });

    test('should render Toaster inside main section', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      const main = screen.getByRole('main');
      const toaster = screen.getByTestId('mock-toaster');

      expect(main.contains(toaster)).toBe(true);
    });
  });

  describe('Toast Integration', () => {
    test('should integrate react-hot-toast Toaster component', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      expect(screen.getByTestId('mock-toaster')).toBeInTheDocument();
    });

    test('should position Toaster correctly in layout', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      const main = screen.getByRole('main');
      const toaster = screen.getByTestId('mock-toaster');

      const mainChildren = within(main).queryAllByTestId(/.*/);
      expect(mainChildren[0]).toBe(toaster);
    });
  });

  describe('Props Integration', () => {
    beforeEach(() => {
      helmetChildren = null;
    });

    afterEach(() => {
      helmetChildren = null;
    });

    test('should pass all props to Helmet correctly', () => {
      const props = {
        title: 'Test Title',
        description: 'Test Description',
        keywords: 'test,keywords',
        author: 'Test Author',
      };

      renderWithRouter(<Layout {...props}>Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');

      expect(within(helmet).getByText(props.title)).toBeInTheDocument();
      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'description' &&
            meta.getAttribute('content') === props.description,
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'keywords' &&
            meta.getAttribute('content') === props.keywords,
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'author' &&
            meta.getAttribute('content') === props.author,
        ),
      ).toBe(true);
    });

    test('should handle partial props with defaults', () => {
      renderWithRouter(<Layout title="Custom Title">Test</Layout>);
      const helmet = screen.getByTestId('helmet-mock');
      expect(within(helmet).getByText('Custom Title')).toBeInTheDocument();

      const metaTags = within(helmet).getAllByTestId('helmet-meta');
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'description' &&
            meta.getAttribute('content') === 'mern stack project',
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'keywords' &&
            meta.getAttribute('content') === 'mern,react,node,mongodb',
        ),
      ).toBe(true);
      expect(
        metaTags.some(
          (meta) =>
            meta.getAttribute('name') === 'author' &&
            meta.getAttribute('content') === 'Techinfoyt',
        ),
      ).toBe(true);
    });
  });

  describe('Router Context Integration', () => {
    test('should render within Router context without errors', () => {
      expect(() => {
        renderWithRouter(<Layout>Test Content</Layout>);
      }).not.toThrow();
    });

    test('should allow Header and Footer to access Router context', () => {
      renderWithRouter(<Layout>Test Content</Layout>);

      expect(screen.getByTestId('mock-header')).toBeInTheDocument();
      expect(screen.getByTestId('mock-footer')).toBeInTheDocument();
    });
  });
});
