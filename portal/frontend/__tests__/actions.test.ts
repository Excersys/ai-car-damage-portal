/**
 * Unit tests for server actions in lib/actions/index.ts
 * Mocks the db query function and next/cache to test each action in isolation.
 */

// Mock next/cache before imports
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

// Mock the db module
const mockQuery = jest.fn();
jest.mock("@/lib/db", () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

// Mock crypto.randomUUID
const mockUUID = "test-uuid-1234";
Object.defineProperty(globalThis, "crypto", {
  value: { randomUUID: () => mockUUID },
});

import {
  getCars,
  getCarById,
  addCar,
  getReservationsByCarId,
  getAllReservations,
  getScans,
  getScanById,
  getScansByCarId,
  updateQCStatus,
  createDamageCharge,
  getDamageChargesByScanId,
  searchGlobal,
} from "@/lib/actions";
import { revalidatePath } from "next/cache";

beforeEach(() => {
  mockQuery.mockReset();
  (revalidatePath as jest.Mock).mockReset();
});

// ---------------------------------------------------------------------------
// getCars
// ---------------------------------------------------------------------------
describe("getCars", () => {
  it("returns rows from query", async () => {
    const rows = [
      { id: "1", make: "Toyota", model: "Camry" },
      { id: "2", make: "Honda", model: "Civic" },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getCars();
    expect(result).toEqual(rows);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no cars", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getCars();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getCarById
// ---------------------------------------------------------------------------
describe("getCarById", () => {
  it("returns the car when found", async () => {
    const car = { id: "1", make: "Toyota", model: "Camry" };
    mockQuery.mockResolvedValueOnce({ rows: [car] });

    const result = await getCarById("1");
    expect(result).toEqual(car);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["1"]);
  });

  it("returns undefined when not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getCarById("nonexistent");
    expect(result).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// addCar
// ---------------------------------------------------------------------------
describe("addCar", () => {
  it("inserts a car and revalidates /fleet", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const carData = {
      make: "Tesla",
      model: "Model 3",
      year: 2024,
      color: "White",
      licensePlate: "ABC123",
      vin: "VIN123",
      status: "Available" as const,
      imageUrl: "http://img.jpg",
      mileage: 1000,
      lastInspectionDate: "2024-01-01",
    };

    const id = await addCar(carData);
    expect(id).toBe(mockUUID);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO cars"),
      expect.arrayContaining([mockUUID, "Tesla", "Model 3"])
    );
    expect(revalidatePath).toHaveBeenCalledWith("/fleet");
  });
});

// ---------------------------------------------------------------------------
// getReservationsByCarId
// ---------------------------------------------------------------------------
describe("getReservationsByCarId", () => {
  it("returns reservations with ISO date strings", async () => {
    const rows = [
      {
        id: "r1",
        carId: "c1",
        userId: "u1",
        userName: "John",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-10"),
        status: "Active",
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getReservationsByCarId("c1");
    expect(result).toHaveLength(1);
    expect(result[0].startDate).toBe(new Date("2024-06-01").toISOString());
    expect(result[0].endDate).toBe(new Date("2024-06-10").toISOString());
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["c1"]);
  });
});

// ---------------------------------------------------------------------------
// getAllReservations
// ---------------------------------------------------------------------------
describe("getAllReservations", () => {
  it("returns all reservations with ISO date strings", async () => {
    const rows = [
      {
        id: "r1",
        carId: "c1",
        userId: "u1",
        userName: "Jane",
        startDate: new Date("2024-07-01"),
        endDate: new Date("2024-07-05"),
        status: "Completed",
      },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getAllReservations();
    expect(result).toHaveLength(1);
    expect(typeof result[0].startDate).toBe("string");
    expect(typeof result[0].endDate).toBe("string");
  });

  it("returns empty array when no reservations", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getAllReservations();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getScans
// ---------------------------------------------------------------------------
describe("getScans", () => {
  it("returns scans with imageUrls and detectedDamage", async () => {
    const scanRow = {
      id: "s1",
      carId: "c1",
      reservationId: "r1",
      timestamp: new Date("2024-06-01T12:00:00Z"),
      type: "Check-In",
      aiStatus: "Clean",
      qcStatus: "Pending",
      image_url_front: "f.jpg",
      image_url_rear: "r.jpg",
      image_url_left: "l.jpg",
      image_url_right: "ri.jpg",
    };
    const damageRows = [
      { label: "Scratch", confidence: 0.9, x: 10, y: 20, width: 30, height: 40 },
    ];

    // First call: scan query, second call: damage query for scan s1
    mockQuery
      .mockResolvedValueOnce({ rows: [scanRow] })
      .mockResolvedValueOnce({ rows: damageRows });

    const result = await getScans();
    expect(result).toHaveLength(1);
    expect(result[0].imageUrls).toEqual({
      front: "f.jpg",
      rear: "r.jpg",
      left: "l.jpg",
      right: "ri.jpg",
    });
    expect(result[0].detectedDamage).toEqual(damageRows);
    expect(result[0].timestamp).toBe(new Date("2024-06-01T12:00:00Z").toISOString());
  });

  it("returns empty array when no scans", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getScans();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getScanById
// ---------------------------------------------------------------------------
describe("getScanById", () => {
  it("returns scan with damage data when found", async () => {
    const scanRow = {
      id: "s1",
      carId: "c1",
      timestamp: new Date("2024-06-01T12:00:00Z"),
      type: "Check-Out",
      aiStatus: "Damage Detected",
      image_url_front: "f.jpg",
      image_url_rear: "r.jpg",
      image_url_left: "l.jpg",
      image_url_right: "ri.jpg",
    };
    const damageRows = [
      { label: "Dent", confidence: 0.85, x: 5, y: 10, width: 20, height: 25 },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: [scanRow] })
      .mockResolvedValueOnce({ rows: damageRows });

    const result = await getScanById("s1");
    expect(result).toBeDefined();
    expect(result!.id).toBe("s1");
    expect(result!.detectedDamage).toEqual(damageRows);
    expect(result!.imageUrls.front).toBe("f.jpg");
  });

  it("returns undefined when scan not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getScanById("nonexistent");
    expect(result).toBeUndefined();
    // Should not query for damage if scan not found
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getScansByCarId
// ---------------------------------------------------------------------------
describe("getScansByCarId", () => {
  it("returns scans for a given car", async () => {
    const scanRow = {
      id: "s2",
      carId: "c2",
      timestamp: new Date("2024-08-01T10:00:00Z"),
      type: "Check-In",
      aiStatus: "Clean",
      image_url_front: "f2.jpg",
      image_url_rear: "r2.jpg",
      image_url_left: "l2.jpg",
      image_url_right: "ri2.jpg",
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [scanRow] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await getScansByCarId("c2");
    expect(result).toHaveLength(1);
    expect(result[0].carId).toBe("c2");
    expect(result[0].detectedDamage).toEqual([]);
    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ["c2"]);
  });
});

// ---------------------------------------------------------------------------
// updateQCStatus
// ---------------------------------------------------------------------------
describe("updateQCStatus", () => {
  it("updates status and revalidates paths", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await updateQCStatus("s1", "Approved", "reviewer-1");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE scans"),
      ["Approved", "reviewer-1", "s1"]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/qc");
    expect(revalidatePath).toHaveBeenCalledWith("/qc/s1");
  });

  it("handles Rejected status", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await updateQCStatus("s2", "Rejected", "reviewer-2");

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE scans"),
      ["Rejected", "reviewer-2", "s2"]
    );
  });
});

// ---------------------------------------------------------------------------
// createDamageCharge
// ---------------------------------------------------------------------------
describe("createDamageCharge", () => {
  it("inserts a damage charge and returns the row", async () => {
    const returned = {
      id: mockUUID,
      scanId: "scan-001",
      reservationId: "res-001",
      amount: 35000,
      currency: "usd",
      description: "Front bumper scratch",
      status: "pending",
      createdBy: "admin@acr.com",
      createdAt: new Date().toISOString(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [returned] });

    const result = await createDamageCharge({
      scanId: "scan-001",
      reservationId: "res-001",
      amount: 35000,
      description: "Front bumper scratch",
      createdBy: "admin@acr.com",
    });

    expect(result).toEqual(returned);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO damage_charges"),
      [mockUUID, "scan-001", "res-001", 35000, "Front bumper scratch", "admin@acr.com"]
    );
    expect(revalidatePath).toHaveBeenCalledWith("/qc");
    expect(revalidatePath).toHaveBeenCalledWith("/qc/scan-001");
  });
});

// ---------------------------------------------------------------------------
// getDamageChargesByScanId
// ---------------------------------------------------------------------------
describe("getDamageChargesByScanId", () => {
  it("returns charges for a given scan", async () => {
    const rows = [
      { id: "chg-1", scanId: "scan-001", amount: 35000, status: "pending" },
      { id: "chg-2", scanId: "scan-001", amount: 8500, status: "pending" },
    ];
    mockQuery.mockResolvedValueOnce({ rows });

    const result = await getDamageChargesByScanId("scan-001");
    expect(result).toEqual(rows);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("FROM damage_charges"),
      ["scan-001"]
    );
  });

  it("returns empty array when no charges exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getDamageChargesByScanId("scan-none");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// searchGlobal
// ---------------------------------------------------------------------------
describe("searchGlobal", () => {
  it("returns structured results with cars, reservations, and scans", async () => {
    const carRows = [{ id: "c1", make: "Toyota", model: "Camry" }];
    const resRows = [
      {
        id: "r1",
        carId: "c1",
        userId: "u1",
        userName: "John",
        startDate: new Date("2024-06-01"),
        endDate: new Date("2024-06-10"),
        status: "Active",
      },
    ];
    const scanRows = [
      {
        id: "s1",
        carId: "c1",
        timestamp: new Date("2024-06-01T12:00:00Z"),
        type: "Check-In",
        aiStatus: "Clean",
        image_url_front: "f.jpg",
        image_url_rear: "r.jpg",
        image_url_left: "l.jpg",
        image_url_right: "ri.jpg",
      },
    ];

    mockQuery
      .mockResolvedValueOnce({ rows: carRows })
      .mockResolvedValueOnce({ rows: resRows })
      .mockResolvedValueOnce({ rows: scanRows });

    const result = await searchGlobal("Toyota");

    expect(result.cars).toEqual(carRows);
    expect(result.reservations).toHaveLength(1);
    expect(typeof result.reservations[0].startDate).toBe("string");
    expect(result.scans).toHaveLength(1);
    expect(result.scans[0].imageUrls).toEqual({
      front: "f.jpg",
      rear: "r.jpg",
      left: "l.jpg",
      right: "ri.jpg",
    });
    expect(result.scans[0].detectedDamage).toEqual([]);
  });

  it("passes wildcard search term to all queries", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await searchGlobal("test");

    expect(mockQuery).toHaveBeenCalledTimes(3);
    // All three queries should receive %test%
    for (let i = 0; i < 3; i++) {
      expect(mockQuery.mock.calls[i][1]).toEqual(["%test%"]);
    }
  });

  it("returns empty results when nothing matches", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await searchGlobal("zzz");
    expect(result.cars).toEqual([]);
    expect(result.reservations).toEqual([]);
    expect(result.scans).toEqual([]);
  });
});
