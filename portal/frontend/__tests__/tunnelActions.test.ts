/**
 * Tests for lib/actions/tunnel.ts (server actions for tunnel API)
 */

jest.mock("@/lib/tunnelApi", () => ({
  isTunnelConfigured: jest.fn(),
  fetchTunnelEvents: jest.fn(),
  fetchTunnelEventDetail: jest.fn(),
  submitTunnelEventQc: jest.fn(),
}));

jest.mock("@/lib/tunnelHelpers", () => ({
  TUNNEL_PREFIX: "tunnel-",
  toRawTunnelId: (id: string) => id.replace("tunnel-", ""),
}));

import {
  getTunnelScans,
  getTunnelScanDetail,
  submitTunnelQc,
} from "@/lib/actions/tunnel";
import {
  isTunnelConfigured,
  fetchTunnelEvents,
  fetchTunnelEventDetail,
  submitTunnelEventQc,
} from "@/lib/tunnelApi";

const mockIsTunnelConfigured = isTunnelConfigured as jest.Mock;
const mockFetchTunnelEvents = fetchTunnelEvents as jest.Mock;
const mockFetchTunnelEventDetail = fetchTunnelEventDetail as jest.Mock;
const mockSubmitTunnelEventQc = submitTunnelEventQc as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getTunnelScans", () => {
  it("returns [] when tunnel is not configured", async () => {
    mockIsTunnelConfigured.mockReturnValue(false);
    const result = await getTunnelScans();
    expect(result).toEqual([]);
    expect(mockFetchTunnelEvents).not.toHaveBeenCalled();
  });

  it("returns mapped ScanEvent[] when configured", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEvents.mockResolvedValue({
      events: [
        {
          event_id: "e1",
          license_plate: "ABC123",
          last_timestamp: "2024-01-01T00:00:00Z",
          any_damage: true,
          preview_image_url: "http://img.jpg",
          qc_status: "pending",
          camera_count: 4,
        },
        {
          event_id: "e2",
          license_plate: "",
          last_timestamp: "2024-01-02T00:00:00Z",
          any_damage: false,
          preview_image_url: "",
          qc_status: "approved",
          camera_count: 2,
        },
      ],
      count: 2,
    });

    const result = await getTunnelScans();
    expect(result).toHaveLength(2);

    // First event: damage detected
    expect(result[0].id).toBe("tunnel-e1");
    expect(result[0].carId).toBe("ABC123");
    expect(result[0].aiStatus).toBe("Damage Detected");
    expect(result[0].qcStatus).toBe("Pending");
    expect(result[0].imageUrls.front).toBe("http://img.jpg");
    expect(result[0].detectedDamage).toHaveLength(1);

    // Second event: clean, no license plate
    expect(result[1].id).toBe("tunnel-e2");
    expect(result[1].carId).toBe("unknown");
    expect(result[1].aiStatus).toBe("Clean");
    expect(result[1].qcStatus).toBe("Approved");
    expect(result[1].detectedDamage).toEqual([]);
  });

  it("returns [] and logs error on fetch failure", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEvents.mockRejectedValue(new Error("network error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const result = await getTunnelScans();
    expect(result).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("maps unknown qc_status to Pending", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEvents.mockResolvedValue({
      events: [{
        event_id: "e3",
        license_plate: "XYZ",
        last_timestamp: "2024-01-01T00:00:00Z",
        any_damage: false,
        preview_image_url: "",
        qc_status: "unknown_status",
        camera_count: 1,
      }],
      count: 1,
    });

    const result = await getTunnelScans();
    expect(result[0].qcStatus).toBe("Pending");
  });

  it("maps rejected qc_status to Rejected", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEvents.mockResolvedValue({
      events: [{
        event_id: "e4",
        license_plate: "ABC",
        last_timestamp: "2024-01-01T00:00:00Z",
        any_damage: false,
        preview_image_url: "",
        qc_status: "rejected",
        camera_count: 1,
      }],
      count: 1,
    });

    const result = await getTunnelScans();
    expect(result[0].qcStatus).toBe("Rejected");
  });
});

describe("getTunnelScanDetail", () => {
  it("returns null when tunnel is not configured", async () => {
    mockIsTunnelConfigured.mockReturnValue(false);
    const result = await getTunnelScanDetail("tunnel-e1");
    expect(result).toBeNull();
  });

  it("returns scan detail with camera data", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEventDetail.mockResolvedValue({
      event_id: "e1",
      cameras: [
        {
          camera_id: "cam1",
          camera_frame: "front",
          frame: "front",
          image_url: "http://img1.jpg",
          damage_detected: true,
          damage_type: "Scratch",
          confidence_score: 0.95,
          bounding_boxes: [{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 }],
          timestamp: "2024-01-01T00:00:00Z",
        },
        {
          camera_id: "cam2",
          camera_frame: "rear",
          frame: "rear",
          image_url: "http://img2.jpg",
          damage_detected: false,
          damage_type: "",
          confidence_score: 0.1,
          bounding_boxes: [],
          timestamp: "2024-01-01T00:00:01Z",
        },
        {
          camera_id: "cam3",
          camera_frame: "left",
          frame: "left",
          image_url: "http://img3.jpg",
          damage_detected: false,
          damage_type: "",
          confidence_score: 0.1,
          bounding_boxes: [],
          timestamp: "2024-01-01T00:00:02Z",
        },
        {
          camera_id: "cam4",
          camera_frame: "right",
          frame: "right",
          image_url: "http://img4.jpg",
          damage_detected: false,
          damage_type: "",
          confidence_score: 0.1,
          bounding_boxes: [],
          timestamp: "2024-01-01T00:00:03Z",
        },
      ],
      total_cameras: 4,
      any_damage: true,
      qc: { status: "approved", notes: "ok", reviewer_id: "user1", updated_at: "2024-01-01" },
    });

    const result = await getTunnelScanDetail("tunnel-e1");
    expect(result).not.toBeNull();
    expect(result!.scan.id).toBe("tunnel-e1");
    expect(result!.scan.aiStatus).toBe("Damage Detected");
    expect(result!.scan.qcStatus).toBe("Approved");
    expect(result!.scan.qcBy).toBe("user1");
    expect(result!.scan.qcNotes).toBe("ok");
    expect(result!.scan.imageUrls.front).toBe("http://img1.jpg");
    expect(result!.scan.imageUrls.rear).toBe("http://img2.jpg");
    expect(result!.scan.imageUrls.left).toBe("http://img3.jpg");
    expect(result!.scan.imageUrls.right).toBe("http://img4.jpg");
    expect(result!.scan.detectedDamage).toHaveLength(1);
    expect(result!.scan.detectedDamage[0].label).toBe("Scratch");
    expect(result!.cameras).toHaveLength(4);
    expect(result!.qc!.status).toBe("approved");
  });

  it("handles bounding boxes with width/height keys", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEventDetail.mockResolvedValue({
      event_id: "e2",
      cameras: [
        {
          camera_id: "cam1",
          camera_frame: "front",
          frame: "front",
          image_url: "http://img.jpg",
          damage_detected: true,
          damage_type: "Dent",
          confidence_score: 0.8,
          bounding_boxes: [{ x: 10, y: 20, width: 30, height: 40 }],
          timestamp: "2024-01-01T00:00:00Z",
        },
      ],
      total_cameras: 1,
      any_damage: true,
      qc: null,
    });

    const result = await getTunnelScanDetail("tunnel-e2");
    expect(result!.scan.detectedDamage[0].width).toBe(30);
    expect(result!.scan.detectedDamage[0].height).toBe(40);
    expect(result!.qc).toBeNull();
    expect(result!.scan.qcStatus).toBe("Pending");
  });

  it("returns null on fetch error", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockFetchTunnelEventDetail.mockRejectedValue(new Error("fail"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const result = await getTunnelScanDetail("tunnel-e1");
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });
});

describe("submitTunnelQc", () => {
  it("returns false when tunnel is not configured", async () => {
    mockIsTunnelConfigured.mockReturnValue(false);
    const result = await submitTunnelQc("tunnel-e1", "approved", "user1");
    expect(result).toBe(false);
  });

  it("submits QC and returns true on success", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockSubmitTunnelEventQc.mockResolvedValue({ event_id: "e1", qc: {} });

    const result = await submitTunnelQc("tunnel-e1", "approved", "user1", "notes here");
    expect(result).toBe(true);
    expect(mockSubmitTunnelEventQc).toHaveBeenCalledWith("e1", {
      status: "approved",
      reviewer_id: "user1",
      notes: "notes here",
    });
  });

  it("submits QC without notes", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockSubmitTunnelEventQc.mockResolvedValue({ event_id: "e1", qc: {} });

    await submitTunnelQc("tunnel-e1", "rejected", "user2");
    expect(mockSubmitTunnelEventQc).toHaveBeenCalledWith("e1", {
      status: "rejected",
      reviewer_id: "user2",
    });
  });

  it("returns false on error", async () => {
    mockIsTunnelConfigured.mockReturnValue(true);
    mockSubmitTunnelEventQc.mockRejectedValue(new Error("fail"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const result = await submitTunnelQc("tunnel-e1", "approved", "user1");
    expect(result).toBe(false);
    consoleSpy.mockRestore();
  });
});
