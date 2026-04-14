/**
 * Tests for the cost estimation logic used in CustomerReportClient.
 *
 * The component calculates estimated repair cost with this formula:
 *   - Base cost is 300 for damages whose label includes "dent", 150 otherwise.
 *   - Each damage cost = Math.round(baseCost * confidence).
 *   - Default confidence is 0.8 when not provided.
 */

interface Damage {
  label?: string;
  confidence?: number;
}

function calculateEstimatedCost(damages: Damage[]): number {
  return damages.reduce((total, d) => {
    const baseCost = d.label?.toLowerCase().includes("dent") ? 300 : 150;
    return total + Math.round(baseCost * (d.confidence ?? 0.8));
  }, 0);
}

describe("CustomerReportClient cost estimation", () => {
  it("returns 0 for an empty damage array", () => {
    expect(calculateEstimatedCost([])).toBe(0);
  });

  it("uses base cost 300 for damage with 'dent' in label", () => {
    const damages: Damage[] = [{ label: "dent", confidence: 1.0 }];
    expect(calculateEstimatedCost(damages)).toBe(300);
  });

  it("uses base cost 300 for damage with 'Dent' (case-insensitive)", () => {
    const damages: Damage[] = [{ label: "Large Dent", confidence: 1.0 }];
    expect(calculateEstimatedCost(damages)).toBe(300);
  });

  it("uses base cost 150 for non-dent damage", () => {
    const damages: Damage[] = [{ label: "scratch", confidence: 1.0 }];
    expect(calculateEstimatedCost(damages)).toBe(150);
  });

  it("scales cost by confidence", () => {
    const damages: Damage[] = [{ label: "scratch", confidence: 0.5 }];
    // 150 * 0.5 = 75
    expect(calculateEstimatedCost(damages)).toBe(75);
  });

  it("rounds scaled cost to nearest integer", () => {
    const damages: Damage[] = [{ label: "dent", confidence: 0.33 }];
    // 300 * 0.33 = 99
    expect(calculateEstimatedCost(damages)).toBe(Math.round(300 * 0.33));
  });

  it("defaults confidence to 0.8 when not provided", () => {
    const damages: Damage[] = [{ label: "scratch" }];
    // 150 * 0.8 = 120
    expect(calculateEstimatedCost(damages)).toBe(120);
  });

  it("sums costs across multiple damages", () => {
    const damages: Damage[] = [
      { label: "dent", confidence: 0.9 },   // 300 * 0.9 = 270
      { label: "scratch", confidence: 0.7 }, // 150 * 0.7 = 105
    ];
    expect(calculateEstimatedCost(damages)).toBe(270 + 105);
  });

  it("handles undefined label as non-dent (base 150)", () => {
    const damages: Damage[] = [{ confidence: 1.0 }];
    expect(calculateEstimatedCost(damages)).toBe(150);
  });
});
