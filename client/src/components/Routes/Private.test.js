import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import axios from "axios";
import PrivateRoute from "./Private";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "../../context/auth";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Outlet: () => <div data-testid="private-content">Private Content</div>,
}));

jest.mock("../Spinner", () => () => (
  <div data-testid="spinner">Loading...</div>
));

describe("Private Route Unit Tests", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("when user is authenticated", () => {
    it("renders the private content", async () => {
      // Arrange
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "test-token" },
        jest.fn(),
      ]);
      axios.get.mockResolvedValue({ data: { ok: true } });

      // Act
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
      });

      await waitFor(() => {
        expect(
          document.querySelector('[data-testid="private-content"]'),
        ).toBeInTheDocument();
      });
    });
  });

  describe("when user is not authenticated", () => {
    it("should not call the API and block access if no token exists", async () => {
      // Arrange
      useAuth.mockReturnValue([{}, jest.fn()]);
      axios.get.mockResolvedValue({ data: { ok: false } });

      // Act
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/user-auth");
      });
    });
  });

  describe("when token exists but is invalid (Server rejects)", () => {
    it("should call API but block access to private route", async () => {
      // Arrange
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "expired-token" },
        jest.fn(),
      ]);
      axios.get.mockResolvedValue({ data: { ok: false } });

      // Act
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
      });

      await waitFor(() => {
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
        expect(screen.queryByTestId("private-content")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    it("should handle API errors gracefully", async () => {
      // Arrange
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "test-token" },
        jest.fn(),
      ]);
      axios.get.mockRejectedValue(new Error("Network Error"));

      // Act
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
        expect(screen.queryByTestId("private-content")).not.toBeInTheDocument();
      });
    });
  });

  describe("Whitespace handling", () => {
    it("should treat empty string token as no token", async () => {
      // Arrange
      useAuth.mockReturnValue([
        { user: { name: "Test User" }, token: "" },
        jest.fn(),
      ]);
      axios.get.mockResolvedValue({ data: { ok: false } });

      // Act
      render(
        <MemoryRouter>
          <Routes>
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<div>Private Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("spinner")).toBeInTheDocument();
        expect(screen.queryByTestId("private-content")).not.toBeInTheDocument();
      });
    });
  });
});
