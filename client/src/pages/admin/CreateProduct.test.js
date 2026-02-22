// Lim Kok Liang - A0252776U

import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";
import { MemoryRouter } from "react-router-dom";

// Mock external services
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

// Mock antd Select to a simple HTML select for logic testing
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

describe("CreateProduct", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
    axios.post.mockResolvedValue({ data: { success: false } });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );

  describe("category fetching on mount", () => {
    it("should fetch categories from API on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/category/get-category"
        );
      });
    });

    it("should display error toast when category fetch fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      renderComponent();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });

    it("should not set categories when API returns success false", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: false, message: "Failed" },
      });
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/category/get-category"
        );
      });
      // No error toast should be shown for non-success response
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe("product creation (handleCreate)", () => {
    it("should call axios.post with FormData when CREATE PRODUCT is clicked", async () => {
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Test Product" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a description"), {
        target: { value: "A test description" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "99" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "5" },
      });

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );
    });

    it("should include correct fields in FormData", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Widget" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a description"), {
        target: { value: "A useful widget" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "25" },
      });
      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "10" },
      });
      fireEvent.change(screen.getByTestId("select-Select a category"), {
        target: { value: "cat1" },
      });

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("name", "Widget");
      expect(appendSpy).toHaveBeenCalledWith("description", "A useful widget");
      expect(appendSpy).toHaveBeenCalledWith("price", "25");
      expect(appendSpy).toHaveBeenCalledWith("quantity", "10");
      expect(appendSpy).toHaveBeenCalledWith("category", "cat1");
      expect(appendSpy).toHaveBeenCalledWith("photo", "");

      appendSpy.mockRestore();
    });

    it("should show success toast and navigate when API returns success true", async () => {
      axios.post.mockResolvedValue({ data: { success: true } });
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Product Created Successfully");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });

    it("should show error toast with API message when API returns success false", async () => {
      axios.post.mockResolvedValue({
        data: { success: false, message: "Product creation failed" },
      });
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Product creation failed");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should show error toast when creation throws an error", async () => {
      axios.post.mockImplementation(() => {
        throw new Error("Network failure");
      });
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      fireEvent.click(screen.getByText("CREATE PRODUCT"));

      expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });
  });

  describe("photo upload", () => {
    it("should set photo state when a file is selected via the file input", async () => {
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const file = new File(["dummy"], "photo.png", { type: "image/png" });
      const fileInput = screen.getByLabelText("Upload Photo");

      fireEvent.change(fileInput, { target: { files: [file] } });

      // After selecting a file, the label should show the file name
      expect(screen.getByText("photo.png")).toBeInTheDocument();
      // And createObjectURL should have been called for the preview
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    });
  });

  describe("shipping selection", () => {
    it("should update shipping state when a shipping option is selected", async () => {
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // The page has two selects: [0] = category, [1] = shipping
      const selects = screen.getAllByRole("combobox");
      const shippingSelect = selects[1];
      fireEvent.change(shippingSelect, { target: { value: "1" } });

      // Verify the select value was updated
      expect(shippingSelect.value).toBe("1");
    });
  });
});
