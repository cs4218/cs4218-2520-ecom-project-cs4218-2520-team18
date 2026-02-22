// Lim Kok Liang - A0252776U

import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import CreateCategory from "./CreateCategory";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

jest.mock("../../components/Form/CategoryForm", () =>
  ({ handleSubmit, value, setValue }) => (
    <form onSubmit={handleSubmit} data-testid="category-form">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        data-testid="category-input"
      />
      <button type="submit">Submit</button>
    </form>
  )
);

jest.mock("antd", () => ({
  Modal: ({ children, visible, onCancel }) =>
    visible ? (
      <div data-testid="modal">
        <button onClick={onCancel} data-testid="modal-cancel">
          Cancel
        </button>
        {children}
      </div>
    ) : null,
}));

const mockCategories = [
  { _id: "cat1", name: "Electronics" },
  { _id: "cat2", name: "Clothing" },
];

describe("CreateCategory", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
    axios.post.mockResolvedValue({ data: { success: true } });
    axios.put.mockResolvedValue({ data: { success: true } });
    axios.delete.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <CreateCategory />
      </MemoryRouter>
    );

  const waitForCategories = async () => {
    await waitFor(() => {
      expect(screen.getByText("Electronics")).toBeInTheDocument();
    });
  };

  // ─── getAllCategory ─────────────────────────────────────────────────────────

  describe("category fetching on mount", () => {
    it("should fetch categories from the API on mount", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/category/get-category"
        );
      });
    });

    it("should display fetched category names", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Electronics")).toBeInTheDocument();
        expect(screen.getByText("Clothing")).toBeInTheDocument();
      });
    });

    it("should not display categories when API returns success false", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: false, category: mockCategories },
      });
      renderComponent();
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      expect(screen.queryByText("Electronics")).not.toBeInTheDocument();
    });

    it("should show error toast when category fetch fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Network error"));
      renderComponent();
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Something wwent wrong in getting catgeory"
        );
      });
    });
  });

  // ─── handleSubmit (create) ──────────────────────────────────────────────────

  describe("category creation (handleSubmit)", () => {
    it("should POST to create-category with the entered name", async () => {
      renderComponent();
      await waitForCategories();

      const inputs = screen.getAllByTestId("category-input");
      fireEvent.change(inputs[0], { target: { value: "Books" } });

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[0]);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/category/create-category",
          { name: "Books" }
        );
      });
    });

    it("should show success toast and refetch categories on successful create", async () => {
      renderComponent();
      await waitForCategories();

      const inputs = screen.getAllByTestId("category-input");
      fireEvent.change(inputs[0], { target: { value: "Books" } });

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Books is created");
        expect(axios.get).toHaveBeenCalledTimes(2); // mount + refetch
      });
    });

    it("should show error toast with API message when create returns success false", async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Category already exists" },
      });
      renderComponent();
      await waitForCategories();

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Category already exists");
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show error toast and not navigate when create throws an error", async () => {
      axios.post.mockRejectedValueOnce(new Error("Network failure"));
      renderComponent();
      await waitForCategories();

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "somthing went wrong in input form"
        );
      });
    });
  });

  // ─── handleUpdate ───────────────────────────────────────────────────────────

  describe("category update (handleUpdate)", () => {
    const openEditModal = async () => {
      renderComponent();
      await waitForCategories();
      const editButtons = screen.getAllByText("Edit");
      fireEvent.click(editButtons[0]); // opens modal for "Electronics"
      await waitFor(() =>
        expect(screen.getByTestId("modal")).toBeInTheDocument()
      );
    };

    it("should open the edit modal when Edit is clicked", async () => {
      await openEditModal();
      expect(screen.getByTestId("modal")).toBeInTheDocument();
    });

    it("should pre-fill the modal input with the selected category name", async () => {
      await openEditModal();
      // modal's CategoryForm input is the second one rendered
      const inputs = screen.getAllByTestId("category-input");
      expect(inputs[1]).toHaveValue("Electronics");
    });

    it("should PUT to update-category with the new name on submit", async () => {
      await openEditModal();

      const inputs = screen.getAllByTestId("category-input");
      fireEvent.change(inputs[1], { target: { value: "Consumer Electronics" } });

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[1]);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/category/update-category/cat1",
          { name: "Consumer Electronics" }
        );
      });
    });

    it("should show success toast, close modal, and refetch after successful update", async () => {
      await openEditModal();

      const inputs = screen.getAllByTestId("category-input");
      fireEvent.change(inputs[1], { target: { value: "New Name" } });

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[1]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("New Name is updated");
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
        expect(axios.get).toHaveBeenCalledTimes(2); // mount + refetch
      });
    });

    it("should show error toast with API message when update returns success false", async () => {
      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Update failed" },
      });
      await openEditModal();

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Update failed");
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show error toast when update throws an error", async () => {
      axios.put.mockRejectedValueOnce(new Error("Network failure"));
      await openEditModal();

      const forms = screen.getAllByTestId("category-form");
      fireEvent.submit(forms[1]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });

    it("should close the modal when cancel is clicked", async () => {
      await openEditModal();
      fireEvent.click(screen.getByTestId("modal-cancel"));
      await waitFor(() => {
        expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
      });
    });
  });

  // ─── handleDelete ───────────────────────────────────────────────────────────

  describe("category deletion (handleDelete)", () => {
    it("should call delete API with the correct category ID", async () => {
      renderComponent();
      await waitForCategories();

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]); // deletes "Electronics" (cat1)

      await waitFor(() => {
        expect(axios.delete).toHaveBeenCalledWith(
          "/api/v1/category/delete-category/cat1"
        );
      });
    });

    it("should show success toast and refetch categories after successful delete", async () => {
      renderComponent();
      await waitForCategories();

      axios.get.mockClear();
      axios.get.mockResolvedValue({
        data: { success: true, category: [mockCategories[1]] },
      });

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("category is deleted");
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/category/get-category"
        );
      });
    });

    it("should show error toast with API message when delete returns success false", async () => {
      axios.delete.mockResolvedValueOnce({
        data: { success: false, message: "Cannot delete category" },
      });
      renderComponent();
      await waitForCategories();

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Cannot delete category");
      });
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("should show error toast when delete throws an error", async () => {
      axios.delete.mockRejectedValueOnce(new Error("Network failure"));
      renderComponent();
      await waitForCategories();

      const deleteButtons = screen.getAllByText("Delete");
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Somtihing went wrong");
      });
    });
  });
});
