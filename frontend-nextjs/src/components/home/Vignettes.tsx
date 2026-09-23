import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Eraser, Map as MapIcon, MessageSquare, Mic, Monitor, Moon, Search, SkipBack, SkipForward, Sun, Users, Volume2 } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { FloorScene } from "@/components/floor/FloorScene";
import { PEOPLE } from "@/components/floor/scenes";
import { locales } from "@/lib/i18n/routing";
import { cn } from "@/lib/utils";

/*
 * The smaller features, each shown as the piece of the app that does it,
 * drawn with the app's own tokens and words: the call with a screen in it,
 * the whiteboard, the room speaker, the status menu, the voice settings, the
 * floor on a phone, the theme picker and the language list. A keyframe or two
 * each, no scripts, and they hold still for anyone who asks for less motion.
 */

const KEYFRAMES = `
@keyframes v-rise{0%,8%{scale:1 .25}30%,80%{scale:1 1}100%{scale:1 .25}}
@keyframes v-point{0%,100%{translate:0 0}30%,45%{translate:44px -14px}70%,80%{translate:18px 6px}}
@keyframes v-draw{0%{stroke-dashoffset:1;opacity:1}14%,82%{stroke-dashoffset:0;opacity:1}90%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes v-eq{0%,100%{scale:1 .35}50%{scale:1 1}}
@keyframes v-pick{0%,28%{translate:0 0}33%,61%{translate:0 100%}66%,95%{translate:0 200%}100%{translate:0 0}}
@keyframes v-on{0%,30%{opacity:0}36%,94%{opacity:1}100%{opacity:0}}
@keyframes v-off{0%,30%{opacity:1}36%,94%{opacity:0}100%{opacity:1}}
@keyframes v-tick{0%,30%{opacity:1}33%,100%{opacity:0}}
@keyframes v-knob{0%,30%{translate:0 0}36%,94%{translate:14px 0}100%{translate:0 0}}
@keyframes v-stick{0%,100%{translate:0 0}20%,45%{translate:9px -4px}60%,80%{translate:-6px 8px}}
@keyframes v-slide{0%,28%{translate:0 0}33%,61%{translate:calc(100% + 0.25rem) 0}66%,95%{translate:calc(200% + 0.5rem) 0}100%{translate:0 0}}
@media (prefers-reduced-motion:reduce){.v-still,.v-still *{animation:none!important}.v-still path{stroke-dashoffset:0}}
`;

export function VignetteStyles() {
  return <style>{KEYFRAMES}</style>;
}

const APP = "font-(family-name:--font-app) [font-feature-settings:'cv11','ss01']";

/** The stage every picture stands on: the app's own face and colours, a panel resting in the middle. */
function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("v-still relative flex h-44 items-center justify-center overflow-hidden rounded-[18px] bg-rail text-foreground", APP, className)}
    >
      {children}
    </div>
  );
}

const PANEL =
  "rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.28)] [--face-ring:var(--ui-card)]";

/** One tick of three, shown for its third of a 7.5s loop: which row a menu has picked. */
function Tick({ index }: { index: number }) {
  return (
    <Check
      className="ms-auto size-3 opacity-0"
      style={{ animation: `v-tick 7.5s ${index * 2.5}s infinite` }}
    />
  );
}

/** A call with Olivia's screen in the spotlight, a pointer walking the chart, and the others beside it. */
export function ScreenVignette() {
  const t = useTranslations();
  return (
    <Stage>
      <div className="flex w-[15.5rem] gap-1.5 [--face-ring:var(--ui-card)]">
        {/* The shared window is Olivia's, so it keeps its own light look whatever the page's theme. */}
        <div className="relative aspect-[4/3] flex-1 overflow-hidden rounded-xl bg-[#fafaf8] ring-2 ring-brand">
          <div className="flex h-5 items-center gap-1 border-b border-black/10 bg-[#efefeb] px-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-black/20" />
            ))}
          </div>
          <div className="flex h-[calc(100%-1.25rem)] flex-col gap-1.5 p-2.5">
            <span className="h-1.5 w-12 rounded-full bg-black/70" />
            <span className="h-1 w-20 rounded-full bg-black/15" />
            <div className="mt-auto flex h-12 items-end gap-1.5">
              {[0.45, 0.7, 0.55, 0.95].map((h, i) => (
                <span
                  key={i}
                  className={cn("w-3.5 origin-bottom rounded-t-[3px]", i === 3 ? "bg-brand" : "bg-black/15")}
                  style={{ height: `${h * 100}%`, animation: `v-rise 5s ease-in-out ${i * 0.12}s infinite` }}
                />
              ))}
            </div>
          </div>
          <svg viewBox="0 0 12 14" className="absolute start-6 top-10 w-2.5 drop-shadow" style={{ animation: "v-point 5s ease-in-out infinite" }}>
            <path d="M1 1v11l3-3 2 4 2-1-2-4h4z" fill="white" stroke="black" strokeWidth="1" strokeLinejoin="round" />
          </svg>
          <span className="absolute bottom-1.5 start-1.5 rounded-full bg-card px-2 py-0.5 text-[9.5px] font-semibold text-foreground shadow-sm">
            {t("call.screenOf", { name: PEOPLE.olivia.name })}
          </span>
        </div>
        <div className="flex w-14 flex-col gap-1.5">
          {[PEOPLE.emma, PEOPLE.jack, PEOPLE.sam].map((one) => (
            <span key={one.id} className="flex flex-1 items-center justify-center rounded-lg bg-card ring-1 ring-border">
              <Face seed={one.id} size={18} />
            </span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/** The whiteboard, a plan being sketched on it stroke by stroke, and its pens. */
export function WhiteboardVignette() {
  const t = useTranslations("whiteboard");
  const strokes: Array<{ d: string; color: string; delay: number }> = [
    { d: "M18 22h44v24H18z", color: "#3a7bd5", delay: 0 },
    { d: "M96 22h44v24H96z", color: "#3a7bd5", delay: 0.9 },
    { d: "M64 34c10-4 20-4 30 0m-6-5 6 5-6 5", color: "var(--ui-brand)", delay: 1.8 },
    { d: "M24 30h30M24 37h20M102 30h30M102 37h24", color: "#1a1a18", delay: 2.5 },
    { d: "M40 50c2 14 30 20 58 12m-6-6 6 6-8 3", color: "var(--ui-brand)", delay: 3.3 },
  ];
  return (
    <Stage>
      <div className={cn(PANEL, "w-[15.5rem] overflow-hidden")}>
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="text-[10.5px] font-semibold">{t("title")}</span>
          <span className="flex items-center gap-1">
            {["#1a1a18", "var(--ui-brand)", "#3a7bd5", "#22a35a"].map((color, i) => (
              <span
                key={color}
                className={cn("size-2.5 rounded-full", i === 1 && "ring-2 ring-brand/30 ring-offset-1 ring-offset-card")}
                style={{ background: color }}
              />
            ))}
            <Eraser className="ms-1 size-3 text-muted-foreground" />
          </span>
        </div>
        <svg viewBox="0 0 158 76" className="block h-[5.5rem] w-full bg-white">
          {strokes.map((one) => (
            <path
              key={one.d}
              d={one.d}
              fill="none"
              stroke={one.color}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              style={{ animation: `v-draw 7s ease-in-out ${one.delay}s infinite` }}
            />
          ))}
        </svg>
      </div>
    </Stage>
  );
}

/** The room speaker's panel, as the app shows it: what's on, for everyone, and the controls. */
export function MusicVignette() {
  const t = useTranslations("jukebox");
  return (
    <Stage>
      <div className={cn(PANEL, "w-[15.5rem] p-3")}>
        <div className="flex items-center gap-1.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-foreground/5">
            <Volume2 className="size-3" />
          </span>
          <span className="text-[10.5px] font-semibold text-foreground/55">{t("title")}</span>
        </div>
        <p className="mt-2 text-[14px] font-medium leading-tight">Slow Stride</p>
        <p className="mt-0.5 truncate text-[10px] text-foreground/45">{t("playing")}</p>
        <div className="mt-2.5 flex items-center justify-center gap-3" dir="ltr">
          <SkipBack className="size-3.5 text-foreground/60" />
          <span className="flex size-9 items-end justify-center gap-[2.5px] rounded-full bg-brand pb-2.5 shadow-md">
            {[0.8, 0.55, 1, 0.65].map((d, i) => (
              <span
                key={i}
                className="h-3.5 w-[2.5px] origin-bottom rounded-full bg-white"
                style={{ animation: `v-eq ${d}s ease-in-out ${-i * 0.2}s infinite` }}
              />
            ))}
          </span>
          <SkipForward className="size-3.5 text-foreground/60" />
        </div>
      </div>
    </Stage>
  );
}

/** The status menu, the choice moving from available to busy to away. */
export function StatusVignette() {
  const t = useTranslations();
  const rows = [
    { key: "available", dot: "bg-ok" },
    { key: "busy", dot: "bg-destructive" },
    { key: "away", dot: "bg-warn" },
  ] as const;
  return (
    <Stage>
      <div className={cn(PANEL, "w-[12.5rem] p-1.5")}>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Face seed={PEOPLE.jack.id} size={22} />
          <span className="text-[11.5px] font-semibold">{PEOPLE.jack.name}</span>
        </div>
        <div className="my-1 h-px bg-border" />
        <p className="px-2 pb-1 pt-1 text-[9.5px] font-medium text-faint">{t("shell.status")}</p>
        <div className="relative">
          <span className="absolute inset-x-0 top-0 h-7 rounded-lg bg-muted" style={{ animation: "v-pick 7.5s ease-in-out infinite" }} />
          {rows.map((row, index) => (
            <div key={row.key} className="relative flex h-7 items-center gap-2 px-2 text-[11.5px]">
              <span className={cn("size-2 rounded-full", row.dot)} />
              {t(`status.${row.key}.label`)}
              <Tick index={index} />
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}

const MESSY = [5, 14, 7, 19, 9, 22, 6, 16, 11, 20, 8, 15, 6, 18, 10, 13];
const CLEAN = [3, 5, 9, 13, 16, 14, 10, 6, 4, 6, 9, 12, 10, 7, 4, 3];

/** The voice settings, noise suppression switching on and the waveform settling as it does. */
export function NoiseVignette() {
  const t = useTranslations("settings");
  const bars = (heights: number[], tone: string) => (
    <span className="flex h-6 items-center gap-[3px]">
      {heights.map((h, i) => (
        <span key={i} className={cn("w-[2.5px] shrink-0 rounded-full", tone)} style={{ height: h }} />
      ))}
    </span>
  );
  return (
    <Stage>
      <div className={cn(PANEL, "w-[15.5rem] p-3")}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-semibold">{t("noiseSuppression")}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t("noiseSuppressionNote")}</p>
          </div>
          {/* The switch, off and then on. */}
          <span className="relative mt-0.5 h-4 w-[30px] shrink-0 rounded-full bg-foreground/15" dir="ltr">
            <span className="absolute inset-0 rounded-full bg-ok opacity-0" style={{ animation: "v-on 6s infinite" }} />
            <span className="absolute start-0.5 top-0.5 size-3 rounded-full bg-white shadow" style={{ animation: "v-knob 6s ease-in-out infinite" }} />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <Mic className="size-3 shrink-0 text-muted-foreground" />
          <span className="relative">
            <span className="block" style={{ animation: "v-off 6s infinite" }}>
              {bars(MESSY, "bg-foreground/30")}
            </span>
            <span className="absolute inset-0 opacity-0" style={{ animation: "v-on 6s infinite" }}>
              {bars(CLEAN, "bg-ok")}
            </span>
          </span>
        </div>
      </div>
    </Stage>
  );
}

/** The floor on a phone: someone walking, the joystick under a thumb, the app's tabs along the bottom. */
export function PhoneVignette() {
  return (
    <Stage className="items-end">
      <div className="relative -mb-6 h-[12.5rem] w-[7.25rem] overflow-hidden rounded-[22px] border-[5px] border-foreground/85 bg-rail shadow-[0_18px_40px_-18px_rgb(0_0_0/0.5)]">
        <FloorScene
          view={[20, 10, 6, 9]}
          walking={[{ character: "Molly", name: PEOPLE.lily.name, status: "available", path: [[21, 12, 0.8], [24, 12], [24, 15, 0.8], [21, 15]], speed: 1.6 }]}
          standing={[{ ...PEOPLE.sam, at: [23, 17], face: "up", status: "available" }]}
          className="absolute inset-x-0 bottom-9 top-0"
        />
        {/* The joystick, as the app draws it. */}
        <span className="absolute bottom-11 start-2 flex size-10 items-center justify-center rounded-full border border-white/35 bg-black/25">
          <span className="size-5 rounded-full bg-white/95 shadow ring-1 ring-black/10" style={{ animation: "v-stick 5s ease-in-out infinite" }} />
        </span>
        <span className="absolute inset-x-0 bottom-0 flex h-9 items-center justify-around border-t border-border bg-rail text-muted-foreground">
          <MapIcon className="size-3.5 text-foreground" />
          <MessageSquare className="size-3.5" />
          <Users className="size-3.5" />
        </span>
      </div>
    </Stage>
  );
}

/** The theme picker from the menu, the choice moving between system, light and dark. */
export function ThemeVignette() {
  const t = useTranslations("shell");
  const themes = [
    { key: "system", icon: <Monitor className="size-4" /> },
    { key: "light", icon: <Sun className="size-4" /> },
    { key: "dark", icon: <Moon className="size-4" /> },
  ] as const;
  return (
    <Stage>
      <div className={cn(PANEL, "w-[14rem] p-2")}>
        <p className="px-1 pb-1.5 text-[9.5px] font-medium text-faint">{t("theme")}</p>
        <div className="relative grid grid-cols-3 gap-1" dir="ltr">
          <span
            className="absolute inset-y-0 start-0 w-[calc((100%-0.5rem)/3)] rounded-[10px] border border-foreground/20 bg-muted"
            style={{ animation: "v-slide 7.5s ease-in-out infinite" }}
          />
          {themes.map((one) => (
            <span key={one.key} className="relative flex h-14 flex-col items-center justify-center gap-1 text-[10.5px] text-foreground/80">
              {one.icon}
              {t(`themes.${one.key}`)}
            </span>
          ))}
        </div>
      </div>
    </Stage>
  );
}

/** The language list, the choice moving between a few of the eighteen. */
export function LanguagesVignette() {
  const t = useTranslations("languageSwitcher");
  const shown = ["en", "ja", "ar"].map((code) => locales.find((one) => one.code === code)!);
  return (
    <Stage>
      <div className={cn(PANEL, "w-[13.5rem] p-1.5")}>
        <span className="mb-1 flex h-7 items-center gap-1.5 rounded-lg bg-muted px-2 text-[10.5px] text-muted-foreground">
          <Search className="size-3" />
          {t("searchPlaceholder")}
        </span>
        <div className="relative">
          <span className="absolute inset-x-0 top-0 h-7 rounded-lg bg-foreground/[0.06]" style={{ animation: "v-pick 7.5s ease-in-out infinite" }} />
          {shown.map((one, index) => (
            <div key={one.code} className="relative flex h-7 items-center gap-2 px-2 text-[11.5px]">
              <span className="w-5 text-[9.5px] font-medium uppercase text-faint">{one.code}</span>
              <span dir={one.dir}>{one.label}</span>
              <Tick index={index} />
            </div>
          ))}
        </div>
      </div>
    </Stage>
  );
}
