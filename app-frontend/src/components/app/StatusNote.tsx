"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Loader2, X } from "@/components/ui/icons";
import { STATUS_NOTE_MAX, type StatusNote } from "@shared/messages";
import { saveMyNote } from "@/lib/floor";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/motion/button/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { cn } from "@/lib/utils";

/** How long a note stays: until it's changed, or a stretch that suits what it says. */
type Lasting = "never" | "m30" | "h1" | "h4" | "today" | "week";
const LASTINGS: Lasting[] = ["never", "m30", "h1", "h4", "today", "week"];

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
 * The notes people reach for, each with the time it usually lasts. Picking one
 * fills the note in and sets when it clears, as Slack's do, so a stale "Lunch"
 * doesn't sit there all afternoon.
 */
const PRESETS: Array<{ key: "focus" | "lunch" | "back" | "sick" | "holiday"; emoji: string; lasting: Lasting }> = [
  { key: "focus", emoji: "🎧", lasting: "h1" },
  { key: "lunch", emoji: "🍜", lasting: "h1" },
  { key: "back", emoji: "🚶", lasting: "m30" },
  { key: "sick", emoji: "🤒", lasting: "today" },
  { key: "holiday", emoji: "🌴", lasting: "never" },
];

const EMOJI = ["💬", "🎧", "🍜", "☕", "🚶", "📅", "🎯", "🛠️", "📞", "🤒", "🌴", "✈️", "🏠", "🌙", "🎉", "👀"];

/** A note as one line: its emoji, then its words. */
export const noteLine = (note: StatusNote) => [note.emoji, note.text].filter(Boolean).join(" ");

/**
 * Setting your status note: a few words and an emoji, or one of the usual
 * ones, and when it should clear. It shows beside your status everywhere your
 * team sees you, and on your name tag on the floor.
 */
export function StatusNoteDialog({ open, onClose, note }: { open: boolean; onClose: () => void; note: StatusNote | null }) {
  const t = useTranslations("note");
  const tc = useTranslations("common");
  const format = useFormatter();
  const input = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState<string>(note?.emoji ?? "💬");
  const [text, setText] = useState(note?.text ?? "");
  // Editing a note that clears itself keeps its time unless another is picked.
  const kept = note?.until ?? null;
  const [lasting, setLasting] = useState<Lasting | "keep">(kept ? "keep" : "never");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const typed = text.trim();
  // A time today, or a day and a time later on.
  const when = (at: number) =>
    format.dateTime(new Date(at), {
      ...(new Date(at).toDateString() === new Date().toDateString() ? {} : { weekday: "short" }),
      hour: "numeric",
      minute: "2-digit",
    });

  const save = async (next: StatusNote | null) => {
    setBusy(true);
    setFailed(false);
    try {
      await saveMyNote(next);
      onClose();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (typed && !busy) void save({ emoji, text: typed, until: lasting === "keep" ? kept : untilFor(lasting) });
  };

  const pickPreset = (preset: (typeof PRESETS)[number]) => {
    setEmoji(preset.emoji);
    setText(t(`presets.${preset.key}`));
    setLasting(preset.lasting);
    setPicking(false);
    input.current?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("title")}
      closeLabel={tc("close")}
      footer={
        <>
          {note && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(null)}
              className="me-auto inline-flex h-10 cursor-pointer items-center rounded-full px-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t("clear")}
            </button>
          )}
          <Button variant="ghost" size="sm" className="h-10 px-4" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button size="sm" className="h-10 gap-2 px-5" disabled={busy || !typed} onClick={submit}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="relative">
        <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-background ps-1 pe-1.5 transition-colors focus-within:border-foreground/35">
          <button
            type="button"
            aria-label={t("emoji")}
            aria-expanded={picking}
            onClick={() => setPicking((open) => !open)}
            className={cn(
              "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-foreground/[0.06]",
              picking && "bg-foreground/[0.06]",
            )}
          >
            {emoji}
          </button>
          <input
            ref={input}
            value={text}
            autoFocus
            maxLength={STATUS_NOTE_MAX}
            placeholder={t("placeholder")}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && submit()}
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[14px]"
          />
          {text && (
            <button
              type="button"
              aria-label={t("empty")}
              onClick={() => {
                setText("");
                input.current?.focus();
              }}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {picking && <EmojiGrid label={t("emoji")} chosen={emoji} onPick={(one) => {
            setEmoji(one);
            setPicking(false);
          }} onDone={() => setPicking(false)} />}
      </div>

      <ul className="-mx-2 mt-3 flex flex-col">
        {PRESETS.map((preset) => {
          const label = t(`presets.${preset.key}`);
          const chosen = emoji === preset.emoji && typed === label;
          return (
            <li key={preset.key}>
              <button
                type="button"
                aria-pressed={chosen}
                onClick={() => pickPreset(preset)}
                className="flex h-10 w-full cursor-pointer items-center gap-1 rounded-lg px-2 pe-3 text-start text-[13.5px] transition-colors hover:bg-foreground/[0.05]"
              >
                {/* In line with the note's own emoji and words above. */}
                <span className="ms-[5px] w-9 shrink-0 text-center text-[17px]">{preset.emoji}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
                {chosen && <Check className="size-4 shrink-0 text-foreground" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <span className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">
          {t("clearAfter")}
        </span>
        <Select value={lasting} onValueChange={(value) => setLasting(value as Lasting | "keep")}>
          <SelectTrigger className="h-10 text-[13.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kept && <SelectItem value="keep">{when(kept)}</SelectItem>}
            {LASTINGS.map((one) => (
              <SelectItem key={one} value={one}>
                {t(`lasting.${one}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {failed && <p className="mt-2 text-[12.5px] text-destructive">{t("failed")}</p>}
    </Dialog>
  );
}

/** The emoji to pick from, over what's below rather than pushing it down; a click elsewhere puts it away. */
function EmojiGrid({ label, chosen, onPick, onDone }: { label: string; chosen: string; onPick: (emoji: string) => void; onDone: () => void }) {
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const away = (event: PointerEvent) => {
      if (!grid.current?.parentElement?.contains(event.target as Node)) onDone();
    };
    // Escape puts the emoji away, not the whole dialog.
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onDone();
    };
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape, true);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape, true);
    };
  }, [onDone]);

  return (
    <div
      ref={grid}
      role="group"
      aria-label={label}
      className="absolute inset-x-0 top-[calc(100%+6px)] z-20 grid grid-cols-8 gap-1 rounded-xl border border-border bg-popover p-1.5 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.5)]"
    >
      {EMOJI.map((one) => (
        <button
          key={one}
          type="button"
          aria-pressed={chosen === one}
          onClick={() => onPick(one)}
          className={cn(
            "flex h-9 cursor-pointer items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-foreground/[0.06]",
            chosen === one && "bg-foreground/[0.08]",
          )}
        >
          {one}
        </button>
      ))}
    </div>
  );
}
