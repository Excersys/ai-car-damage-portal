/**
 * Unit tests for components/Providers.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-auth/react
jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-provider">{children}</div>
  ),
}));

import Providers from "@/components/Providers";

describe("Providers", () => {
  it("renders children inside SessionProvider", () => {
    render(
      <Providers>
        <div data-testid="child">Hello</div>
      </Providers>
    );
    expect(screen.getByTestId("session-provider")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("wraps multiple children", () => {
    render(
      <Providers>
        <span>First</span>
        <span>Second</span>
      </Providers>
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
