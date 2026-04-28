/**
 * Tests for the FleetList client component.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import FleetList from "@/app/fleet/FleetList";
import { Car } from "@/types";

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

const mockCars: Car[] = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    color: "Silver",
    licensePlate: "ABC-1234",
    vin: "VIN001",
    status: "Available",
    imageUrl: "http://img.jpg",
    mileage: 15000,
    lastInspectionDate: "2024-01-01",
  },
  {
    id: "2",
    make: "Honda",
    model: "Civic",
    year: 2023,
    color: "Blue",
    licensePlate: "XYZ-5678",
    vin: "VIN002",
    status: "Rented",
    imageUrl: "http://img2.jpg",
    mileage: 30000,
    lastInspectionDate: "2024-02-01",
  },
  {
    id: "3",
    make: "Ford",
    model: "Focus",
    year: 2022,
    color: "Red",
    licensePlate: "DEF-9999",
    vin: "VIN003",
    status: "Maintenance",
    imageUrl: "http://img3.jpg",
    mileage: 50000,
    lastInspectionDate: "2024-03-01",
  },
];

describe("FleetList", () => {
  it("renders all cars", () => {
    render(<FleetList initialCars={mockCars} />);
    expect(screen.getByText("Fleet Registry")).toBeInTheDocument();
    expect(screen.getByText(/Toyota Camry/)).toBeInTheDocument();
    expect(screen.getByText(/Honda Civic/)).toBeInTheDocument();
    expect(screen.getByText(/Ford Focus/)).toBeInTheDocument();
  });

  it("filters cars by search term (make)", () => {
    render(<FleetList initialCars={mockCars} />);
    const input = screen.getByPlaceholderText(/Search by Make/);
    fireEvent.change(input, { target: { value: "Toyota" } });
    expect(screen.getByText(/Toyota Camry/)).toBeInTheDocument();
    expect(screen.queryByText(/Honda Civic/)).not.toBeInTheDocument();
  });

  it("filters cars by search term (license plate)", () => {
    render(<FleetList initialCars={mockCars} />);
    const input = screen.getByPlaceholderText(/Search by Make/);
    fireEvent.change(input, { target: { value: "XYZ" } });
    expect(screen.getByText(/Honda Civic/)).toBeInTheDocument();
    expect(screen.queryByText(/Toyota Camry/)).not.toBeInTheDocument();
  });

  it("filters cars by search term (VIN)", () => {
    render(<FleetList initialCars={mockCars} />);
    const input = screen.getByPlaceholderText(/Search by Make/);
    fireEvent.change(input, { target: { value: "VIN003" } });
    expect(screen.getByText(/Ford Focus/)).toBeInTheDocument();
    expect(screen.queryByText(/Toyota Camry/)).not.toBeInTheDocument();
  });

  it("filters cars by status", () => {
    render(<FleetList initialCars={mockCars} />);
    const select = screen.getByDisplayValue("All Statuses");
    fireEvent.change(select, { target: { value: "Available" } });
    expect(screen.getByText(/Toyota Camry/)).toBeInTheDocument();
    expect(screen.queryByText(/Honda Civic/)).not.toBeInTheDocument();
  });

  it("shows Add Vehicle link", () => {
    render(<FleetList initialCars={mockCars} />);
    expect(screen.getByText("Add Vehicle")).toBeInTheDocument();
  });

  it("shows status badges", () => {
    render(<FleetList initialCars={mockCars} />);
    const badges = screen.getAllByText("Available");
    expect(badges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Rented").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Maintenance").length).toBeGreaterThanOrEqual(1);
  });
});
