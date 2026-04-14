import { TUNNEL_PREFIX, isTunnelScanId, toRawTunnelId } from "@/lib/tunnelHelpers";

describe("tunnelHelpers", () => {
  describe("TUNNEL_PREFIX", () => {
    it("equals 'tunnel-'", () => {
      expect(TUNNEL_PREFIX).toBe("tunnel-");
    });
  });

  describe("isTunnelScanId", () => {
    it("returns true for ids starting with tunnel-", () => {
      expect(isTunnelScanId("tunnel-abc123")).toBe(true);
    });

    it("returns false for regular ids", () => {
      expect(isTunnelScanId("abc123")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isTunnelScanId("")).toBe(false);
    });
  });

  describe("toRawTunnelId", () => {
    it("strips the tunnel- prefix", () => {
      expect(toRawTunnelId("tunnel-abc123")).toBe("abc123");
    });

    it("returns the string unchanged if no prefix", () => {
      expect(toRawTunnelId("abc123")).toBe("abc123");
    });
  });
});
