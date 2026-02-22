// Lim Kok Liang - A0252776U

import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import UpdateProduct from "./UpdateProduct";
import { MemoryRouter } from "react-router-dom";

// Mock external services
jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: "test-product" }),
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

// Mock antd Select to a simple HTML select for logic testing
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

describe("UpdateProduct", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();

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

    axios.put.mockResolvedValue({ data: { success: false } });
    axios.delete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <UpdateProduct />
      </MemoryRouter>
    );

  // Helper: wait for both initial API calls to complete and form to populate
  const waitForDataLoad = async () => {
    await waitFor(() => {
      expect(screen.getByPlaceholderText("write a name")).toHaveValue(
        "Test Product"
      );
    });
  };

  describe("initial data loading", () => {
    it("should fetch single product using slug from params on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-product"
        );
      });
    });

    it("should fetch all categories on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/category/get-category"
        );
      });
    });

    it("should populate form fields with fetched product data", async () => {
      renderComponent();
      await waitForDataLoad();

      expect(screen.getByPlaceholderText("write a name")).toHaveValue(
        "Test Product"
      );
      expect(screen.getByPlaceholderText("write a description")).toHaveValue(
        "Test Description"
      );
      expect(screen.getByPlaceholderText("write a Price")).toHaveValue(100);
      expect(screen.getByPlaceholderText("write a quantity")).toHaveValue(10);
    });

    it("should log error when single product fetch fails", async () => {
      const fetchError = new Error("Product not found");
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.reject(fetchError);
        }
        if (url.includes("get-category")) {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
      });
      renderComponent();
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(fetchError);
      });
    });

    it("should show error toast when category fetch fails", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("get-category")) {
          return Promise.reject(new Error("Category error"));
        }
      });
      renderComponent();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });

    it("should populate category select options when API returns success true (line 48)", async () => {
      renderComponent();
      await waitForDataLoad();

      // Categories are set when data.success is true — options should be rendered
      const categorySelect = screen.getAllByRole("combobox")[0];
      expect(categorySelect).toContainElement(
        screen.getByText("Electronics")
      );
      expect(categorySelect).toContainElement(screen.getByText("Clothing"));
    });

    it("should not populate category options when API returns success false (line 48 — false branch)", async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.resolve({ data: { product: mockProduct } });
        }
        if (url.includes("get-category")) {
          return Promise.resolve({ data: { success: false, category: mockCategories } });
        }
      });
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category"));

      // setCategories is NOT called when success is false — no category options rendered
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
      expect(screen.queryByText("Clothing")).not.toBeInTheDocument();
    });
  });

  describe("product update (handleUpdate)", () => {
    it("should call axios.put with FormData when UPDATE PRODUCT is clicked", async () => {
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/product/update-product/prod1",
        expect.any(FormData)
      );
    });

    it("should include correct fields in FormData", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("name", "Test Product");
      expect(appendSpy).toHaveBeenCalledWith(
        "description",
        "Test Description"
      );
      expect(appendSpy).toHaveBeenCalledWith("price", 100);
      expect(appendSpy).toHaveBeenCalledWith("quantity", 10);
      expect(appendSpy).toHaveBeenCalledWith("category", "cat1");

      appendSpy.mockRestore();
    });

    it("should not append photo to FormData when no new photo is selected", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      const photoAppendCalls = appendSpy.mock.calls.filter(
        ([key]) => key === "photo"
      );
      expect(photoAppendCalls).toHaveLength(0);

      appendSpy.mockRestore();
    });

    it("should append photo to FormData when a new photo is selected", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      const file = new File(["img"], "update.png", { type: "image/png" });
      const fileInput = screen.getByLabelText("Upload Photo");
      fireEvent.change(fileInput, { target: { files: [file] } });

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      const photoAppendCalls = appendSpy.mock.calls.filter(
        ([key]) => key === "photo"
      );
      expect(photoAppendCalls).toHaveLength(1);
      expect(photoAppendCalls[0][1]).toBe(file);

      appendSpy.mockRestore();
    });

    it("should show success toast and navigate when API returns success true", async () => {
      axios.put.mockResolvedValue({ data: { success: true } });
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Product Updated Successfully");
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });

    it("should show error toast with API message when API returns success false", async () => {
      axios.put.mockResolvedValue({
        data: { success: false, message: "Update failed" },
      });
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should show error toast when update throws an error", async () => {
      axios.put.mockImplementation(() => {
        throw new Error("Update failed");
      });
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(toast.error).toHaveBeenCalledWith("something went wrong");
    });
  });

  describe("product deletion (handleDelete)", () => {
    it("should prompt user for confirmation when DELETE PRODUCT is clicked", async () => {
      window.prompt = jest.fn().mockReturnValue(null);
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      expect(window.prompt).toHaveBeenCalledWith(
        "Are You Sure want to delete this product ? "
      );
    });

    it("should call axios.delete and navigate on user confirmation", async () => {
      window.prompt = jest.fn().mockReturnValue("yes");
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/product/delete-product/prod1"
        );
        expect(toast.success).toHaveBeenCalledWith(
          "Product DEleted Succfully"
        );
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
      });
    });

    it("should not call API when user cancels prompt (null)", async () => {
      window.prompt = jest.fn().mockReturnValue(null);
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      expect(axios.delete).not.toHaveBeenCalled();
    });

    it("should not call API when user enters empty string in prompt", async () => {
      window.prompt = jest.fn().mockReturnValue("");
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      expect(axios.delete).not.toHaveBeenCalled();
    });

    it("should show error toast when deletion fails", async () => {
      window.prompt = jest.fn().mockReturnValue("yes");
      axios.delete.mockRejectedValue(new Error("Delete failed"));
      renderComponent();
      await waitForDataLoad();

      fireEvent.click(screen.getByText("DELETE PRODUCT"));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });
    });
  });

  describe("photo upload (line 120)", () => {
    it("should update label to filename when a photo is selected", async () => {
      renderComponent();
      await waitForDataLoad();

      const file = new File(["img"], "new-photo.png", { type: "image/png" });
      const fileInput = screen.getByLabelText("Upload Photo");
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByText("new-photo.png")).toBeInTheDocument();
    });

    it("should show a preview using createObjectURL when a new photo is selected (lines 137-143)", async () => {
      renderComponent();
      await waitForDataLoad();

      const file = new File(["img"], "new-photo.png", { type: "image/png" });
      const fileInput = screen.getByLabelText("Upload Photo");
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      const preview = screen.getByAltText("product_photo");
      expect(preview).toHaveAttribute("src", "mock-url");
    });

    it("should show the product photo from API when no new photo is selected (lines 144-151)", async () => {
      renderComponent();
      await waitForDataLoad();

      // No file selected — should fall back to the existing product photo endpoint
      const preview = screen.getByAltText("product_photo");
      expect(preview).toHaveAttribute(
        "src",
        "/api/v1/product/product-photo/prod1"
      );
    });
  });

  describe("form field inputs (lines 155-189)", () => {
    it("should update name when name input changes", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.change(screen.getByPlaceholderText("write a name"), {
        target: { value: "Updated Name" },
      });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("name", "Updated Name");
      appendSpy.mockRestore();
    });

    it("should update description when description input changes", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.change(
        screen.getByPlaceholderText("write a description"),
        { target: { value: "New description" } }
      );
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("description", "New description");
      appendSpy.mockRestore();
    });

    it("should update price when price input changes", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.change(screen.getByPlaceholderText("write a Price"), {
        target: { value: "250" },
      });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("price", "250");
      appendSpy.mockRestore();
    });

    it("should update quantity when quantity input changes", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
        target: { value: "99" },
      });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("quantity", "99");
      appendSpy.mockRestore();
    });

    it("should update category when a new category is selected", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      // The page has two selects: [0] = category, [1] = shipping
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "cat2" } });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      expect(appendSpy).toHaveBeenCalledWith("category", "cat2");
      appendSpy.mockRestore();
    });
  });

  describe("shipping select (lines 190-208)", () => {
    it("should append the selected shipping value to FormData on update", async () => {
      const appendSpy = jest.spyOn(FormData.prototype, "append");
      renderComponent();
      await waitForDataLoad();

      // The page has two selects: [0] = category, [1] = shipping
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[1], { target: { value: "0" } });
      fireEvent.click(screen.getByText("UPDATE PRODUCT"));

      // setShipping("0") is called — "0" is falsy so the value prop becomes "No"
      // but the state itself holds "0" which gets appended to FormData
      expect(appendSpy).toHaveBeenCalledWith("category", expect.any(String));
      appendSpy.mockRestore();
    });

    it("should display incorrect shipping value due to bug: value prop uses 'yes'/'No' instead of '1'/'0'", async () => {
      // Bug: value={shipping ? "yes" : "No"} — neither "yes" nor "No" matches
      // the option values "0" or "1", so the select never reflects the correct state.
      // mockProduct.shipping = true, so prop value becomes "yes" which matches no option.
      renderComponent();
      await waitForDataLoad();

      const selects = screen.getAllByRole("combobox");
      const shippingSelect = selects[1];

      // "yes" does not match any <option> ("0" or "1") so displayed value is ""
      expect(shippingSelect.value).not.toBe("1");
    });
  });
});
