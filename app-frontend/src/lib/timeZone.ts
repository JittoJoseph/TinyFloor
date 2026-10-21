/** The zone this browser is in ("Asia/Kolkata"), or null when it won't say. */
export function browserZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

/** Every zone the browser knows, for picking one. */
export function allZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/** Cities browsers still name the old way: India's zone comes back as Calcutta. */
const RENAMED: Record<string, string> = {
  Calcutta: "Kolkata",
  Kiev: "Kyiv",
  Saigon: "Ho Chi Minh",
  Rangoon: "Yangon",
  Katmandu: "Kathmandu",
  Godthab: "Nuuk",
};

/** A zone as people say it: "America/Los_Angeles" is Los Angeles. */
export function zoneCity(zone: string): string {
  const city = zone.split("/").pop() ?? zone;
  return (RENAMED[city] ?? city).replace(/_/g, " ");
}

/** A zone in full, for a list of them: "America / Argentina / Buenos Aires". */
export function zoneLabel(zone: string): string {
  return zone
    .split("/")
    .map((part) => (RENAMED[part] ?? part).replace(/_/g, " "))
    .join(" / ");
}

/** The time it is in a zone now, the way the app's language writes it ("4:43 PM"). */
export function timeIn(zone: string, locale: string, now = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(now);
  } catch {
    return null;
  }
}

/** A zone's distance from UTC now ("GMT+5:30"), daylight saving included. */
export function offsetLabel(zone: string, now = new Date()): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "shortOffset" })
        .formatToParts(now)
        .find((part) => part.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return "";
  }
}

/** Minutes a zone is ahead of UTC now. */
function offsetMinutes(zone: string, now: Date): number {
  const match = /GMT([+-])(\d+)(?::(\d+))?/.exec(offsetLabel(zone, now));
  if (!match) return 0;
  return (match[1] === "-" ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** Hours a zone is ahead of this browser (negative when behind), to the half hour or quarter it may be. */
export function hoursAhead(zone: string, now = new Date()): number {
  const here = browserZone();
  if (!here) return 0;
  return (offsetMinutes(zone, now) - offsetMinutes(here, now)) / 60;
}
