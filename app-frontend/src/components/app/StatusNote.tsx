"use client";

import { useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowUp, Check, PenLine } from "@/components/ui/icons";
import { STATUS_NOTE_MAX, type NoteIcon, type StatusNote } from "@shared/messages";
import { NOTE_ICON_LIST, NoteGlyph } from "@/lib/noteIcons";
import { saveMyNote } from "@/lib/floor";
import { MenuRow } from "@/components/ui/MenuViews";
import { cn } from "@/lib/utils";

/** How long a note stays: a stretch that suits what it says, or until it's changed. */
type Lasting = "m30" | "h1" | "h4" | "today" | "week" | "never";
const CHOICES: Lasting[] = ["m30", "h1", "today", "never"];

function untilFor(lasting: Lasting, now = new Date()): number | null {
  const at = new Date(now);
  switch (lasting) {
    case "never":
      return null;
    case "m30":
      return now.getTime() + 30 * 60_000;
    case "h1":
      return now.getTime() + 60 * 60_000;
    case "h4":
      return now.getTime() + 4 * 60 * 60_000;
    case "today":
      at.setHours(23, 59, 59, 999);
      return at.getTime();
    case "week":
      // To the end of Sunday, wherever you are.
      at.setDate(at.getDate() + ((7 - at.getDay()) % 7));
      at.setHours(23, 59, 59, 999);
      return at.getTime();
  }
}

/**
 * The notes people reach for, each with the time it usually lasts. One press
 * sets it and clears it when it should, as Slack's do, so a stale "Lunch"
 * doesn't sit there all afternoon.
 */
const PRESETS: Array<{ key: "focus" | "lunch" | "back" | "sick" | "holiday"; icon: NoteIcon; lasting: Lasting }> = [
  { key: "focus", icon: "focus", lasting: "h1" },
  { key: "lunch", icon: "lunch", lasting: "h1" },
  { key: "back", icon: "away", lasting: "m30" },
  { key: "sick", icon: "sick", lasting: "today" },
  { key: "holiday", icon: "holiday", lasting: "week" },
];

/** A note as words, for a tooltip or a screen reader; its icon is drawn beside it (NoteText). */
export const noteLine = (note: StatusNote) => note.text;

/** A note as people see it in a line: its icon, then its words. */
export function NoteText({ note, className }: { note: StatusNote; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 max-w-full items-center gap-1 align-[-2px]", className)}>
      <NoteGlyph icon={note.icon} className="size-[13px]" />
      <span className="truncate">{note.text}</span>
    </span>
  );
}

/**
 * How long a note was set to last, read back from it: a usual note's own
 * stretch, or the nearest choice to when it clears, so editing one starts
 * where it is rather than at "Today".
 */
function lastingOf(note: StatusNote | null, usual: Lasting | undefined, now = Date.now()): Lasting {
  if (!note) return "today";
  if (!note.until) return "never";
  if (usual && CHOICES.includes(usual)) return usual;
  const left = note.until - now;
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  if (Math.abs(note.until - endOfDay.getTime()) < 60_000) return "today";
  return left <= 31 * 60_000 ? "m30" : left <= 61 * 60_000 ? "h1" : "today";
}

/** "30 min", "1 hr", "Today": how long something lasts, said short. */
function useLastingLabel() {
  const t = useTranslations("note");
  const locale = useLocale();
  return (lasting: Lasting) => {
    if (lasting === "today" || lasting === "week" || lasting === "never") return t(`lasting.${lasting}`);
    const [value, unit] = lasting === "m30" ? [30, "minute"] : lasting === "h1" ? [1, "hour"] : [4, "hour"];
    return new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value);
  };
}

/** When a note clears: a time today, or a day and a time later on. */
export function useNoteUntil() {
  const format = useFormatter();
  return (at: number) =>
    format.dateTime(new Date(at), {
      ...(new Date(at).toDateString() === new Date().toDateString() ? {} : { weekday: "short" }),
      hour: "numeric",
      minute: "2-digit",
    });
}

/** Your note in the menu: what it says, with a way to clear it, or a way to set one; pressed, its choices open beneath. */
export function NoteRow({ note, open, onToggle }: { note: StatusNote | null; open: boolean; onToggle: () => void }) {
  const t = useTranslations("note");
  const until = useNoteUntil();
  // Open, it heads the note's own choices, which hold the note and its icon themselves.
  if (!note || open) {
    return (
      <MenuRow icon={<PenLine />} onClick={onToggle} open={open}>
        {open ? t("title") : t("set")}
      </MenuRow>
    );
  }
  return (
    <MenuRow
      icon={<NoteGlyph icon={note.icon} />}
      onClick={onToggle}
      open={open}
      label={noteLine(note)}
      actionWidth="w-12"
      actionOnHover
      hint={note.until ? until(note.until) : undefined}
      action={
        // A word, not an ×, which reads as closing the menu; shown where the pointer is, and always to a finger.
        <button
          type="button"
          onClick={() => void saveMyNote(null).catch(() => {})}
          className="h-6 cursor-pointer rounded-md px-1.5 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
        >
          {t("clearShort")}
        </button>
      }
    >
      <span className="block truncate">{note.text}</span>
    </MenuRow>
  );
}

/**
 * Setting your note, beneath its row: one press on a usual one sets it,
 * clearing itself when it should; your own words take Enter, with how long
 * they last a press below. It shows beside your status everywhere your team
 * sees you, and on your name tag on the floor.
 */
export function NoteOptions({ note, onDone }: { note: StatusNote | null; onDone: () => void }) {
  const t = useTranslations("note");
  const lastingLabel = useLastingLabel();
  const input = useRef<HTMLInputElement>(null);
  const [icon, setIcon] = useState<NoteIcon>(note?.icon ?? "chat");
  const [text, setText] = useState(note?.text ?? "");
  // A usual note's icon and stretch go with its words: new words start from the plain icon.
  const preset = note ? PRESETS.find((one) => one.icon === note.icon && t(`presets.${one.key}`) === note.text) : undefined;
  const fromPreset = !!preset;
  // Your own words last the day unless you say otherwise; a note being edited keeps how long it was set for.
  const [initial] = useState<Lasting>(() => lastingOf(note, preset?.lasting));
  const [lasting, setLasting] = useState<Lasting>(initial);
  const [picking, setPicking] = useState(false);
  const [failed, setFailed] = useState(false);
  const typed = text.trim();
  const changed = !note || typed !== note.text || icon !== (note.icon ?? "chat") || lasting !== initial;

  const save = (next: StatusNote | null) => {
    setFailed(false);
    // Shown at once; put back, and said so, if keeping it fails.
    saveMyNote(next).catch(() => setFailed(true));
    onDone();
  };
  const submit = () => {
    if (!typed) return;
    if (!changed) return onDone();
    save({ icon, text: typed, until: untilFor(lasting) });
  };

  return (
    <>
      <div className="pb-1">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex h-10 items-center gap-1.5 rounded-[9px] bg-background pe-1 ring-1 ring-foreground/[0.08] focus-within:ring-2 focus-within:ring-foreground/20"
        >
          <button
            type="button"
            aria-label={t("icon")}
            aria-expanded={picking}
            onClick={() => setPicking((open) => !open)}
            className={cn(
              // Its icon lines up with the usual ones below.
              "flex h-10 w-8 shrink-0 cursor-pointer items-center justify-center rounded-s-[9px] transition-colors hover:bg-foreground/[0.07]",
              picking && "bg-foreground/[0.08]",
            )}
          >
            <NoteGlyph icon={icon} />
          </button>
          <input
            ref={input}
            value={text}
            autoFocus
            maxLength={STATUS_NOTE_MAX}
            placeholder={t("placeholder")}
            onChange={(event) => {
              if (fromPreset && icon === note?.icon) setIcon("chat");
              setText(event.target.value);
            }}
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[13px]"
          />
          {typed && (
            <button
              type="submit"
              aria-label={t("save")}
              className={cn(
                "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[transform,background-color,color]",
                // Quiet until there's something new to set.
                changed ? "bg-foreground text-background hover:scale-105 active:scale-95" : "bg-foreground/[0.08] text-faint",
              )}
            >
              <ArrowUp className="size-3.5" />
            </button>
          )}
        </form>

        {/* How long your own words last: shown once there are some. */}
        {typed && !picking && (
          <div className="mt-1.5 flex flex-wrap gap-1" role="radiogroup" aria-label={t("clearAfter")}>
            {CHOICES.map((one) => (
              <Chip
                key={one}
                on={lasting === one}
                onClick={() => {
                  setLasting(one);
                  // Back to the words, so Enter still sets it.
                  input.current?.focus();
                }}
              >
                {lastingLabel(one)}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {picking ? (
        <div role="group" aria-label={t("icon")} className="grid grid-cols-8 gap-0.5 pb-0.5 pt-0.5">
          {NOTE_ICON_LIST.map((one) => (
            <button
              key={one}
              type="button"
              aria-pressed={icon === one}
              aria-label={t(`icons.${one}`)}
              title={t(`icons.${one}`)}
              onClick={() => {
                setIcon(one);
                setPicking(false);
                input.current?.focus();
              }}
              className={cn(
                "flex h-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-foreground/[0.07]",
                icon === one && "bg-foreground/[0.1] ring-1 ring-foreground/15",
              )}
            >
              <NoteGlyph icon={one} />
            </button>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col">
          {PRESETS.map((preset) => {
            const label = t(`presets.${preset.key}`);
            const current = note?.icon === preset.icon && note.text === label;
            return (
              <li key={preset.key}>
                <button
                  type="button"
                  onClick={() => (current ? onDone() : save({ icon: preset.icon, text: label, until: untilFor(preset.lasting) }))}
                  aria-current={current || undefined}
                  className="flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2 text-start text-[13px] outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06]"
                >
                  <NoteGlyph icon={preset.icon} />
                  <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
                  {/* The one you have is ticked, so it doesn't look like where the pointer is. */}
                  {current ? (
                    <Check className="size-3.5 shrink-0 text-foreground" />
                  ) : (
                    <span className="shrink-0 text-[12px] text-faint">{lastingLabel(preset.lasting)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {(note || failed) && (
        <div className="mt-1 flex items-center justify-between border-t border-foreground/[0.07] px-2 pt-1.5">
          {failed ? <p className="text-[12px] text-destructive">{t("failed")}</p> : <span />}
          {note && (
            <button
              type="button"
              onClick={() => save(null)}
              className="-me-1 cursor-pointer rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              {t("clear")}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "h-7 cursor-pointer rounded-full px-2.5 text-[12px] font-medium transition-colors",
        on ? "bg-foreground text-background" : "bg-foreground/[0.06] text-muted-foreground hover:bg-foreground/[0.1] hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
