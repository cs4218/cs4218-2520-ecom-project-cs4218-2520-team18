// Lim Kok Liang, A0252776U

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import Products from "./Products";
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

const mockProducts = [
  {
    _id: "p1",
    name: "Product One",
    description: "Description one",
    slug: "product-one",
  },
  {
    _id: "p2",
    name: "Product Two",
    description: "Description two",
    slug: "product-two",
  },
];

describe("Products - Integration Tests", () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { products: mockProducts } });
  });

  test("loads products and renders admin layout", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    expect(screen.getByText("All Products List")).toBeInTheDocument();
  });

  test("renders product cards and links", async () => {
    // Lim Kok Liang, A0252776U
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Product One")).toBeInTheDocument();
      expect(screen.getByText("Product Two")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", {
        name: "Product One Product One Description one",
      })
    ).toHaveAttribute("href", "/dashboard/admin/product/product-one");
    expect(
      screen.getByRole("link", {
        name: "Product Two Product Two Description two",
      })
    ).toHaveAttribute("href", "/dashboard/admin/product/product-two");

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1"
    );
    expect(images[1]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p2"
    );
  });

  test("shows error toast when product load fails", async () => {
    // Lim Kok Liang, A0252776U
    axios.get.mockRejectedValueOnce(new Error("Network error"));

    renderPage();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
    });
  });
});
