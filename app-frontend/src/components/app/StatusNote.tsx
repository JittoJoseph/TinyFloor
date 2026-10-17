"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Loader2 } from "@/components/ui/icons";
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
 * The notes people reach for, each with the time it usually lasts, so setting
 * one is a single tap that also takes itself down. Slack's own presets work the
 * same way.
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
 * ones, and how long it should stay. It shows beside your status everywhere
 * your team sees you, and on your name tag on the floor.
 */
export function StatusNoteDialog({ open, onClose, note }: { open: boolean; onClose: () => void; note: StatusNote | null }) {
  const t = useTranslations("note");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [emoji, setEmoji] = useState<string | null>(note?.emoji ?? "💬");
  const [text, setText] = useState(note?.text ?? "");
  // Editing a note that clears itself keeps its time unless another is picked.
  const kept = note?.until ?? null;
  const [lasting, setLasting] = useState<Lasting | "keep">(kept ? "keep" : "never");
  const until = () => (lasting === "keep" ? kept : untilFor(lasting));
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

  const pickPreset = (preset: (typeof PRESETS)[number]) => {
    void save({ emoji: preset.emoji, text: t(`presets.${preset.key}`), until: untilFor(preset.lasting) });
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
              className="me-auto inline-flex h-10 cursor-pointer items-center rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t("clear")}
            </button>
          )}
          <Button variant="ghost" size="sm" className="h-10 px-4" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            size="sm"
            className="h-10 gap-2 px-5"
            disabled={busy || !typed}
            onClick={() => void save({ emoji, text: typed, until: until() })}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-card ps-1 pe-3 focus-within:border-foreground/35">
        <button
          type="button"
          aria-label={t("emoji")}
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-foreground/[0.06]"
        >
          {emoji ?? "💬"}
        </button>
        <input
          value={text}
          autoFocus
          maxLength={STATUS_NOTE_MAX}
          placeholder={t("placeholder")}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && typed && !busy) void save({ emoji, text: typed, until: until() });
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[14px]"
        />
      </div>

      {picking && (
        <div role="group" aria-label={t("emoji")} className="mt-2 grid grid-cols-8 gap-1 rounded-xl border border-border bg-card p-1.5">
          {EMOJI.map((one) => (
            <button
              key={one}
              type="button"
              aria-pressed={emoji === one}
              onClick={() => {
                setEmoji(one);
                setPicking(false);
              }}
              className={cn(
                "flex h-9 cursor-pointer items-center justify-center rounded-lg text-[18px] transition-colors hover:bg-foreground/[0.06]",
                emoji === one && "bg-foreground/[0.08]",
              )}
            >
              {one}
            </button>
          ))}
        </div>
      )}

      {!typed && (
        <ul className="mt-3 flex flex-col">
          {PRESETS.map((preset) => (
            <li key={preset.key}>
              <button
                type="button"
                disabled={busy}
                onClick={() => pickPreset(preset)}
                className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-2 text-start text-[13.5px] transition-colors hover:bg-foreground/[0.05] disabled:opacity-50"
              >
                <span className="w-6 text-center text-[17px]">{preset.emoji}</span>
                <span className="flex-1 text-foreground">{t(`presets.${preset.key}`)}</span>
                <span className="text-[12.5px] text-muted-foreground">{t(`lasting.${preset.lasting}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[13px] text-muted-foreground">{t("clearAfter")}</span>
        <div className="w-44">
          <Select value={lasting} onValueChange={(value) => setLasting(value as Lasting | "keep")}>
            <SelectTrigger className="h-9 bg-card text-[13px]" aria-label={t("clearAfter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kept && <SelectItem value="keep">{t("keep", { time: when(kept) })}</SelectItem>}
              {LASTINGS.map((one) => (
                <SelectItem key={one} value={one}>
                  {t(`lasting.${one}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {failed && <p className="mt-2 text-[12.5px] text-destructive">{t("failed")}</p>}
    </Dialog>
  );
}
