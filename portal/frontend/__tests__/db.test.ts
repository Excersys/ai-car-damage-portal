/**
 * Unit tests for lib/db.ts
 * Mocks the pg Pool to test the query helper function.
 */

const mockPoolQuery = jest.fn();

jest.mock("pg", () => {
  return {
    Pool: jest.fn().mockImplementation(() => ({
      query: mockPoolQuery,
    })),
  };
});

import { query } from "@/lib/db";

beforeEach(() => {
  mockPoolQuery.mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  (console.log as jest.Mock).mockRestore();
});

describe("query helper", () => {
  it("delegates to pool.query and returns result", async () => {
    const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
    mockPoolQuery.mockResolvedValueOnce(mockResult);

    const result = await query("SELECT * FROM cars");
    expect(result).toEqual(mockResult);
    expect(mockPoolQuery).toHaveBeenCalledWith("SELECT * FROM cars", undefined);
  });

  it("passes params to pool.query", async () => {
    const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
    mockPoolQuery.mockResolvedValueOnce(mockResult);

    const result = await query("SELECT * FROM cars WHERE id = $1", ["abc"]);
    expect(result).toEqual(mockResult);
    expect(mockPoolQuery).toHaveBeenCalledWith(
      "SELECT * FROM cars WHERE id = $1",
      ["abc"]
    );
  });

  it("logs query execution details", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await query("SELECT 1");
    expect(console.log).toHaveBeenCalledWith(
      "executed query",
      expect.objectContaining({
        text: "SELECT 1",
        rows: 0,
      })
    );
  });

  it("propagates errors from pool.query", async () => {
    mockPoolQuery.mockRejectedValueOnce(new Error("connection refused"));

    await expect(query("SELECT 1")).rejects.toThrow("connection refused");
  });

  it("logs duration as a number", async () => {
    mockPoolQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await query("SELECT 1");
    const logCall = (console.log as jest.Mock).mock.calls[0];
    expect(typeof logCall[1].duration).toBe("number");
    expect(logCall[1].duration).toBeGreaterThanOrEqual(0);
  });
});
