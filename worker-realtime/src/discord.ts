import type { Whereabouts } from "../../shared-protocol/src";

/** Discord allows about 30 requests a minute per webhook; each sender keeps well under that. */
const EVENTS_PER_MINUTE = 20;

export type ReportEvent =
  | { kind: "lobby_join"; name: string; character: string; lobby: number; where: Whereabouts }
  | { kind: "office_created"; office: string; owner: string; where: Whereabouts }
  | HelpEvent;

/** Someone wrote to the team through Help and feedback (worker-api/src/help.ts). */
export interface HelpEvent {
  kind: "help";
  /** The office, or "Demo office". */
  place: string;
  name: string;
  body: string;
  /** The first message of the conversation. */
  first: boolean;
  /** The admin page, to answer from. */
  link?: string;
  where: Whereabouts;
}

/**
 * Tells the team's Discord about what's worth seeing as it happens: someone
 * walking into the public lobby, a new office, and anything said through
 * Help and feedback. Events go straight
 * out; past the per-minute cap they're counted and mentioned on the next one.
 * The count lives in memory, so an object that hibernates starts a fresh
 * minute, which only happens when it's quiet anyway.
 */
export class Reporter {
  private minute = 0;
  private sent = 0;
  private skipped = 0;

  constructor(private readonly webhookUrl: string | undefined) {}

  /** Returns the request to hand to waitUntil, or null when nothing is sent. */
  report(event: ReportEvent, now = Date.now()): Promise<unknown> | null {
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

const countries = new Intl.DisplayNames(["en"], { type: "region" });

/** "Munich, Bavaria, Germany", from what Cloudflare knows about a request. */
export function describeWhere(where: Whereabouts): string {
  let country = where.country ?? "";
  try {
    if (country) country = countries.of(country) ?? country;
  } catch {
    // Not a region code Intl knows (T1 is Tor, XX unknown): keep it as it is.
  }
  const parts = [where.city, where.region, country].filter((part): part is string => !!part);
  // "Singapore, Singapore, Singapore" says it once.
  const unique = parts.filter((part, index) => parts.indexOf(part) === index);
  return unique.join(", ") || "Somewhere unknown";
}

/** Discord allows 4096 characters in a description; a message rarely needs a tenth of that. */
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export function discordPayload(event: ReportEvent, skipped: number) {
  const embed =
    event.kind === "help"
      ? {
          title: clip(`${event.first ? "New in Help" : "Help"}: ${event.place}`, 250),
          description: clip(event.body, 1500),
          color: 15105570,
          ...(event.link ? { url: event.link } : {}),
          fields: [
            { name: "From", value: clip(event.name, 100), inline: true },
            { name: "Where", value: describeWhere(event.where), inline: true },
          ],
        }
      : event.kind === "lobby_join"
      ? {
          title: `${event.name} walked into the lobby`,
          color: 5814783,
          fields: [
            { name: "From", value: describeWhere(event.where), inline: true },
            { name: "Character", value: event.character, inline: true },
            ...(event.lobby > 1 ? [{ name: "Lobby", value: `Room ${event.lobby} (the first is full)`, inline: true }] : []),
          ],
        }
      : {
          title: `New office: ${event.office}`,
          color: 3066993,
          fields: [
            { name: "Made by", value: event.owner, inline: true },
            { name: "From", value: describeWhere(event.where), inline: true },
          ],
        };

  return {
    // Names come from visitors, so they must never ping anyone.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        ...embed,
        ...(skipped > 0 ? { footer: { text: `${skipped} more skipped in the last minute` } } : {}),
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
