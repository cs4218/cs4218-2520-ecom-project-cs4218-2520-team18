import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Categories from './Categories';
import useCategory from '../hooks/useCategory';

// Mock dependencies
jest.mock('../hooks/useCategory');
jest.mock('../components/Layout', () => {
    return function Layout({ children, title }) {
        return (
        <div data-testid="layout" data-title={title}>
            {children}
        </div>
        );
    };
});

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Categories Component', () => {
    const mockCategories = [
        { _id: 'cat1', name: 'Electronics', slug: 'electronics' },
        { _id: 'cat2', name: 'Books', slug: 'books' },
        { _id: 'cat3', name: 'Clothing', slug: 'clothing' },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Basic Rendering
    test('should render with Layout and correct title', () => {
        useCategory.mockReturnValue([]);

        renderWithRouter(<Categories />);

        expect(screen.getByTestId('layout')).toBeInTheDocument();
        expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'All Categories');
    });

    test('should render all three categories', () => {
        useCategory.mockReturnValue(mockCategories);

        renderWithRouter(<Categories />);

        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();
        expect(screen.getByText('Clothing')).toBeInTheDocument();
    });

    test('should render empty state when no categories', () => {
        useCategory.mockReturnValue([]);

        renderWithRouter(<Categories />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    // Link & Routing Tests
    test('should render links with correct routes', () => {
        useCategory.mockReturnValue(mockCategories);

        renderWithRouter(<Categories />);

        expect(screen.getByRole('link', { name: 'Electronics' })).toHaveAttribute(
        'href',
        '/category/electronics'
        );
        expect(screen.getByRole('link', { name: 'Books' })).toHaveAttribute(
        'href',
        '/category/books'
        );
        expect(screen.getByRole('link', { name: 'Clothing' })).toHaveAttribute(
        'href',
        '/category/clothing'
        );
    });

    test('should have correct CSS classes on links', () => {
        useCategory.mockReturnValue(mockCategories);

        renderWithRouter(<Categories />);

        const links = screen.getAllByRole('link');
        links.forEach((link) => {
        expect(link).toHaveClass('btn', 'btn-primary');
        });
    });

    test('should render correct number of links', () => {
        useCategory.mockReturnValue(mockCategories);

        renderWithRouter(<Categories />);

        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    // Layout Structure Tests (2 tests)
    test('should have correct Bootstrap grid structure', () => {
        useCategory.mockReturnValue(mockCategories);

        const { container } = renderWithRouter(<Categories />);

        expect(container.querySelector('.container')).toBeInTheDocument();
        expect(container.querySelector('.row')).toBeInTheDocument();
        expect(container.querySelectorAll('.col-md-6')).toHaveLength(3);
    });

    test('should apply correct spacing classes to columns', () => {
        useCategory.mockReturnValue(mockCategories);

        const { container } = renderWithRouter(<Categories />);

        const columns = container.querySelectorAll('.col-md-6');
        columns.forEach((column) => {
        expect(column).toHaveClass('mt-5', 'mb-3', 'gx-3', 'gy-3');
        });
    });

    // Edge Cases (2 tests)
    test('should handle single category', () => {
        useCategory.mockReturnValue([mockCategories[0]]);

        renderWithRouter(<Categories />);

        expect(screen.getByText('Electronics')).toBeInTheDocument();
        expect(screen.getAllByRole('link')).toHaveLength(1);
    });

    test('should handle categories with special characters in names', () => {
        const specialCategories = [
        { _id: 'cat1', name: 'Home & Garden', slug: 'home-garden' },
        { _id: 'cat2', name: 'Books/Media', slug: 'books-media' },
        ];
        useCategory.mockReturnValue(specialCategories);

        renderWithRouter(<Categories />);

        expect(screen.getByText('Home & Garden')).toBeInTheDocument();
        expect(screen.getByText('Books/Media')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Home & Garden' })).toHaveAttribute(
        'href',
        '/category/home-garden'
        );
    });
});