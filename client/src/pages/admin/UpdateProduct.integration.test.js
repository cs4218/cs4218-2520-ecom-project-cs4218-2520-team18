// Lim Kok Liang, A0252776U

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import UpdateProduct from "./UpdateProduct";
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
  const MockSelect = ({ children, onChange, placeholder, value }) => (
    <select
      data-testid={`select-${placeholder}`}
      onChange={(e) => onChange?.(e.target.value)}
      value={value || ""}
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

const mockProduct = {
  _id: "prod1",
  name: "Test Product",
  description: "Test Description",
  price: 100,
  quantity: 10,
  shipping: true,
  category: { _id: "cat1", name: "Electronics" },
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
};

describe("UpdateProduct - Integration Tests", () => {
  const renderPage = (initialPath = "/dashboard/admin/product/test-product") =>
    render(
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route
            path="/dashboard/admin/product/:slug"
            element={<UpdateProduct />}
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

    axios.get.mockImplementation((url) => {
      if (url.includes("get-product")) {
        return Promise.resolve({ data: { product: mockProduct } });
      }
      if (url.includes("get-category")) {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });

    jest.spyOn(window, "prompt").mockImplementation(() => "yes");
  });

  afterEach(() => {
    window.prompt.mockRestore();
  });

  test("loads product + categories and renders admin layout", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      );
    });

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("write a name")
      ).toHaveValue("Test Product");
    });

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
  });

  test("updates product and navigates to products page", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("write a name")
      ).toHaveValue("Test Product");
    });

    fireEvent.click(screen.getByText("UPDATE PRODUCT"));

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/product/update-product/prod1",
        expect.any(FormData)
      );
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Product Updated Successfully"
    );

    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent(
        "/dashboard/admin/products"
      );
    });
    expect(screen.getByTestId("products-page")).toBeInTheDocument();
  });

  test("deletes product and navigates to products page", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("write a name")
      ).toHaveValue("Test Product");
    });

    fireEvent.click(screen.getByText("DELETE PRODUCT"));

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith(
        "/api/v1/product/delete-product/prod1"
      );
    });

    expect(toast.success).toHaveBeenCalledWith("Product DEleted Succfully");

    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent(
        "/dashboard/admin/products"
      );
    });
  });
});
