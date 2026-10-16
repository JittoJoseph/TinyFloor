import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import ar from "@/lib/tools/time-zone-copy/ar";
import da from "@/lib/tools/time-zone-copy/da";
import de from "@/lib/tools/time-zone-copy/de";
import en from "@/lib/tools/time-zone-copy/en";
import es from "@/lib/tools/time-zone-copy/es";
import fi from "@/lib/tools/time-zone-copy/fi";
import fr from "@/lib/tools/time-zone-copy/fr";
import he from "@/lib/tools/time-zone-copy/he";
import it from "@/lib/tools/time-zone-copy/it";
import ja from "@/lib/tools/time-zone-copy/ja";
import ko from "@/lib/tools/time-zone-copy/ko";
import nl from "@/lib/tools/time-zone-copy/nl";
import no from "@/lib/tools/time-zone-copy/no";
import pl from "@/lib/tools/time-zone-copy/pl";
import pt from "@/lib/tools/time-zone-copy/pt";
import ru from "@/lib/tools/time-zone-copy/ru";
import sv from "@/lib/tools/time-zone-copy/sv";
import zh from "@/lib/tools/time-zone-copy/zh";

/**
 * When a remote team's working hours overlap (docs/search.md): each person's
 * time zone and hours in, the shared hours out, or the time that suits the
 * most people when none suits everyone. Offsets come from the browser's own
 * time zone data for today, so summer time is counted.
 */
export const TIME_ZONES_PATH = "/tools/time-zone-meeting-planner";
export const TIME_ZONES_UPDATED = "2026-10-16";

/** Cities people pick, by their IANA zone; names stay as written in English, like the zones themselves. */
export const ZONES: Array<{ zone: string; city: string }> = [
  { zone: "Pacific/Honolulu", city: "Honolulu" },
  { zone: "America/Los_Angeles", city: "Los Angeles" },
  { zone: "America/Denver", city: "Denver" },
  { zone: "America/Chicago", city: "Chicago" },
  { zone: "America/Mexico_City", city: "Mexico City" },
  { zone: "America/New_York", city: "New York" },
  { zone: "America/Toronto", city: "Toronto" },
  { zone: "America/Bogota", city: "Bogotá" },
  { zone: "America/Lima", city: "Lima" },
  { zone: "America/Santiago", city: "Santiago" },
  { zone: "America/Sao_Paulo", city: "São Paulo" },
  { zone: "America/Argentina/Buenos_Aires", city: "Buenos Aires" },
  { zone: "Europe/London", city: "London" },
  { zone: "Europe/Dublin", city: "Dublin" },
  { zone: "Europe/Lisbon", city: "Lisbon" },
  { zone: "Africa/Lagos", city: "Lagos" },
  { zone: "Europe/Madrid", city: "Madrid" },
  { zone: "Europe/Paris", city: "Paris" },
  { zone: "Europe/Amsterdam", city: "Amsterdam" },
  { zone: "Europe/Berlin", city: "Berlin" },
  { zone: "Europe/Rome", city: "Rome" },
  { zone: "Europe/Stockholm", city: "Stockholm" },
  { zone: "Europe/Oslo", city: "Oslo" },
  { zone: "Europe/Copenhagen", city: "Copenhagen" },
  { zone: "Europe/Warsaw", city: "Warsaw" },
  { zone: "Africa/Johannesburg", city: "Johannesburg" },
  { zone: "Africa/Cairo", city: "Cairo" },
  { zone: "Europe/Helsinki", city: "Helsinki" },
  { zone: "Europe/Kyiv", city: "Kyiv" },
  { zone: "Asia/Jerusalem", city: "Tel Aviv" },
  { zone: "Europe/Istanbul", city: "Istanbul" },
  { zone: "Europe/Moscow", city: "Moscow" },
  { zone: "Africa/Nairobi", city: "Nairobi" },
  { zone: "Asia/Riyadh", city: "Riyadh" },
  { zone: "Asia/Dubai", city: "Dubai" },
  { zone: "Asia/Karachi", city: "Karachi" },
  { zone: "Asia/Kolkata", city: "Bengaluru" },
  { zone: "Asia/Dhaka", city: "Dhaka" },
  { zone: "Asia/Bangkok", city: "Bangkok" },
  { zone: "Asia/Ho_Chi_Minh", city: "Ho Chi Minh City" },
  { zone: "Asia/Jakarta", city: "Jakarta" },
  { zone: "Asia/Singapore", city: "Singapore" },
  { zone: "Asia/Manila", city: "Manila" },
  { zone: "Asia/Shanghai", city: "Shanghai" },
  { zone: "Asia/Taipei", city: "Taipei" },
  { zone: "Australia/Perth", city: "Perth" },
  { zone: "Asia/Seoul", city: "Seoul" },
  { zone: "Asia/Tokyo", city: "Tokyo" },
  { zone: "Australia/Sydney", city: "Sydney" },
  { zone: "Pacific/Auckland", city: "Auckland" },
];

export const cityOf = (zone: string) => ZONES.find((one) => one.zone === zone)?.city ?? zone.split("/").pop()!.replace(/_/g, " ");

/** Minutes a zone is ahead of UTC at a moment, from the zone data the browser or server has. */
export function offsetMinutes(zone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((local - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

export interface Member {
  zone: string;
  /** Local working hours, whole hours 0–24; an end before the start runs past midnight. */
  start: number;
  end: number;
}

export const SLOT = 30;
const SLOTS = (24 * 60) / SLOT;
const wrap = (minutes: number) => ((minutes % 1440) + 1440) % 1440;

/**
 * The day in half hours of the first person's time zone: who's working in
 * each, and the longest stretch with the most people in it. Offsets are taken
 * at `at`, so a team's hours are right for the day it's planning.
 */
export function overlap(members: Member[], at: Date) {
  const base = offsetMinutes(members[0].zone, at);
  const offsets = members.map((member) => offsetMinutes(member.zone, at));
  const working = (member: Member, local: number) => {
    const from = member.start * 60;
    const to = member.end * 60;
    return from < to ? local >= from && local < to : local >= from || local < to;
  };
  const slots = Array.from({ length: SLOTS }, (_, index) => {
    const minutes = index * SLOT;
    return members.map((member, person) => working(member, wrap(minutes - base + offsets[person])));
  });
  const counts = slots.map((row) => row.filter(Boolean).length);
  const most = Math.max(...counts);

  // The longest run of slots with the most people, going round midnight if it has to.
  let best = { from: 0, length: 0 };
  if (most > 0) {
    for (let from = 0; from < SLOTS; from++) {
      if (counts[from] !== most || counts[(from - 1 + SLOTS) % SLOTS] === most) continue;
      let length = 0;
      while (length < SLOTS && counts[(from + length) % SLOTS] === most) length++;
      if (length > best.length) best = { from, length };
    }
    if (best.length === 0) best = { from: 0, length: SLOTS };
  }
  const from = best.from * SLOT;
  const to = from + best.length * SLOT;
  return {
    slots,
    counts,
    most,
    /** In the first person's time, minutes from midnight. */
    from,
    to,
    /** The same stretch in each person's own time. */
    local: offsets.map((offset) => ({ from: wrap(from - base + offset), to: wrap(to - base + offset) })),
    everyone: most === members.length,
  };
}

/** A time of day the way people write it: "2pm" and "2:30pm" in English, "14:00" elsewhere. */
export function clock(minutes: number, locale: string): string {
  const hour = Math.floor(wrap(minutes) / 60);
  const minute = wrap(minutes) % 60;
  if (locale === "en") {
    const twelve = hour % 12 === 0 ? 12 : hour % 12;
    return `${twelve}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${hour < 12 ? "am" : "pm"}`;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "UTC+5:30", from an offset in minutes. */
export function utcLabel(offset: number): string {
  const sign = offset < 0 ? "−" : "+";
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `UTC${sign}${hours}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
}

export interface TimeZonesContent {
  meta: { title: string; description: string };
  eyebrow: string;
  updated: string;
  title: string;
  intro: string;
  planner: {
    zone: string;
    hours: string;
    remove: string;
    add: string;
    addMine: string;
    /** "Times in {city}". */
    timesIn: string;
    working: string;
    all: string;
    /** "Everyone is working {from}–{to} {city} time." */
    everyone: string;
    /** "No time suits everyone. {from}–{to} {city} time suits {count} of {total}." */
    best: string;
    /** "Nobody's hours overlap." */
    nobody: string;
    /** "In each person's time:" */
    eachLocal: string;
  };
  sections: GuideSection[];
  fit: { title: string; body: string; cta: string };
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

const COPY: Record<Locale, TimeZonesContent> = { en, pt, es, it, ja, de, fr, nl, pl, sv, da, no, fi, ru, ko, zh, he, ar };

export const timeZonesIn = (locale: Locale): TimeZonesContent => COPY[locale];
