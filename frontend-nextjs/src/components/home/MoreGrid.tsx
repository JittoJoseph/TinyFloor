import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MonitorUp, Moon, Music2, Sun } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { locales } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";
import { CAST } from "./previews/Frame";

const [maya, leo, priya] = CAST;

type Key = "screen" | "whiteboard" | "music" | "status" | "noise" | "mobile" | "themes" | "languages";

/**
 * Everything else in an office, as a blueprint: one ruled sheet split into
 * cells, each with a small drawing of the thing in the app's own pieces, and
 * one cell in the brand colour. Server markup; the only motion is CSS.
 */
export function MoreGrid() {
  const t = useTranslations("home.more");
  const cell = (key: Key, art: ReactNode, className?: string, brand?: boolean) => ({ key, art, className, brand });
  const cells = [
    cell("screen", <ScreenArt />, "lg:col-span-2 lg:row-span-2"),
    cell("whiteboard", <BoardArt />),
    cell("music", <MusicArt />),
    cell("status", <StatusArt />),
    cell("noise", <NoiseArt />, undefined, true),
    cell("mobile", <JoystickArt />),
    cell("themes", <ThemeArt />),
    cell("languages", <LanguageArt />, "sm:col-span-2"),
  ];

  return (
    <div className="relative mt-12">
      {/* The sheet's corner marks. */}
      {["-start-1 -top-1", "-end-1 -top-1", "-start-1 -bottom-1", "-end-1 -bottom-1"].map((spot) => (
        <span key={spot} aria-hidden className={cn("absolute z-10 size-2 border border-border-strong bg-background", spot)} />
      ))}
      <ul className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {cells.map(({ key, art, className, brand }, index) => (
          <li
            key={key}
            className={cn(
              "flex flex-col p-6 sm:p-7",
              brand ? "bg-brand text-white" : "bg-background",
              key === "screen" && cn("bg-background", DOTS_FAINT),
              className,
            )}
          >
            <span className={cn("font-mono text-[11px] tabular-nums", brand ? "text-white/70" : "text-faint")}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className={cn("flex flex-1 items-center justify-center py-6", key === "screen" ? "min-h-[220px] lg:py-10" : "min-h-[128px]")}>
              {art}
            </div>
            <p className="text-[17px] font-semibold tracking-tight">{t(`items.${key}.title`)}</p>
            <p className={cn("mt-1.5 text-[15px] leading-relaxed", brand ? "text-white/85" : "text-muted-foreground")}>
              {t(`items.${key}.body`)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A dotted ground, the sheet's texture behind a drawing; fainter across a whole cell. */
const DOTS_FAINT = "bg-[radial-gradient(var(--ui-border)_1px,transparent_1.2px)] [background-size:16px_16px]";
const DOTS = "bg-[radial-gradient(var(--ui-border-strong)_1px,transparent_1.2px)] [background-size:12px_12px]";

/** A call with a shared screen, the way the app lays it out: the screen large, faces beside it. */
function ScreenArt() {
  return (
    <div className="home-app grid w-full max-w-[540px] grid-cols-[1fr_auto] gap-3 [--face-ring:var(--ui-card)]">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-card shadow-lg ring-2 ring-ok">
        <div className={cn("absolute inset-0 opacity-60", DOTS)} />
        <div className="absolute inset-x-[10%] bottom-[24%] top-[14%] flex flex-col gap-[6%]">
          <span className="h-2.5 w-2/5 shrink-0 rounded-full bg-foreground/80" />
          <span className="h-2 w-4/5 shrink-0 rounded-full bg-foreground/15" />
          <div className="flex min-h-0 flex-1 items-end gap-[4%]">
            {[40, 64, 52, 100, 86].map((height, index) => (
              <span
                key={index}
                className={cn("w-[12%] rounded-t-[4px]", index === 3 ? "bg-brand" : "bg-foreground/20")}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
        <span className="absolute bottom-2 start-2 flex items-center gap-1.5 rounded-full bg-ok px-2.5 py-1 text-[11.5px] font-semibold text-white">
          <MonitorUp className="size-3.5" />
          {maya.name}
        </span>
      </div>
      <div className="grid gap-2.5">
        {[leo, priya].map((person, index) => (
          <span
            key={person.id}
            className={cn(
              "relative flex aspect-video w-24 items-center justify-center rounded-xl bg-card shadow-md ring-2 sm:w-32",
              index === 0 ? "ring-brand" : "ring-card",
            )}
          >
            <Face seed={person.id} size={32} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Strokes on the office wall, and a teammate's pen. */
function BoardArt() {
  return (
    <div className={cn("relative h-28 w-full max-w-[220px] rounded-xl border border-border bg-card", DOTS)}>
      <svg viewBox="0 0 220 112" className="absolute inset-0 size-full" aria-hidden>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4">
          <path d="M26 70c10-26 30-40 52-34s22 30 44 28 26-30 48-26" stroke="currentColor" opacity="0.75" />
          <circle cx="170" cy="36" r="13" stroke="var(--ui-brand)" />
          <path d="M40 88h46" stroke="currentColor" opacity="0.35" />
        </g>
      </svg>
      <span className="home-app absolute bottom-3 end-5 flex items-center gap-1">
        <svg viewBox="0 0 12 12" className="size-3 text-brand" aria-hidden>
          <path d="M1 1l10 4-4 1.5L5.5 11z" fill="currentColor" />
        </svg>
        <span className="rounded-full bg-brand px-1.5 py-px text-[10px] font-semibold text-white">{leo.name}</span>
      </span>
    </div>
  );
}

/** The room's track, playing. */
function MusicArt() {
  return (
    <div className="home-app flex w-full max-w-[220px] items-center gap-3 rounded-2xl border border-border bg-card p-2.5 pe-4 shadow-sm">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
        <Music2 className="size-4" />
      </span>
      <span className="grid flex-1 gap-1.5">
        <span className="h-2 w-4/5 rounded-full bg-foreground/70" />
        <span className="h-1.5 w-1/2 rounded-full bg-foreground/20" />
      </span>
      <span className="flex h-6 items-end gap-[3px]" aria-hidden>
        {[0, 1, 2, 3].map((bar) => (
          <span key={bar} className="home-eq w-[3px] rounded-full bg-brand" style={{ animationDelay: `${bar * -180}ms` }} />
        ))}
      </span>
    </div>
  );
}

/** The three nameplate states. */
function StatusArt() {
  const t = useTranslations("home.preview");
  const rows = [
    { label: t("available"), dot: "bg-ok", tone: "bg-ok/12 text-ok" },
    { label: t("busy"), dot: "bg-destructive", tone: "bg-destructive/12 text-destructive" },
    { label: t("away"), dot: "bg-warn", tone: "bg-warn/15 text-warn" },
  ];
  return (
    <div className="home-app grid gap-1.5">
      {rows.map((row, index) => (
        <span
          key={row.label}
          className={cn("flex h-7 w-fit items-center gap-1.5 rounded-full px-3 text-[12px] font-medium", row.tone, index === 1 && "ms-5")}
        >
          <span className={cn("size-1.5 rounded-full", row.dot)} />
          {row.label}
        </span>
      ))}
    </div>
  );
}

/** A voice with the room's noise, then with it taken out. */
function NoiseArt() {
  const noisy = [10, 26, 14, 34, 8, 30, 18, 38, 12, 24];
  const clean = [6, 10, 22, 34, 40, 34, 22, 10, 6, 4];
  return (
    <div className="flex h-12 items-center gap-[3px]" aria-hidden>
      {noisy.map((height, index) => (
        <span key={`n${index}`} className="w-[3px] rounded-full bg-white/45" style={{ height }} />
      ))}
      <span className="mx-2 h-8 w-px bg-white/40" />
      {clean.map((height, index) => (
        <span key={`c${index}`} className="w-[3px] rounded-full bg-white" style={{ height }} />
      ))}
    </div>
  );
}

/** The phone's joystick, under a thumb. */
function JoystickArt() {
  return (
    <div className="relative flex h-28 w-16 items-end justify-center rounded-[18px] border-2 border-foreground/70 bg-card pb-4">
      <span className="absolute top-1.5 h-1 w-5 rounded-full bg-foreground/30" />
      <span className="relative flex size-11 items-center justify-center rounded-full border border-dashed border-border-strong bg-foreground/[0.04]">
        <span className="size-5 translate-x-1.5 -translate-y-1 rounded-full bg-foreground shadow-md" />
      </span>
    </div>
  );
}

/** The same card, in both themes. */
function ThemeArt() {
  const card = (dark: boolean) => (
    <span
      className={cn(
        "flex w-20 flex-col gap-1.5 rounded-xl border p-2.5",
        dark ? "border-white/10 bg-[#161617] text-white" : "border-black/10 bg-white text-[#161617]",
      )}
    >
      {dark ? <Moon className="size-3.5 opacity-80" /> : <Sun className="size-3.5 opacity-80" />}
      <span className={cn("h-1.5 w-4/5 rounded-full", dark ? "bg-white/70" : "bg-black/70")} />
      <span className={cn("h-1.5 w-1/2 rounded-full", dark ? "bg-white/25" : "bg-black/20")} />
    </span>
  );
  return (
    <div className="flex items-center" aria-hidden>
      {card(false)}
      <span className="-ms-4 mt-6">{card(true)}</span>
    </div>
  );
}

/** Every language the app speaks, each in its own words. */
function LanguageArt() {
  const current = useLocale();
  return (
    <ul className="flex max-w-[420px] flex-wrap justify-center gap-1.5">
      {locales.map((one) => (
        <li
          key={one.code}
          lang={one.code}
          dir={one.dir}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[12.5px]",
            one.code === current ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80",
          )}
        >
          {one.label}
        </li>
      ))}
    </ul>
  );
}
