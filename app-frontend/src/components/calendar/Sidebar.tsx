"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, ExternalLink } from "web-shared/components/ui/icons";
import { MAIN_MEETING } from "shared-protocol/messages";
import type { CalendarEvent, Member } from "web-shared/lib/api";
import { Face, FaceStack } from "web-shared/components/ui/Face";
import { cn } from "web-shared/lib/utils";
import { Link } from "@/lib/i18n/navigation";
import { callManager } from "@/lib/CallManager";
import { dayStart, placeOf } from "@/lib/calendar";
import { ConnectRow } from "./Connect";

const MINUTE = 60_000;
/** How soon a meeting's way in is offered in the list. */
const SOON = 10 * MINUTE;
/** How many coming meetings the list shows. */
const SHOWN = 8;

/**
 * Beside the week: what's coming up on your calendar, with the way in as it
 * gets close, and the calendars on the week: yours, and each teammate's with
 * one connected, ticked to show over yours in their colour.
 */
export function Sidebar({
  connected,
  off,
  email,
  events,
  now,
  you,
  myColor,
  teammates,
  quiet,
  shown,
  colorOf,
  onToggle,
  onOpen,
  settingsHref,
}: {
  connected: boolean;
  /** Known not to be connected (not still loading): Google Calendar shows as a row to connect. */
  off: boolean;
  email: string | null;
  events: CalendarEvent[];
  now: number;
  you: Member | undefined;
  myColor: string;
  teammates: Member[];
  quiet: Member[];
  shown: string[];
  colorOf: (id: string) => string;
  onToggle: (id: string) => void;
  onOpen: (event: CalendarEvent, at: { x: number; y: number }) => void;
  settingsHref: string;
}) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const time = new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" });
  const coming = events.filter((event) => !event.allDay && event.end > now).slice(0, SHOWN);
  const dayOf = (ms: number) => {
    const offset = Math.round((dayStart(0, ms) - dayStart(0, now)) / (24 * 60 * MINUTE));
    return offset === 0 ? t("today") : offset === 1 ? t("tomorrow") : weekday.format(ms);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-6">
      <h1 className="px-1 text-[20px] font-semibold tracking-tight text-foreground">{t("title")}</h1>

      {connected && (
        <section className="mt-6">
          <h2 className="px-1 text-[12px] font-medium text-muted-foreground">{t("upNext")}</h2>
          {coming.length ? (
            <ul className="mt-1.5">
              {coming.map((event, index) => {
                const label = dayOf(event.start);
                const heading = index === 0 || dayOf(coming[index - 1].start) !== label;
                const on = event.start <= now;
                const where = event.link ? placeOf(event.link) : null;
                const offer = where && (on || event.start - now <= SOON);
                return (
                  <li key={event.id}>
                    {heading && <p className="px-1 pb-1 pt-2.5 text-[11.5px] font-medium text-faint">{label}</p>}
                    <div className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-muted/60">
                      <span className="h-8 w-[3px] shrink-0 rounded-full" style={{ background: myColor }} />
                      <button type="button" onClick={(click) => onOpen(event, { x: click.clientX, y: click.clientY })} className="min-w-0 flex-1 cursor-pointer text-start">
                        <span className="block truncate text-[13px] font-medium text-foreground">{event.title || t("untitled")}</span>
                        <span className="block truncate text-[11.5px] tabular-nums text-muted-foreground">
                          {on ? t("nowUntil", { time: time.format(event.end) }) : `${time.format(event.start)} – ${time.format(event.end)}`}
                        </span>
                      </button>
                      {offer &&
                        (where === "tinyfloor" ? (
                          <button type="button" onClick={() => callManager.joinMeeting(MAIN_MEETING)} className="h-7 shrink-0 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background hover:opacity-90">
                            {t("joinHere")}
                          </button>
                        ) : (
                          <a href={event.link!} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-foreground px-3 text-[12px] font-medium text-background hover:opacity-90">
                            {t("joinHere")}
                            <ExternalLink className="size-3" />
                          </a>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-1 pt-2 text-[13px] text-muted-foreground">{t("nothingComing")}</p>
          )}
        </section>
      )}

      <section className={connected ? "mt-7" : "mt-5"}>
        <h2 className="px-1 text-[12px] font-medium text-muted-foreground">{t("calendars")}</h2>
        <ul className="mt-1.5 flex flex-col gap-px">
          {off && (
            <li>
              <ConnectRow />
            </li>
          )}
          {connected && you && (
            <li className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
              <Face seed={you.id} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">{t("yours")}</span>
                {email && <span className="block truncate text-[11.5px] text-muted-foreground">{email}</span>}
              </span>
              <Tick on color={myColor} />
            </li>
          )}
          {teammates.map((member) => {
            const on = shown.includes(member.id);
            return (
              <li key={member.id}>
                <button type="button" aria-pressed={on} onClick={() => onToggle(member.id)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-start hover:bg-muted/60">
                  <Face seed={member.id} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{member.displayName}</span>
                  <Tick on={on} color={colorOf(member.id)} />
                </button>
              </li>
            );
          })}
        </ul>
        {/* Who hasn't connected one: their faces and how many, their names on hover. */}
        {quiet.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2.5 px-1" title={quiet.map((one) => one.displayName).join(", ")}>
            <span className="flex min-w-6 shrink-0 justify-center">
              <FaceStack seeds={quiet.map((one) => one.id)} size={20} max={4} />
            </span>
            <span className="truncate text-[11.5px] text-muted-foreground">{t("notConnected", { count: quiet.length })}</span>
          </div>
        )}
      </section>

      {connected && (
        <Link href={`${settingsHref}#calendar`} className="mt-auto px-1 pt-8 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          {t("settings")}
        </Link>
      )}
    </div>
  );
}

/** A calendar's tick: filled in its colour when it's on the week. */
function Tick({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-4 shrink-0 items-center justify-center rounded-[5px] border text-white", !on && "border-border-strong")}
      style={on ? { background: color, borderColor: color } : undefined}
    >
      {on && <Check className="size-3" />}
    </span>
  );
}
