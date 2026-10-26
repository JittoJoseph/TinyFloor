"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Eye, Refresh } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { INK, STONE } from "@/components/home/Blocks";
import { decodePick, drawNames, encodePick, santaNames, type SantaPick } from "@/lib/tools/secret-santa/draw";
import type { SantaContent } from "@/lib/tools/secret-santa";

const onHash = (change: () => void) => {
  window.addEventListener("hashchange", change);
  return () => window.removeEventListener("hashchange", change);
};

/**
 * A Secret Santa draw: names in, one private link out per person. The link
 * itself carries the pick after the #, so nothing is stored or sent anywhere;
 * opening one shows that person who they're buying for.
 */
export function SecretSantaDrawer({ locale, copy }: { locale: string; copy: SantaContent["drawer"] }) {
  const hash = useSyncExternalStore(onHash, () => window.location.hash, () => "");
  const pick = decodePick(hash);
  return pick ? <Reveal locale={locale} copy={copy} pick={pick} /> : <Drawer copy={copy} />;
}

const label = "text-[13px] font-medium text-muted-foreground";
const field =
  "mt-2 w-full rounded-xl border border-border bg-background px-3 text-[16px] text-foreground outline-none transition-colors focus:border-foreground/35 sm:text-[14.5px]";

function Drawer({ copy }: { copy: SantaContent["drawer"] }) {
  const [text, setText] = useState("");
  const [budget, setBudget] = useState("");
  const [date, setDate] = useState("");
  const [links, setLinks] = useState<Array<{ name: string; url: string }> | null>(null);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const draw = () => {
    const names = santaNames(text);
    if (names.length < 3) return setProblem(copy.tooFew);
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) return setProblem(copy.duplicate);
    setProblem("");
    const base = `${window.location.origin}${window.location.pathname}`;
    const pairs = new Map(drawNames(names));
    // Listed in the order they were typed, so the organiser can find each person.
    setLinks(
      names.map((name) => ({
        name,
        url: `${base}#${encodePick({ name, to: pairs.get(name)!, budget: budget.trim() || undefined, date: date || undefined })}`,
      })),
    );
  };

  const copyText = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      // The links are on screen to copy by hand.
    }
  };

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div className="grid gap-6">
        <label className="block">
          <span className={label}>{copy.names}</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            maxLength={3000}
            className={cn(field, "resize-y py-2.5 leading-[1.6]")}
          />
          <span className="mt-1.5 block text-[12.5px] text-faint">{copy.namesHint}</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={label}>
              {copy.budget} <span className="font-normal text-faint">{copy.optional}</span>
            </span>
            <input value={budget} onChange={(event) => setBudget(event.target.value)} maxLength={24} className={cn(field, "h-10")} />
          </label>
          <label className="block">
            <span className={label}>
              {copy.date} <span className="font-normal text-faint">{copy.optional}</span>
            </span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={cn(field, "h-10")} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={draw} className={cn(links ? STONE : INK, "cursor-pointer")}>
            {links && <Refresh className="size-4" />}
            {links ? copy.redraw : copy.draw}
          </button>
          {problem && (
            <p role="alert" className="text-[13.5px] text-destructive">
              {problem}
            </p>
          )}
        </div>
      </div>

      {links && (
        <div className="mt-8 rounded-[20px] bg-background p-5 sm:p-6">
          <p className="text-[13px] font-medium text-muted-foreground">{copy.linksTitle}</p>
          <p className="mt-2 text-[14.5px] leading-[1.6] text-foreground/80">{copy.linksNote}</p>
          <ul aria-live="polite" className="mt-5 divide-y divide-border">
            {links.map((link) => (
              <li key={link.name} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-[15.5px]">{link.name}</span>
                <button type="button" onClick={() => copyText(link.name, link.url)} className={cn(STONE, "shrink-0 cursor-pointer")}>
                  {copied === link.name ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied === link.name ? copy.copied : copy.copy}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={() => copyText("all", [copy.allIntro, ...links.map((link) => `${link.name}: ${link.url}`)].join("\n"))}
              className={cn(STONE, "cursor-pointer")}
            >
              {copied === "all" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied === "all" ? copy.copied : copy.copyAll}
            </button>
            <p className="text-[12.5px] text-faint">{copy.redrawNote}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Reveal({ locale, copy, pick }: { locale: string; copy: SantaContent["drawer"]; pick: SantaPick }) {
  const [shown, setShown] = useState(false);
  const date =
    pick.date &&
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${pick.date}T00:00:00Z`));
  const own = () => {
    window.history.replaceState(null, "", window.location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  };

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div className="rounded-[20px] bg-background p-6 text-center sm:p-10">
        <p className="text-[18px] font-medium tracking-[-0.01em]">{copy.revealTitle.replace("{name}", pick.name)}</p>
        {shown ? (
          <p aria-live="polite" className="mt-6 break-words text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[48px]">
            {pick.to}
          </p>
        ) : (
          <div className="mt-6">
            <button type="button" onClick={() => setShown(true)} className={cn(INK, "cursor-pointer")}>
              <Eye className="size-4" />
              {copy.show}
            </button>
            <p className="mt-3 text-[12.5px] text-faint">{copy.lookAway}</p>
          </div>
        )}
        {(pick.budget || date) && (
          <dl className="mx-auto mt-8 flex max-w-sm flex-wrap justify-center gap-x-8 gap-y-2 text-[14.5px]">
            {pick.budget && (
              <div>
                <dt className="text-muted-foreground">{copy.budgetLabel}</dt>
                <dd className="mt-0.5 font-medium">{pick.budget}</dd>
              </div>
            )}
            {date && (
              <div>
                <dt className="text-muted-foreground">{copy.dateLabel}</dt>
                <dd className="mt-0.5 font-medium">{date}</dd>
              </div>
            )}
          </dl>
        )}
        {shown && <p className="mt-6 text-[13.5px] text-muted-foreground">{copy.keepSecret}</p>}
      </div>
      <button type="button" onClick={own} className="mt-5 cursor-pointer text-[14px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {copy.own}
      </button>
    </div>
  );
}
