/**
 * Tests for lib/tunnelApi.ts
 */

// Save original env
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    TUNNEL_REVIEW_API_BASE_URL: "https://api.example.com/prod",
    TUNNEL_REVIEW_API_KEY: "test-api-key",
  };
  // Reset fetch mock
  (global.fetch as jest.Mock)?.mockReset?.();
});

afterAll(() => {
  process.env = originalEnv;
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("tunnelApi", () => {
  describe("isTunnelConfigured", () => {
    it("returns true when both env vars are set", () => {
      const { isTunnelConfigured } = require("@/lib/tunnelApi");
      expect(isTunnelConfigured()).toBe(true);
    });

    it("returns false when base URL is missing", () => {
      delete process.env.TUNNEL_REVIEW_API_BASE_URL;
      const { isTunnelConfigured } = require("@/lib/tunnelApi");
      expect(isTunnelConfigured()).toBe(false);
    });

    it("returns false when API key is missing", () => {
      delete process.env.TUNNEL_REVIEW_API_KEY;
      const { isTunnelConfigured } = require("@/lib/tunnelApi");
      expect(isTunnelConfigured()).toBe(false);
    });
  });

  describe("fetchTunnelEvents", () => {
    it("calls /tunnel/events and returns data", async () => {
      const data = { events: [{ event_id: "e1" }], count: 1 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const { fetchTunnelEvents } = require("@/lib/tunnelApi");
      const result = await fetchTunnelEvents();

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/prod/tunnel/events",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "X-Api-Key": "test-api-key",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("throws when API is not configured", async () => {
      delete process.env.TUNNEL_REVIEW_API_BASE_URL;
      delete process.env.TUNNEL_REVIEW_API_KEY;
      const { fetchTunnelEvents } = require("@/lib/tunnelApi");
      await expect(fetchTunnelEvents()).rejects.toThrow("not configured");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      const { fetchTunnelEvents } = require("@/lib/tunnelApi");
      await expect(fetchTunnelEvents()).rejects.toThrow("Tunnel Review API 500");
    });
  });

  describe("fetchTunnelEventDetail", () => {
    it("calls /tunnel/events/:id and returns data", async () => {
      const data = { event_id: "e1", cameras: [], total_cameras: 0, any_damage: false, qc: null };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(data),
      });

      const { fetchTunnelEventDetail } = require("@/lib/tunnelApi");
      const result = await fetchTunnelEventDetail("e1");

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/prod/tunnel/events/e1",
        expect.anything()
      );
    });

    it("encodes event id in URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { fetchTunnelEventDetail } = require("@/lib/tunnelApi");
      await fetchTunnelEventDetail("event with spaces");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("event%20with%20spaces"),
        expect.anything()
      );
    });
  });

  describe("submitTunnelEventQc", () => {
    it("posts QC decision and returns result", async () => {
      const responseData = { event_id: "e1", qc: { status: "approved" } };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      const { submitTunnelEventQc } = require("@/lib/tunnelApi");
      const result = await submitTunnelEventQc("e1", {
        status: "approved",
        notes: "looks good",
        reviewer_id: "user1",
      });

      expect(result).toEqual(responseData);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/prod/tunnel/events/e1/qc",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ status: "approved", notes: "looks good", reviewer_id: "user1" }),
        })
      );
    });
  });

  describe("tunnelFetch trailing slash handling", () => {
    it("strips trailing slash from base URL", async () => {
      process.env.TUNNEL_REVIEW_API_BASE_URL = "https://api.example.com/prod/";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [], count: 0 }),
      });

      const { fetchTunnelEvents } = require("@/lib/tunnelApi");
      await fetchTunnelEvents();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/prod/tunnel/events",
        expect.anything()
      );
    });
  });
});
