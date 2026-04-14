/**
 * Tests for the Settings client page component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import Settings from "@/app/settings/page";

describe("Settings", () => {
  it("renders settings page with title", () => {
    render(<Settings />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders profile information section", () => {
    render(<Settings />);
    expect(screen.getByText("Profile Information")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Admin User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("admin@example.com")).toBeInTheDocument();
  });

  it("renders system configuration section", () => {
    render(<Settings />);
    expect(screen.getByText("System Configuration")).toBeInTheDocument();
  });

  it("renders AI sensitivity slider with default value", () => {
    render(<Settings />);
    expect(screen.getByText(/AI Detection Sensitivity \(85%\)/)).toBeInTheDocument();
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("85");
  });

  it("updates AI sensitivity when slider changes", () => {
    render(<Settings />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "95" } });
    expect(screen.getByText(/AI Detection Sensitivity \(95%\)/)).toBeInTheDocument();
  });

  it("renders email notifications checkbox checked by default", () => {
    render(<Settings />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("toggles email notifications", () => {
    render(<Settings />);
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("renders save buttons", () => {
    render(<Settings />);
    expect(screen.getByText("Update Profile")).toBeInTheDocument();
    expect(screen.getByText("Save System Preferences")).toBeInTheDocument();
  });
});
