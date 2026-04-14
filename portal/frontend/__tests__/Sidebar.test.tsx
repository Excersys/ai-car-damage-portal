/**
 * Unit tests for components/Sidebar.tsx
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/"),
}));

// Mock next-auth/react
const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { name: "Test Admin", email: "admin@test.com" },
    },
  })),
  signOut: (...args: any[]) => mockSignOut(...args),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: any;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  LayoutDashboard: (props: any) => <span data-testid="icon-dashboard" {...props} />,
  Car: (props: any) => <span data-testid="icon-car" {...props} />,
  ShieldCheck: (props: any) => <span data-testid="icon-shield" {...props} />,
  ClipboardList: (props: any) => <span data-testid="icon-clipboard" {...props} />,
  Users: (props: any) => <span data-testid="icon-users" {...props} />,
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  Settings: (props: any) => <span data-testid="icon-settings" {...props} />,
  LogOut: (props: any) => <span data-testid="icon-logout" {...props} />,
}));

// Mock lib/utils
jest.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
}));

import Sidebar from "@/components/Sidebar";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { fireEvent } from "@testing-library/react";

describe("Sidebar", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    (usePathname as jest.Mock).mockReturnValue("/");
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "Test Admin", email: "admin@test.com" } },
    });
  });

  it("renders the AI GUARD title", () => {
    render(<Sidebar />);
    expect(screen.getByText("AI GUARD")).toBeInTheDocument();
  });

  it("renders all navigation items", () => {
    render(<Sidebar />);
    const navNames = [
      "Dashboard",
      "Fleet Registry",
      "QC Station",
      "Inspections",
      "Customers",
      "Search",
      "Settings",
    ];
    navNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it("displays user name from session", () => {
    render(<Sidebar />);
    expect(screen.getByText("Test Admin")).toBeInTheDocument();
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
  });

  it("displays default name when no session user", () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: {} },
    });
    render(<Sidebar />);
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("View Profile")).toBeInTheDocument();
  });

  it("shows sign out button when session exists", () => {
    render(<Sidebar />);
    const signOutBtn = screen.getByTitle("Sign out");
    expect(signOutBtn).toBeInTheDocument();
  });

  it("hides sign out button when no session", () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });
    render(<Sidebar />);
    expect(screen.queryByTitle("Sign out")).not.toBeInTheDocument();
  });

  it("calls signOut when sign out button is clicked", () => {
    render(<Sidebar />);
    const signOutBtn = screen.getByTitle("Sign out");
    fireEvent.click(signOutBtn);
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("renders navigation links with correct hrefs", () => {
    render(<Sidebar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/fleet");
    expect(hrefs).toContain("/qc");
    expect(hrefs).toContain("/customers");
    expect(hrefs).toContain("/search");
    expect(hrefs).toContain("/settings");
  });
});
