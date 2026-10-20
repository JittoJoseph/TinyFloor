"use client";

import { useState } from "react";
import { Check, Copy } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { STONE } from "@/components/home/Blocks";
import { standupMinutes, type StandupContent, type StandupFormat } from "@/lib/tools/standup";

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/**
 * A standup to run tomorrow: the team's size, how it meets (on a call, in
 * writing, or walking the board) and which three questions, and out comes a
 * timed agenda, or the message to post, ready to copy. Everything is worked
 * out in the page; nothing is sent anywhere.
 */
export function StandupBuilder({ copy }: { copy: StandupContent["builder"] }) {
  const [people, setPeople] = useState(6);
  const [format, setFormat] = useState<StandupFormat>("live");
  const [set, setSet] = useState(copy.sets[0].key);
  const [icebreaker, setIcebreaker] = useState(false);
  const [copied, setCopied] = useState(false);

  const questions = (copy.sets.find((one) => one.key === set) ?? copy.sets[0]).questions;
  const minutes = standupMinutes(format, people, icebreaker);

  // Each line with the minute it starts at, for a meeting (the round lists the
  // questions under it); the message itself, for writing.
  type Row = { at?: string; text: string; under?: readonly string[] };
  let rows: Row[];
  if (format === "async") {
    rows = questions.map((question) => ({ text: question, under: ["- "] }));
  } else {
    const parts: Array<[Row, number]> = [[{ text: copy.lines.open }, 0.5]];
    if (icebreaker) parts.push([{ text: copy.lines.icebreaker }, 1]);
    if (format === "live") parts.push([{ text: copy.lines.round, under: questions }, Math.max(1, minutes - 1.5 - (icebreaker ? 1 : 0))]);
    else for (const column of copy.columns) parts.push([{ text: fill(copy.lines.column, { column }) }, Math.max(1, (minutes - 1.5 - (icebreaker ? 1 : 0)) / copy.columns.length)]);
    parts.push([{ text: copy.lines.blockers }, 0.5], [{ text: copy.lines.close }, 0.5]);
    let at = 0;
    rows = parts.map(([row, length]) => {
      // To the half minute: an agenda says 2:30, not 2:53.
      const half = Math.floor(at * 2) / 2;
      const start = `${Math.floor(half)}:${half % 1 ? "30" : "00"}`;
      at += length;
      return { ...row, at: start };
    });
  }
  const text = rows
    .map((row) => [row.at ? `${row.at}  ${row.text}` : row.text, ...(row.under ?? []).map((line) => (row.at ? `      ${line}` : line))].join("\n"))
    .join(format === "async" ? "\n\n" : "\n");

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(format === "async" ? text : `${fill(copy.minutes, { count: minutes })}\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // The text is on screen to copy by hand.
    }
  };

  const chip = (on: boolean) =>
    cn(
      "h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
      on ? "bg-foreground text-background" : "bg-background/70 text-muted-foreground hover:text-foreground",
    );
  const label = "text-[13px] font-medium text-muted-foreground";

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div className="grid gap-6">
        {/* Written, it takes as long as each person takes to write: no size to set. */}
        {format !== "async" && (
          <div>
            <label htmlFor="standup-people" className={label}>
              {copy.team}
            </label>
            <div className="mt-2.5 flex items-center gap-4">
              <input
                id="standup-people"
                type="range"
                min={2}
                max={15}
                value={people}
                onChange={(event) => setPeople(Number(event.target.value))}
                className="w-full max-w-[18rem] cursor-pointer accent-[var(--color-foreground)]"
              />
              <span className="text-[15px] font-medium tabular-nums">{fill(copy.people, { count: people })}</span>
            </div>
          </div>
        )}

        <div>
          <p className={label}>{copy.format}</p>
          <div role="group" aria-label={copy.format} className="mt-2.5 flex flex-wrap gap-2">
            {(Object.keys(copy.formats) as StandupFormat[]).map((key) => (
              <button key={key} type="button" aria-pressed={format === key} onClick={() => setFormat(key)} className={chip(format === key)}>
                {copy.formats[key]}
              </button>
            ))}
          </div>
        </div>

        {format !== "board" && (
          <div>
            <p className={label}>{copy.questions}</p>
            <div role="group" aria-label={copy.questions} className="mt-2.5 flex flex-wrap gap-2">
              {copy.sets.map((one) => (
                <button key={one.key} type="button" aria-pressed={set === one.key} onClick={() => setSet(one.key)} className={chip(set === one.key)}>
                  {one.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {format !== "async" && (
          <label className="flex cursor-pointer items-center gap-2.5 text-[14.5px]">
            <input type="checkbox" checked={icebreaker} onChange={(event) => setIcebreaker(event.target.checked)} className="size-4 cursor-pointer accent-[var(--color-foreground)]" />
            {copy.icebreaker}
          </label>
        )}
      </div>

      <div className="mt-8 rounded-[20px] bg-background p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-medium text-muted-foreground">{format === "async" ? copy.template : copy.agenda}</p>
          {format !== "async" && (
            <p className="text-[26px] font-normal tracking-[-0.03em] sm:text-[30px]">{fill(copy.minutes, { count: minutes })}</p>
          )}
        </div>
        <ol aria-live="polite" className="mt-4 grid gap-2.5 text-[15px] leading-[1.6] text-foreground/85">
          {rows.map((row) => (
            <li key={row.text} className="flex gap-3">
              {row.at && <span className="w-10 shrink-0 tabular-nums text-muted-foreground">{row.at}</span>}
              <span className="min-w-0">
                {row.text}
                {row.under && (
                  <ul className="mt-1 grid gap-0.5 text-foreground/70">
                    {row.under.map((line) => (
                      <li key={line}>{row.at ? `· ${line}` : line}</li>
                    ))}
                  </ul>
                )}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13px] leading-[1.6] text-muted-foreground">{copy.note[format]}</p>
        <div className="mt-5">
          <button type="button" onClick={copyText} className={cn(STONE, "cursor-pointer")}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      </div>
    </div>
  );
}
