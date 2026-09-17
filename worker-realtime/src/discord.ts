/** Discord allows about 30 requests a minute per webhook; each lobby copy keeps well under that. */
const EVENTS_PER_MINUTE = 20;

export type LobbyEvent =
  | { kind: "join"; name: string; character: string; copy: string; country: string }
  | { kind: "chat"; name: string; copy: string; text: string };

/**
 * Reports public lobby activity to Discord so abuse can be spotted. Events are
 * sent straight away; past the per-minute cap they're counted and mentioned on
 * the next one that goes out. The count lives in memory, so a room that
 * hibernates starts a fresh minute, which only happens when it's quiet anyway.
 */
export class LobbyReporter {
  private minute = 0;
  private sent = 0;
  private skipped = 0;

  constructor(private readonly webhookUrl: string | undefined) {}

  /** Returns the request to hand to waitUntil, or null when nothing is sent. */
  report(event: LobbyEvent, now = Date.now()): Promise<unknown> | null {
    if (!this.webhookUrl) return null;

    const minute = Math.floor(now / 60_000);
    if (minute !== this.minute) {
      this.minute = minute;
      this.sent = 0;
    }
    if (this.sent >= EVENTS_PER_MINUTE) {
      this.skipped++;
      return null;
    }
    this.sent++;

    const skipped = this.skipped;
    this.skipped = 0;
    return fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discordPayload(event, skipped)),
    }).catch(() => undefined);
  }
}

export function discordPayload(event: LobbyEvent, skipped: number) {
  const lines =
    event.kind === "join"
      ? [
          `**Name:** ${event.name}`,
          `**Character:** ${event.character}`,
          `**Lobby:** ${event.copy}`,
          `**Country:** ${event.country || "Unknown"}`,
        ]
      : [`**Name:** ${event.name}`, `**Lobby:** ${event.copy}`, `**Message:** ${event.text}`];
  if (skipped > 0) lines.push(`(${skipped} more skipped)`);

  return {
    // Names and messages come from visitors, so they must never ping anyone.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: event.kind === "join" ? "Joined the lobby" : "Lobby chat",
        description: lines.join("\n"),
        color: event.kind === "join" ? 5814783 : 3066993,
      },
    ],
  };
}
