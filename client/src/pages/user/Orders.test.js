import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Orders from './Orders';
import axios from 'axios';
import { useAuth } from '../../context/auth';
import { BrowserRouter } from 'react-router-dom';

jest.mock("axios");
jest.mock("../../context/auth");
jest.mock("../../components/UserMenu", () => {
    return function UserMenu() {
        return <div data-testid="user-menu">User Menu</div>;
    }
});
jest.mock("../../components/Layout", () => {
    return function Layout({ children, title }) {
        return (
            <div data-testid="layout" data-title={title}>
                {children}
            </div>
        );
    };
});

jest.mock("moment", () => {
    return (date) => ({
        fromNow: () => '2 days ago',
    });
});

// Suppress console warnings for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});
afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe("Orders Component", () => {
    const mockAuth = {
        user: { name: "Test User", email: "test@test.com" },
        token: "mock-token",
    };

    const mockOrders = [
        {
            _id: "order1",
            status: "Processing",
            buyer: { name: "Chicken" },
            createAt: "2026-01-01T10:30:00Z",
            payment: { success: true },
            products: [
                { 
                    _id: "Novel",
                    name: "Novel",
                    description: "A thrilling mystery novel.",
                    price: 14.99
                },
                {
                    _id: "NUS T-Shirt",
                    name: "NUS T-Shirt",
                    description: "A comfortable NUS branded t-shirt.",
                    price: 4.99
                },
            ],
        },
        {
            _id: "order2",
            status: "Shipped",
            buyer: { name: "Egg" },
            createAt: "2026-01-02T14:45:00Z",
            payment: { success: false },
            products: [
                {
                    _id: "Laptop",
                    name: "Laptop",
                    description: "A high-performance laptop for work and gaming.",
                    price: 1499.99
                },
            ],
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        useAuth.mockReturnValue([mockAuth, jest.fn()]);
    });

    // Rendering Tests
    describe("Component Rendering", () => {
        test("should render Orders component with layout", async () => {
            axios.get.mockResolvedValue({ data: [] });
            
            renderWithRouter(<Orders />);
            
            await waitFor(() => {
                expect(screen.getByTestId('layout')).toBeInTheDocument();
            });
            
            expect(screen.getByTestId('layout')).toHaveAttribute('data-title', 'Your Orders');
        });

        test("should render UserMenu component", async () => {
            axios.get.mockResolvedValue({ data: [] });
            
            renderWithRouter(<Orders />);
            
            await waitFor(() => {
                expect(screen.getByTestId('user-menu')).toBeInTheDocument();
            });
        });

        test("should render 'All Orders' heading", async () => {
            axios.get.mockResolvedValue({ data: [] });
            
            renderWithRouter(<Orders />);
            
            await waitFor(() => {
                expect(screen.getByText("All Orders")).toBeInTheDocument();
            });
        });

        test("should render empty state when no orders", async () => {
            axios.get.mockResolvedValue({ data: [] });
            renderWithRouter(<Orders />);
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
            });
            expect(screen.getByText("All Orders")).toBeInTheDocument();
            expect(screen.queryByRole("table")).not.toBeInTheDocument();
        });
    });

    // Data Fetching Tests
    describe("Data Fetching", () => {
        test("should fetch orders on mount when user is authenticated", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);
            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledTimes(1);
                expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/orders");
            });
        });
        
        test("should not fetch orders when user is not authenticated", async () => {
            useAuth.mockReturnValue([{ token: null}, jest.fn()]);
            axios.get.mockResolvedValue({ data: [] });

            renderWithRouter(<Orders />);
            
            await waitFor(() => {
                expect(axios.get).not.toHaveBeenCalled();
            }, { timeout: 100 });
        });

        test("should handle API errors gracefully", async () => {
            const error = new Error("Network Error");
            axios.get.mockRejectedValue(error);
            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(console.log).toHaveBeenCalledWith(error);
            });
        });

        test("should refetch orders when auth token changes", async () => {
            const { rerender } = renderWithRouter(<Orders />);
            axios.get.mockResolvedValue({ data: [] });

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledTimes(1);
            });

            // Simulate token change
            useAuth.mockReturnValue([{ ...mockAuth, token: "new-mock-token" }, jest.fn()]);
            rerender(<BrowserRouter><Orders /></BrowserRouter>);

            await waitFor(() => {
                expect(axios.get).toHaveBeenCalledTimes(2);
            });
        });
    });

    // Order Display Tests
    describe("Order Display", () => {
        test("should display all orders", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getAllByRole("table")).toHaveLength(2);
            });
        });

        test("should display order status correctly", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("Processing")).toBeInTheDocument();
                expect(screen.getByText("Shipped")).toBeInTheDocument();
            });
        });

        test("should display buyer names", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("Chicken")).toBeInTheDocument();
                expect(screen.getByText("Egg")).toBeInTheDocument();
            });
        });

        test("should display payment status as Success when payment is successful", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("Success")).toBeInTheDocument();
            });
        });

        test("should display payment status as Failed when payment is not successful", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });
            renderWithRouter(<Orders />);
            await waitFor(() => {
                expect(screen.getByText("Failed")).toBeInTheDocument();
            });
        });

        test("should display correct product quantity", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                const quantities = screen.getAllByText(/2|1/);
                // First order has 2 products, second has 1
                expect(quantities.length).toBeGreaterThan(0);
            });
        });

        test("should display order numbers correctly", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                const ones = screen.getAllByText("1");
                const twos = screen.getAllByText("2");
                
                expect(ones.length).toBeGreaterThan(0);
                expect(twos.length).toBeGreaterThan(0);
            });
        });

        test("should display dates using moment fromNow", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                const dates = screen.getAllByText("2 days ago");
                expect(dates).toHaveLength(2);
            });
        });
    });

    // Product Display Tests
    describe("Product Display", () => {
        test("should display all products for each order", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("Novel")).toBeInTheDocument();
                expect(screen.getByText("NUS T-Shirt")).toBeInTheDocument();
                expect(screen.getByText("Laptop")).toBeInTheDocument();
            });
        });

        test("should display product descriptions (truncated)", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                // Component truncates to 30 characters
                expect(
                    screen.getByText("A thrilling mystery novel.")
                ).toBeInTheDocument();
                expect(screen.getByText("A comfortable NUS branded t-sh")).toBeInTheDocument();
            });
        });

        test("should display product prices", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("Price : 14.99")).toBeInTheDocument();
                expect(screen.getByText("Price : 4.99")).toBeInTheDocument();
                expect(screen.getByText("Price : 1499.99")).toBeInTheDocument();
            });
        });

        test("should display product images with correct src", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByAltText("Novel")).toHaveAttribute(
                    "src", "/api/v1/product/product-photo/Novel"
                );
                expect(screen.getByAltText("NUS T-Shirt")).toHaveAttribute(
                    "src", "/api/v1/product/product-photo/NUS T-Shirt"
                );
                expect(screen.getByAltText("Laptop")).toHaveAttribute(
                    "src", "/api/v1/product/product-photo/Laptop"
                );
            });
        });

        test("should display product images with correct alt text", async () => {
            axios.get.mockResolvedValue({ data: mockOrders });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByAltText("Novel")).toBeInTheDocument();
                expect(screen.getByAltText("NUS T-Shirt")).toBeInTheDocument();
                expect(screen.getByAltText("Laptop")).toBeInTheDocument();
            });
        });
    });


    // Edge Case Tests
    describe("Edge Cases", () => {
        test("should handle orders with no products", async () => {
            const ordersWithNoProducts = [
                {
                    _id: "order3",
                    status: "Cancelled",
                    buyer: { name: "Duck" },
                    createAt: "2026-01-03T09:15:00Z",
                    payment: { success: false },
                    products: [],
                },
            ];

            axios.get.mockResolvedValue({ data: ordersWithNoProducts });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByText("0")).toBeInTheDocument(); // Quantity
                expect(screen.getByText("Duck")).toBeInTheDocument();
            });
        });

        test("should handle missing buyer information", async () => {
            const ordersWithNoBuyer = [
                {
                    _id: "order4",
                    status: "Processing",
                    buyer: null,
                    createAt: "2026-01-04T09:15:00Z",
                    payment: { success: true },
                    products: [],
                },
            ];

            axios.get.mockResolvedValue({ data: ordersWithNoBuyer });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                expect(screen.getByRole("table")).toBeInTheDocument();
            });
        });

        test("should handle very long product descriptions", async () => {
            const ordersWithLongDescription = [
                {
                    _id: "order5",
                    status: "Delivered",
                    buyer: { name: "Fish" },
                    createAt: "2026-01-01T12:00:00Z",
                    payment: { success: true },
                    products: [
                        {
                            _id: "Smartphone",
                            name: "Smartphone",
                            description: "This is a very long description that should be truncated when displayed in the orders page to ensure that the UI remains clean and readable for users browsing through their order history.",
                            price: 999.99
                        },
                    ],
                },
            ];

            axios.get.mockResolvedValue({ data: ordersWithLongDescription });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                // Should only show first 30 characters
                expect(
                    screen.getByText("This is a very long descriptio")
                ).toBeInTheDocument();
                expect(
                    screen.queryByText(
                        "This is a very long description that should be truncated"
                    )
                ).not.toBeInTheDocument();
            });
        });

        test("should handle multiple orders from same buyer", async () => {
            const multipleOrdersSameBuyer = [
                {
                    _id: "order6",
                    status: "Processing",
                    buyer: { name: "Repeat Customer" },
                    createAt: "2026-01-15T10:30:00Z",
                    payment: { success: true },
                    products: [
                        { _id: "prod5", name: "Item 1", description: "Desc 1", price: 10 },
                    ],
                },
                {
                    _id: "order7",
                    status: "Shipped",
                    buyer: { name: "Repeat Customer" },
                    createAt: "2026-01-10T14:20:00Z",
                    payment: { success: true },
                    products: [
                        { _id: "prod6", name: "Item 2", description: "Desc 2", price: 20 },
                    ],
                },
            ];

            axios.get.mockResolvedValue({ data: multipleOrdersSameBuyer });

            renderWithRouter(<Orders />);

            await waitFor(() => {
                const customerNames = screen.getAllByText("Repeat Customer");
                expect(customerNames).toHaveLength(2);
            });
        });
    });
});