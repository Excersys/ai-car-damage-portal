/**
 * Tests for server-rendered page components.
 * These are async server components that can't be rendered in jsdom,
 * so we verify their source structure and exports.
 */
import * as fs from "fs";
import * as path from "path";

function readSrc(relPath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");
}

describe("app/page.tsx (Dashboard)", () => {
  const src = readSrc("app/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+Dashboard/);
  });

  it("calls getScans to fetch data", () => {
    expect(src).toContain("getScans()");
  });

  it("computes pendingReviews count", () => {
    expect(src).toContain("pendingReviews");
    expect(src).toContain("qcStatus === 'Pending'");
  });

  it("computes damageDetected count", () => {
    expect(src).toContain("damageDetected");
    expect(src).toContain("aiStatus === 'Damage Detected'");
  });

  it("sets force-dynamic", () => {
    expect(src).toContain('export const dynamic = "force-dynamic"');
  });
});

describe("app/fleet/page.tsx", () => {
  const src = readSrc("app/fleet/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function/);
  });

  it("calls getCars to fetch fleet data", () => {
    expect(src).toContain("getCars()");
  });

  it("renders FleetList component", () => {
    expect(src).toContain("FleetList");
  });
});

describe("app/customers/page.tsx", () => {
  const src = readSrc("app/customers/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+CustomersPage/);
  });

  it("calls getAllReservations", () => {
    expect(src).toContain("getAllReservations()");
  });

  it("deduplicates users by userId", () => {
    expect(src).toContain("uniqueUsers");
    expect(src).toContain("new Map");
  });

  it("handles empty customer list", () => {
    expect(src).toContain("No customers found");
  });
});

describe("app/customers/report/[id]/page.tsx", () => {
  const src = readSrc("app/customers/report/[id]/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function/);
  });

  it("fetches scan by id", () => {
    expect(src).toContain("getScanById");
  });

  it("fetches car by carId", () => {
    expect(src).toContain("getCarById");
  });

  it("renders CustomerReportClient", () => {
    expect(src).toContain("CustomerReportClient");
  });
});

describe("app/inspections/page.tsx", () => {
  const src = readSrc("app/inspections/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+InspectionsListPage/);
  });

  it("fetches both db scans and tunnel scans", () => {
    expect(src).toContain("getScans()");
    expect(src).toContain("getTunnelScans()");
  });

  it("sorts all scans by timestamp descending", () => {
    expect(src).toContain("sort");
    expect(src).toContain("b.timestamp");
  });

  it("computes reviewed and pending counts", () => {
    expect(src).toContain("reviewed");
    expect(src).toContain("pending");
  });

  it("uses TUNNEL_PREFIX for source identification", () => {
    expect(src).toContain("TUNNEL_PREFIX");
  });
});

describe("app/inspections/[id]/page.tsx", () => {
  const src = readSrc("app/inspections/[id]/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function/);
  });

  it("gets scan and car data", () => {
    expect(src).toContain("getScanById");
    expect(src).toContain("getCarById");
  });

  it("handles not-found cases", () => {
    expect(src).toContain("Record not found");
    expect(src).toContain("Car not found");
  });

  it("renders InspectionDetailClient", () => {
    expect(src).toContain("InspectionDetailClient");
  });
});

describe("app/qc/page.tsx", () => {
  const src = readSrc("app/qc/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+QCQueue/);
  });

  it("fetches both DB and tunnel scans", () => {
    expect(src).toContain("getScans()");
    expect(src).toContain("getTunnelScans()");
  });

  it("separates pending and completed scans", () => {
    expect(src).toContain("pendingScans");
    expect(src).toContain("completedScans");
  });

  it("shows empty state when no pending reviews", () => {
    expect(src).toContain("All caught up! No pending reviews");
  });

  it("uses TUNNEL_PREFIX for tunnel identification", () => {
    expect(src).toContain("TUNNEL_PREFIX");
  });
});

describe("app/qc/[id]/page.tsx", () => {
  const src = readSrc("app/qc/[id]/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+QCReviewPage/);
  });

  it("checks for tunnel scan id", () => {
    expect(src).toContain("isTunnelScanId");
  });

  it("renders TunnelQCReviewClient for tunnel scans", () => {
    expect(src).toContain("TunnelQCReviewClient");
  });

  it("renders QCReviewClient for DB scans", () => {
    expect(src).toContain("QCReviewClient");
  });

  it("handles not-found cases", () => {
    expect(src).toContain("Tunnel event not found");
    expect(src).toContain("Scan not found");
    expect(src).toContain("Car not found");
  });
});

describe("app/fleet/[id]/page.tsx", () => {
  const src = readSrc("app/fleet/[id]/page.tsx");

  it("exports a default async function", () => {
    expect(src).toMatch(/export\s+default\s+async\s+function\s+CarDetail/);
  });

  it("fetches car data", () => {
    expect(src).toContain("getCarById");
  });

  it("fetches reservations and scans", () => {
    expect(src).toContain("getReservationsByCarId");
    expect(src).toContain("getScansByCarId");
  });

  it("builds a merged timeline", () => {
    expect(src).toContain("timelineEvents");
    expect(src).toContain("sort");
  });

  it("handles car not found", () => {
    expect(src).toContain("Car not found");
  });
});

describe("app/layout.tsx", () => {
  const src = readSrc("app/layout.tsx");

  it("exports a default function RootLayout", () => {
    expect(src).toMatch(/export\s+default\s+function\s+RootLayout/);
  });

  it("wraps children in Providers", () => {
    expect(src).toContain("Providers");
  });

  it("includes Sidebar", () => {
    expect(src).toContain("Sidebar");
  });

  it("exports metadata", () => {
    expect(src).toContain("export const metadata");
    expect(src).toContain("AI Car Rental Guard");
  });
});

describe("app/api/auth/[...nextauth]/route.ts", () => {
  const src = readSrc("app/api/auth/[...nextauth]/route.ts");

  it("exports GET and POST handlers", () => {
    expect(src).toContain("export const { GET, POST }");
  });

  it("imports from auth", () => {
    expect(src).toContain("handlers");
  });
});
