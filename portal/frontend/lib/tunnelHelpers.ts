/** Shared tunnel-related constants and pure helpers (not a server action module). */

export const TUNNEL_PREFIX = "tunnel-";

export function isTunnelScanId(id: string): boolean {
  return id.startsWith(TUNNEL_PREFIX);
}

export function toRawTunnelId(portalId: string): string {
  return portalId.replace(TUNNEL_PREFIX, "");
}
