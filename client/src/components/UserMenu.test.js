import React from "react";
import { render, screen } from "@testing-library/react";
import UserMenu from "./UserMenu";
import { MemoryRouter } from "react-router-dom";

describe("UserMenu", () => {
  describe("Renders correctly", () => {
    it("should render the dashboard header and navigation link", () => {
      render(
        <MemoryRouter>
          <UserMenu />
        </MemoryRouter>,
      );

      expect(screen.getByRole("heading", { level: 4 })).toHaveTextContent(
        "Dashboard",
      );

      const profileLink = screen.getByRole("link", { name: "Profile" });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");

      const ordersLink = screen.getByRole("link", { name: "Orders" });
      expect(ordersLink).toBeInTheDocument();
      expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
    });
  });

  describe("highlights active link", () => {
    it("should apply active class to the profile link when on profile page", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard/user/profile"]}>
          <UserMenu />
        </MemoryRouter>,
      );

      const profileLink = screen.getByRole("link", { name: "Profile" });
      expect(profileLink).toHaveClass("active");
      const ordersLink = screen.getByRole("link", { name: "Orders" });
      expect(ordersLink).not.toHaveClass("active");
    });

    it("should apply active class to the orders link when on orders page", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard/user/orders"]}>
          <UserMenu />
        </MemoryRouter>,
      );

      const ordersLink = screen.getByRole("link", { name: "Orders" });
      expect(ordersLink).toHaveClass("active");
      const profileLink = screen.getByRole("link", { name: "Profile" });
      expect(profileLink).not.toHaveClass("active");
    });

    it("should not apply active class to any link when on a different page", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard/user/settings"]}>
          <UserMenu />
        </MemoryRouter>,
      );

      const profileLink = screen.getByRole("link", { name: "Profile" });
      expect(profileLink).not.toHaveClass("active");
      const ordersLink = screen.getByRole("link", { name: "Orders" });
      expect(ordersLink).not.toHaveClass("active");
    });
  });
});
