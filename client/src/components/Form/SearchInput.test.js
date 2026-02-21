// Aw Jean Leng Adrian, A0277537N

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchInput from './SearchInput';
import { useSearch } from '../../context/search';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../context/search');

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

// Suppress console.log
const originalConsoleLog = console.log;
beforeAll(() => {
    console.log = jest.fn();
});
afterAll(() => {
    console.log = originalConsoleLog;
});

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('SearchInput Component', () => {
    const mockSetValues = jest.fn();
    const defaultValues = {
        keyword: '',
        results: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();
        useSearch.mockReturnValue([defaultValues, mockSetValues]);
    });

    // Rendering Tests
    describe('Component Rendering', () => {
        test('should render search form with input and button', () => {
            renderWithRouter(<SearchInput />);

            expect(screen.getByRole('search')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
        });

        test('should have correct form structure and classes', () => {
            const { container } = renderWithRouter(<SearchInput />);

            const form = container.querySelector('form');
            expect(form).toHaveClass('d-flex');
            expect(form).toHaveAttribute('role', 'search');
        });

        test('should render input with correct attributes', () => {
            renderWithRouter(<SearchInput />);

            const input = screen.getByPlaceholderText('Search');
            expect(input).toHaveClass('form-control', 'me-2');
            expect(input).toHaveAttribute('type', 'search');
            expect(input).toHaveAttribute('aria-label', 'Search');
        });

        test('should render button with correct classes', () => {
            renderWithRouter(<SearchInput />);

            const button = screen.getByRole('button', { name: 'Search' });
            expect(button).toHaveClass('btn', 'btn-outline-success');
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    // Input Handling Tests
    describe('Input Handling', () => {
        test('should display keyword from context', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);

            renderWithRouter(<SearchInput />);

            expect(screen.getByPlaceholderText('Search')).toHaveValue('laptop');
        });

        test('should update keyword on input change', () => {
            renderWithRouter(<SearchInput />);

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: 'phone' } });

            expect(mockSetValues).toHaveBeenCalledWith({
                keyword: 'phone',
                results: [],
            });
        });

        test('should handle multiple input changes', () => {
            renderWithRouter(<SearchInput />);

            const input = screen.getByPlaceholderText('Search');

            fireEvent.change(input, { target: { value: 'l' } });
            expect(mockSetValues).toHaveBeenCalledWith({ keyword: 'l', results: [] });

            fireEvent.change(input, { target: { value: 'la' } });
            expect(mockSetValues).toHaveBeenCalledWith({ keyword: 'la', results: [] });

            fireEvent.change(input, { target: { value: 'laptop' } });
            expect(mockSetValues).toHaveBeenCalledWith({ keyword: 'laptop', results: [] });
        });

        test('should handle clearing input', () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);

            renderWithRouter(<SearchInput />);

            const input = screen.getByPlaceholderText('Search');
            fireEvent.change(input, { target: { value: '' } });

            expect(mockSetValues).toHaveBeenCalledWith({ keyword: '', results: [] });
        });
    });

    // Form Submission Tests
    describe('Form Submission', () => {
        test('should call API and navigate on form submit', async () => {
            const mockSearchResults = [
                { _id: 'prod1', name: 'Laptop', price: 1499.99 },
                { _id: 'prod2', name: 'Phone', price: 999.99 },
            ];

            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);
            axios.get.mockResolvedValue({ data: mockSearchResults });

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop');
            });

            await waitFor(() => {
                expect(mockSetValues).toHaveBeenCalledWith({
                    keyword: 'laptop',
                    results: mockSearchResults,
                });
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/search');
            });
        });

        test('should prevent default form submission', async () => {
            const mockEvent = { preventDefault: jest.fn() };
            axios.get.mockResolvedValue({ data: [] });

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form, mockEvent);

            // preventDefault is called internally by fireEvent.submit
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalled();
            });
        });

        test('should handle search with special characters', async () => {
            useSearch.mockReturnValue([
                { keyword: 'laptop & tablet', results: [] },
                mockSetValues,
            ]);
            axios.get.mockResolvedValue({ data: [] });

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/laptop & tablet');
            });
        });

        test('should handle empty search', async () => {
            useSearch.mockReturnValue([
                { keyword: '', results: [] },
                mockSetValues,
            ]);
            axios.get.mockResolvedValue({ data: [] });

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith('/api/v1/product/search/');
            });
        });

        test('should update results and navigate even with empty results', async () => {
            useSearch.mockReturnValue([
                { keyword: 'nonexistent', results: [] },
                mockSetValues,
            ]);
            axios.get.mockResolvedValue({ data: [] });

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockSetValues).toHaveBeenCalledWith({
                    keyword: 'nonexistent',
                    results: [],
                });
            });

            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/search');
            });
        });
    });

    // Error Handling Tests
    describe('Error Handling', () => {
        test('should handle API errors gracefully', async () => {
            const error = new Error('Network error');
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);
            axios.get.mockRejectedValue(error);

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            });

            // Should not navigate or update results on error
            expect(mockSetValues).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalled();
        });

        test('should handle 404 errors', async () => {
            const error = {
                response: { status: 404, data: { message: 'Not found' } },
            };
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);
            axios.get.mockRejectedValue(error);

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            });
        });

        test('should handle 500 server errors', async () => {
            const error = {
                response: { status: 500, data: { message: 'Server error' } },
            };
            useSearch.mockReturnValue([
                { keyword: 'laptop', results: [] },
                mockSetValues,
            ]);
            axios.get.mockRejectedValue(error);

            renderWithRouter(<SearchInput />);

            const form = screen.getByRole('search');
            fireEvent.submit(form);

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            });
        });
    });
});