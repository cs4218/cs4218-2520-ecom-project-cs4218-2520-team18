// Lim Kok Liang - A0252776U

import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Products from "./Products";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
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

describe("Products", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockResolvedValue({ data: { products: mockProducts } });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Products />
      </MemoryRouter>
    );

  describe("product fetching on mount", () => {
    it("should call the get-product API on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/product/get-product");
      });
    });

    it("should render product names after successful fetch", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Product One")).toBeInTheDocument();
        expect(screen.getByText("Product Two")).toBeInTheDocument();
      });
    });

    it("should render product descriptions after successful fetch", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Description one")).toBeInTheDocument();
        expect(screen.getByText("Description two")).toBeInTheDocument();
      });
    });

    it("should link each product to its update page using its slug", async () => {
      renderComponent();
      await waitFor(() => {
        const links = screen.getAllByRole("link");
        expect(links[0]).toHaveAttribute(
          "href",
          "/dashboard/admin/product/product-one"
        );
        expect(links[1]).toHaveAttribute(
          "href",
          "/dashboard/admin/product/product-two"
        );
      });
    });

    it("should set product image src to the product-photo API endpoint", async () => {
      renderComponent();
      await waitFor(() => {
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
    });
  });

  describe("error handling", () => {
    it("should show error toast when API call fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      renderComponent();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something Went Wrong");
      });
    });

    it("should log the error to console when API call fails", async () => {
      const error = new Error("Network error");
      axios.get.mockRejectedValueOnce(error);
      renderComponent();
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(error);
      });
    });

    it("should render no product cards when API returns empty array", async () => {
      axios.get.mockResolvedValueOnce({ data: { products: [] } });
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryAllByRole("link")).toHaveLength(0);
    });
  });
});
