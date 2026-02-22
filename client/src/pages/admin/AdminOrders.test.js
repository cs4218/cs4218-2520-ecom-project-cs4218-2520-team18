// Lim Kok Liang - A0252776U

import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import { useAuth } from "../../context/auth";
import { MemoryRouter } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

// Mock antd Select for logic testability
jest.mock("antd", () => {
  const MockSelect = ({ children, onChange, defaultValue }) => (
    <select
      data-testid="status-select"
      defaultValue={defaultValue}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {children}
    </select>
  );
  MockSelect.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );
  return { Select: MockSelect };
});

const mockOrders = [
  {
    _id: "order1",
    status: "Processing",
    buyer: { name: "John Doe" },
    createAt: "2025-01-15T10:00:00.000Z",
    payment: { success: true },
    products: [
      {
        _id: "prod1",
        name: "Widget",
        description: "A very useful widget for everyday tasks",
        price: 29.99,
      },
    ],
  },
  {
    _id: "order2",
    status: "Not Process",
    buyer: { name: "Jane Smith" },
    createAt: "2025-02-10T14:30:00.000Z",
    payment: { success: false },
    products: [
      {
        _id: "prod2",
        name: "Gadget",
        description: "A compact gadget with many features",
        price: 49.99,
      },
      {
        _id: "prod3",
        name: "Tool",
        description: "Professional grade tool for experts",
        price: 89.99,
      },
    ],
  },
];

describe("AdminOrders", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    useAuth.mockReturnValue([
      { user: { name: "Admin" }, token: "test-token" },
      jest.fn(),
    ]);
    axios.get.mockResolvedValue({ data: mockOrders });
    axios.put.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <AdminOrders />
      </MemoryRouter>
    );

  describe("order fetching on mount", () => {
    it("should fetch orders when auth token is present", async () => {
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
      });
    });

    it("should not fetch orders when auth token is absent", async () => {
      useAuth.mockReturnValue([{ user: null, token: "" }, jest.fn()]);
      renderComponent();

      // Give it time to potentially make the call
      await new Promise((r) => setTimeout(r, 100));

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should not fetch orders when auth is null", async () => {
      useAuth.mockReturnValue([null, jest.fn()]);
      renderComponent();

      await new Promise((r) => setTimeout(r, 100));

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should log error when fetching orders fails", async () => {
      const error = new Error("Network error");
      axios.get.mockRejectedValueOnce(error);
      renderComponent();
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe("order display", () => {
    it("should render buyer names from fetched orders", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      });
    });

    it("should render payment status correctly", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Success")).toBeInTheDocument();
        expect(screen.getByText("Failed")).toBeInTheDocument();
      });
    });

    it("should render product names", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Widget")).toBeInTheDocument();
        expect(screen.getByText("Gadget")).toBeInTheDocument();
        expect(screen.getByText("Tool")).toBeInTheDocument();
      });
    });

    it("should truncate product descriptions to 30 characters", async () => {
      renderComponent();
      await waitFor(() => {
        // "A very useful widget for everyday tasks" → first 30 chars
        expect(
          screen.getByText("A very useful widget for every")
        ).toBeInTheDocument();
      });
    });

    it("should render product prices", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Price : 29.99")).toBeInTheDocument();
        expect(screen.getByText("Price : 49.99")).toBeInTheDocument();
        expect(screen.getByText("Price : 89.99")).toBeInTheDocument();
      });
    });

    it("should render product images with correct src", async () => {
      renderComponent();
      await waitFor(() => {
        const images = screen.getAllByRole("img");
        expect(images[0]).toHaveAttribute(
          "src",
          "/api/v1/product/product-photo/prod1"
        );
        expect(images[1]).toHaveAttribute(
          "src",
          "/api/v1/product/product-photo/prod2"
        );
      });
    });
  });

  describe("order status change (handleChange)", () => {
    it("should call API to update order status when status is changed", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByTestId("status-select");
      fireEvent.change(selects[0], { target: { value: "Shipped" } });

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/auth/order-status/order1",
          { status: "Shipped" }
        );
      });
    });

    it("should refetch orders after status update", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      // Reset the call count after initial fetch
      axios.get.mockClear();
      axios.get.mockResolvedValue({ data: mockOrders });

      const selects = screen.getAllByTestId("status-select");
      fireEvent.change(selects[0], { target: { value: "Shipped" } });

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
      });
    });

    it("should log error when status update fails", async () => {
      const error = new Error("Update failed");
      axios.put.mockRejectedValueOnce(error);

      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
      });

      const selects = screen.getAllByTestId("status-select");
      fireEvent.change(selects[0], { target: { value: "Shipped" } });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe("edge cases", () => {
    it("should render no order tables when orders array is empty", async () => {
      axios.get.mockResolvedValueOnce({ data: [] });
      renderComponent();
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
      expect(screen.queryAllByRole("table")).toHaveLength(0);
    });
  });
});
