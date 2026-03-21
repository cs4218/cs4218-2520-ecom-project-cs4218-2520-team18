// Lim Kok Liang, A0252776U

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import CreateProduct from "./CreateProduct";
import toast from "react-hot-toast";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

jest.mock("../../components/Header", () => () => (
  <div data-testid="header">Header</div>
));

jest.mock("../../components/Footer", () => () => (
  <div data-testid="footer">Footer</div>
));

jest.mock("antd", () => {
  const MockSelect = ({ children, onChange, placeholder }) => (
    <select
      data-testid={`select-${placeholder}`}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">--</option>
      {children}
    </select>
  );
  MockSelect.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );
  return { Select: MockSelect };
});

global.URL.createObjectURL = jest.fn(() => "mock-url");

const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

describe("CreateProduct - Integration Tests", () => {
  const renderPage = (initialPath = "/dashboard/admin/create-product") =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/dashboard/admin/create-product"
            element={<CreateProduct />}
          />
          <Route
            path="/dashboard/admin/products"
            element={<div data-testid="products-page">Products Page</div>}
          />
        </Routes>
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  test("integrates Layout + AdminMenu + category load on mount", async () => {
    renderPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Create Product" })
    ).toBeInTheDocument();
  });

  test("creates product and navigates to products page", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Gaming Keyboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: { value: "Mechanical keyboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a Price"), {
      target: { value: "129.99" },
    });
    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "20" },
    });

    fireEvent.change(screen.getByTestId("select-Select a category"), {
      target: { value: "cat1" },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Product Created Successfully"
    );
    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent(
        "/dashboard/admin/products"
      );
    });
    expect(screen.getByTestId("products-page")).toBeInTheDocument();
  });
});
