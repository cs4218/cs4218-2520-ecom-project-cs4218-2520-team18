// Lim Kok Liang - A0252776U

import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import CategoryForm from "./CategoryForm";

describe("CategoryForm", () => {
  const mockHandleSubmit = jest.fn((e) => e.preventDefault());
  const mockSetValue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (value = "") =>
    render(
      <CategoryForm
        handleSubmit={mockHandleSubmit}
        value={value}
        setValue={mockSetValue}
      />
    );

  describe("rendering", () => {
    it("should render a text input with the correct placeholder", () => {
      renderComponent();
      expect(
        screen.getByPlaceholderText("Enter new category")
      ).toBeInTheDocument();
    });

    it("should render the input with the provided value", () => {
      renderComponent("Books");
      expect(screen.getByPlaceholderText("Enter new category")).toHaveValue(
        "Books"
      );
    });

    it("should render a Submit button", () => {
      renderComponent();
      expect(
        screen.getByRole("button", { name: "Submit" })
      ).toBeInTheDocument();
    });
  });

  describe("input onChange", () => {
    it("should call setValue with the new input value when text is typed", () => {
      renderComponent();
      const input = screen.getByPlaceholderText("Enter new category");
      fireEvent.change(input, { target: { value: "Electronics" } });
      expect(mockSetValue).toHaveBeenCalledTimes(1);
      expect(mockSetValue).toHaveBeenCalledWith("Electronics");
    });

    it("should call setValue with an empty string when input is cleared", () => {
      renderComponent("Books");
      const input = screen.getByPlaceholderText("Enter new category");
      fireEvent.change(input, { target: { value: "" } });
      expect(mockSetValue).toHaveBeenCalledWith("");
    });
  });

  describe("form onSubmit", () => {
    it("should call handleSubmit when the form is submitted", () => {
      renderComponent();
      fireEvent.submit(screen.getByRole("button", { name: "Submit" }).closest("form"));
      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });

    it("should call handleSubmit when the Submit button is clicked", () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: "Submit" }));
      expect(mockHandleSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
