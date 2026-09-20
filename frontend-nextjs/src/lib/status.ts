import type { PlayerStatus } from "./types";

/** One set of status colours for the whole app: the dots, the pill and the map. */
const STATUS_COLOR: Record<PlayerStatus, string> = {
  available: "#10b981",
  busy: "#ef4444",
  away: "#f59e0b",
  in_call: "#8b5cf6",
  offline: "#9ca3af",
};

export function statusColor(status: string): string {
  return STATUS_COLOR[status as PlayerStatus] ?? STATUS_COLOR.offline;
}

/** The same colour as a number, for Phaser. */
export function statusColorValue(status: string): number {
  return Number.parseInt(statusColor(status).slice(1), 16);
}
