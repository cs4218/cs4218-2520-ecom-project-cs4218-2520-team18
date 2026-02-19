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
    it("should render the Layout and UserMenu components", () => {
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
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toBeInTheDocument();
      expect(layout).toHaveAttribute("title", "Dashboard - Ecommerce App");

      const userMenu = screen.getByTestId("user-menu-mock");
      expect(userMenu).toBeInTheDocument();

      expect(screen.getByTestId("name")).toHaveTextContent(mockUser.name);
      expect(screen.getByTestId("email")).toHaveTextContent(mockUser.email);
      expect(screen.getByTestId("address")).toHaveTextContent(mockUser.address);
    });
  });

  describe("Error Handling", () => {
    it("should display partial data when some user fields are missing", () => {
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
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toBeInTheDocument();

      const userMenu = screen.getByTestId("user-menu-mock");
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByTestId("name")).toHaveTextContent(mockUser.name);
      expect(screen.getByTestId("email")).toHaveTextContent("");
      expect(screen.getByTestId("address")).toHaveTextContent(mockUser.address);
    });

    it("should not crash and display empty fields when user data is missing", () => {
      // Arrange
      useAuth.mockReturnValue([{}, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toBeInTheDocument();

      const userMenu = screen.getByTestId("user-menu-mock");
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByTestId("name")).toBeInTheDocument();
      expect(screen.getByTestId("email")).toBeInTheDocument();
      expect(screen.getByTestId("address")).toBeInTheDocument();
    });

    it("should render safely when auth state is strictly null", () => {
      // Arrange
      useAuth.mockReturnValue([null, jest.fn()]);

      // Act
      render(
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>,
      );

      // Assert
      const layout = screen.getByTestId("layout-mock");
      expect(layout).toBeInTheDocument();

      const userMenu = screen.getByTestId("user-menu-mock");
      expect(userMenu).toBeInTheDocument();
      expect(screen.getByTestId("name")).toBeInTheDocument();
      expect(screen.getByTestId("email")).toBeInTheDocument();
      expect(screen.getByTestId("address")).toBeInTheDocument();
    });
  });
});
