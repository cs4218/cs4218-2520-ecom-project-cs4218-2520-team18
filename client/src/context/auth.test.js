import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./auth";
import axios from "axios";

// Mocking axios
jest.mock("axios", () => ({
  defaults: {
    headers: {
      common: {},
    },
  },
}));

const TestComponent = () => {
  const [auth, setAuth] = useAuth();
  return (
    <div>
      <div data-testid="user">{auth.user ? auth.user.name : "No User"}</div>
      <div data-testid="token">{auth.token || "No Token"}</div>
      <button
        onClick={() =>
          setAuth({ user: { name: "Test User" }, token: "test-token" })
        }
      >
        Set Auth
      </button>
    </div>
  );
};

// Mocking localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    axios.defaults.headers.common = {};
  });

  // Equivalence test for initial state
  describe("Initial State", () => {
    it("should have initial auth state with null user and empty token", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("No User");
        expect(screen.getByTestId("token").textContent).toBe("No Token");
        expect(axios.defaults.headers.common["Authorization"]).toBeFalsy();
      });
    });

    it("should load auth state from localStorage if available", async () => {
      const mockAuth = {
        user: { name: "Stored User" },
        token: "stored-token",
      };
      localStorage.setItem("auth", JSON.stringify(mockAuth));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(localStorage.getItem).toHaveBeenCalledWith("auth");

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("Stored User");
        expect(screen.getByTestId("token").textContent).toBe("stored-token");
        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "stored-token",
        );
      });
    });

    it("should update auth state and axios header when setAuth is called", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      const button = screen.getByText("Set Auth");

      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("Test User");
        expect(screen.getByTestId("token").textContent).toBe("test-token");
        expect(axios.defaults.headers.common["Authorization"]).toBe(
          "test-token",
        );
      });
    });
  });

  describe("Boundary values and Edge Cases", () => {
    it("should handle empty localStorage gracefully", async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("No User");
        expect(screen.getByTestId("token").textContent).toBe("No Token");
      });
    });

    it("should handle malformed localStorage data gracefully", async () => {
      localStorage.setItem("auth", "malformed-json");

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      expect(() => {
        render(
          <AuthProvider>
            <TestComponent />
          </AuthProvider>,
        );
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle partial auth data in localStorage (missing token)", async () => {
      const partialAuth = {
        user: { name: "Partial User" },
      };
      localStorage.setItem("auth", JSON.stringify(partialAuth));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("Partial User");
        expect(screen.getByTestId("token").textContent).toBe("No Token");
      });
    });

    it("should handle partial auth data in localStorage (missing user)", async () => {
      const partialAuth = {
        token: "partial-token",
      };
      localStorage.setItem("auth", JSON.stringify(partialAuth));
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("user").textContent).toBe("No User");
        expect(screen.getByTestId("token").textContent).toBe("partial-token");
      });
    });

    it("should not re-assign axios headers if the token hasn't changed", async () => {
      const spy = jest.fn();
      Object.defineProperty(axios.defaults.headers.common, "Authorization", {
        set: spy,
        configurable: true,
      });

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(spy).toHaveBeenCalledTimes(1);

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("should update axios header only when token changes", async () => {
      const setterSpy = jest.fn();
      let currentToken = "";

      Object.defineProperty(axios.defaults.headers.common, "Authorization", {
        set: setterSpy,
        get: () => currentToken,
        configurable: true,
      });

      let setAuthReference;
      const TestComponent = () => {
        const [, setAuth] = useAuth();
        setAuthReference = setAuth;
        return <div />;
      };

      const { rerender } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(setterSpy).toHaveBeenCalledTimes(1);

      rerender(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>,
      );

      expect(setterSpy).toHaveBeenCalledTimes(1);

      act(() => {
        setAuthReference((prev) => ({ ...prev, user: { name: "New Name" } }));
      });

      expect(setterSpy).toHaveBeenCalledTimes(1);

      act(() => {
        setAuthReference((prev) => ({ ...prev, token: "brand-new-token" }));
      });

      expect(setterSpy).toHaveBeenCalledTimes(2);
      expect(setterSpy).toHaveBeenLastCalledWith("brand-new-token");
    });
  });
});
