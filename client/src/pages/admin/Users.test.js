// Lim Kok Liang - A0252776U

import React from "react";
import { render, screen } from "@testing-library/react";
import Users from "./Users";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout" data-title={title}>
    {children}
  </div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

describe("Users", () => {
  const renderComponent = () =>
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    );

  it("should render the page heading", () => {
    renderComponent();
    expect(screen.getByText("All Users")).toBeInTheDocument();
  });

  it("should pass the correct title to Layout", () => {
    renderComponent();
    expect(screen.getByTestId("layout")).toHaveAttribute(
      "data-title",
      "Dashboard - All Users"
    );
  });

  it("should render the AdminMenu", () => {
    renderComponent();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
  });
});
