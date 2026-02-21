// Loh Ze Qing Norbert, A0277473R

import React from "react";
import { render, screen } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/auth";

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout-mock" title={title}>
    {children}
  </div>
));

jest.mock("../../components/UserMenu", () => () => (
  <div data-testid="user-menu-mock">User Menu Mock</div>
));

describe("Dashboard Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should display user information from auth context", () => {
      // Arrange
      const mockUser = {
        name: "John Doe",
        email: "john.doe@example.com",
        address: "123 Test St, Test City, TC 12345",
      };
      useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
      expect(screen.getByTestId("layout-mock")).toHaveAttribute(
        "title",
        "Dashboard - Ecommerce App",
      );
      expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();

      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      expect(screen.getByText(mockUser.address)).toBeInTheDocument();
    });

    it("should render layout and menu even when user is missing", () => {
      // Arrange
      useAuth.mockReturnValue([{}, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should display available data when some user fields are missing", () => {
      // Arrange
      const mockUser = {
        name: "Jane Doe",
        // email is missing
        address: "456 Sample Rd, Sample City, SC 67890",
      };
      useAuth.mockReturnValue([{ user: mockUser }, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.address)).toBeInTheDocument();
      // Email field should not display the missing email
      expect(screen.queryByText("undefined")).not.toBeInTheDocument();
    });

    it("should not crash when auth state is null", () => {
      // Arrange
      useAuth.mockReturnValue([null, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
    });

    it("should not crash when auth is empty object", () => {
      // Arrange
      useAuth.mockReturnValue([{}, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      expect(screen.getByTestId("layout-mock")).toBeInTheDocument();
      expect(screen.getByTestId("user-menu-mock")).toBeInTheDocument();
    });
  });
});
