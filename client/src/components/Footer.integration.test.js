import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import Footer from './Footer';
import '@testing-library/jest-dom';

const renderWithRouter = (component) => {
  return render(<Router>{component}</Router>);
};

describe('Footer Integration Tests', () => {
  describe('Navigation Links Integration', () => {
    test('should render all three navigation links together', () => {
      renderWithRouter(<Footer />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
    });

    test('should have all links accessible for navigation', () => {
      renderWithRouter(<Footer />);

      const aboutLink = screen.getByRole('link', { name: /about/i });
      const contactLink = screen.getByRole('link', { name: /contact/i });
      const policyLink = screen.getByRole('link', { name: /privacy policy/i });

      expect(aboutLink).toBeVisible();
      expect(contactLink).toBeVisible();
      expect(policyLink).toBeVisible();
    });
  });

  describe('Router Integration', () => {
    test('should render links within Router context without errors', () => {
      expect(() => {
        renderWithRouter(<Footer />);
      }).not.toThrow();
    });

    test('should have functional links that integrate with Router', () => {
      renderWithRouter(<Footer />);

      const aboutLink = screen.getByRole('link', { name: /about/i });
      const contactLink = screen.getByRole('link', { name: /contact/i });
      const policyLink = screen.getByRole('link', { name: /privacy policy/i });

      expect(aboutLink.tagName).toBe('A');
      expect(contactLink.tagName).toBe('A');
      expect(policyLink.tagName).toBe('A');
    });
  });
});
