import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { PixelAvatar } from "@/components/PixelAvatar";
import { FloorScene } from "@/components/floor/FloorScene";
import { cn } from "@/lib/utils";

/*
 * A small moving picture for each of the smaller features: a few elements
 * and a keyframe or two each, no scripts. They hold still for anyone who
 * asks for less motion.
 */

const KEYFRAMES = `
@keyframes v-draw{0%{stroke-dashoffset:1;opacity:1}45%,80%{stroke-dashoffset:0;opacity:1}95%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes v-eq{0%,100%{scale:1 .3}50%{scale:1 1}}
@keyframes v-cycle3{0%,30%{opacity:1;translate:0 0}33.3%,97%{opacity:0;translate:0 -6px}100%{opacity:1;translate:0 0}}
@keyframes v-orbit{0%,100%{translate:0 -7px}25%{translate:7px 0}50%{translate:0 7px}75%{translate:-7px 0}}
@keyframes v-split{0%,100%{clip-path:inset(0 70% 0 0)}50%{clip-path:inset(0 30% 0 0)}}
@keyframes v-ticker{0%,10%{translate:0 0}12.5%,22.5%{translate:0 -1.75rem}25%,35%{translate:0 -3.5rem}37.5%,47.5%{translate:0 -5.25rem}50%,60%{translate:0 -7rem}62.5%,72.5%{translate:0 -8.75rem}75%,85%{translate:0 -10.5rem}87.5%,97.5%{translate:0 -12.25rem}100%{translate:0 -14rem}}
@keyframes v-cursor{0%,100%{translate:0 0}40%,60%{translate:46px 14px}80%{translate:12px 22px}}
@keyframes v-clean{0%,15%{clip-path:inset(0 100% 0 0)}55%,85%{clip-path:inset(0 0 0 0)}100%{clip-path:inset(0 0 0 100%)}}
@media (prefers-reduced-motion:reduce){.v-still,.v-still *{animation:none!important}}
`;

export function VignetteStyles() {
  return <style>{KEYFRAMES}</style>;
}

function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "v-still relative flex h-32 items-center justify-center overflow-hidden rounded-[18px] bg-foreground/[0.045] font-(family-name:--font-app) [font-feature-settings:'cv11','ss01']",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScreenVignette() {
  const t = useTranslations("home.vignettes");
  return (
    <Stage>
      <div className="relative w-36 rounded-lg border border-border bg-card p-2 shadow-float">
        <div className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-destructive" />
          <span className="text-[9px] font-medium text-muted-foreground">{t("sharing")}</span>
        </div>
        <div className="mt-2 grid gap-1">
          <span className="h-1.5 w-3/4 rounded-full bg-foreground/15" />
          <span className="h-1.5 w-1/2 rounded-full bg-foreground/10" />
          <span className="mt-1 h-7 rounded-md bg-brand/15" />
        </div>
        <svg viewBox="0 0 12 14" className="absolute start-8 top-7 w-3 drop-shadow" style={{ animation: "v-cursor 4.5s ease-in-out infinite" }}>
          <path d="M1 1v11l3-3 2 4 2-1-2-4h4z" fill="white" stroke="black" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      </div>
    </Stage>
  );
}

export function WhiteboardVignette() {
  return (
    <Stage>
      <div className="relative h-20 w-40 rounded-md border-[3px] border-[#6f7076] bg-white">
        <svg viewBox="0 0 150 70" className="size-full">
          <path
            d="M14 48c10-24 22-30 30-12s14 16 22-6 20-18 26 2 10 18 20 4 14-18 22-10"
            fill="none"
            stroke="var(--ui-brand)"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1"
            style={{ animation: "v-draw 4s ease-in-out infinite" }}
          />
          <circle cx="30" cy="20" r="6" fill="none" stroke="#3a7bd5" strokeWidth="3" />
        </svg>
        <span className="absolute -bottom-2 start-3 h-1 w-10 rounded-full bg-[#4a4b50]" />
      </div>
    </Stage>
  );
}

export function MusicVignette() {
  const t = useTranslations("home.vignettes");
  return (
    <Stage>
      <div className="flex items-center gap-3 rounded-full border border-border bg-card py-2 pe-4 ps-2 shadow-float">
        <span className="flex h-8 items-end gap-[3px] rounded-full bg-brand/12 px-2.5 py-2">
          {[0.9, 0.5, 1.1, 0.7, 1.3].map((d, i) => (
            <span key={i} className="h-full w-[3px] origin-bottom rounded-full bg-brand" style={{ animation: `v-eq ${d}s ease-in-out ${-i * 0.2}s infinite` }} />
          ))}
        </span>
        <span>
          <span className="block text-[11px] font-semibold text-foreground">Slow Stride</span>
          <span className="block text-[10px] text-muted-foreground">{t("playing")}</span>
        </span>
      </div>
    </Stage>
  );
}

export function StatusVignette() {
  const t = useTranslations("home.preview");
  const states = [
    { dot: "bg-ok", label: t("available") },
    { dot: "bg-destructive", label: t("busy") },
    { dot: "bg-warn", label: t("away") },
  ];
  return (
    <Stage>
      <div className="flex flex-col items-center gap-1">
        <span className="relative flex h-6 w-40 justify-center">
          {states.map((state, i) => (
            <span
              key={state.label}
              className="absolute flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1f2937]/90 px-2.5 py-1 font-pixel text-[10px] leading-none text-white opacity-0"
              style={{ animation: `v-cycle3 6s ease-in-out ${-6 + i * 2}s infinite` }}
            >
              <span className={cn("size-1.5 rounded-full", state.dot)} />
              Jack · {state.label}
            </span>
          ))}
        </span>
        <span className="relative h-12 w-6">
          <PixelAvatar character="Adam" width={24} style={{ left: "50%", top: "100%" }} />
        </span>
      </div>
    </Stage>
  );
}

const MESSY = [6, 18, 9, 26, 12, 30, 8, 22, 14, 28, 10, 20, 7, 24, 12, 16, 9];
const CLEAN = [4, 7, 12, 18, 22, 24, 22, 18, 12, 7, 10, 14, 16, 14, 10, 6, 4];

export function NoiseVignette() {
  const bars = (heights: number[], tone: string) => (
    <span className="flex h-10 items-center gap-[3px]">
      {heights.map((h, i) => (
        <span key={i} className={cn("w-[3px] shrink-0 rounded-full", tone)} style={{ height: h }} />
      ))}
    </span>
  );
  return (
    <Stage>
      <div className="relative rounded-full border border-border bg-card px-4 py-1.5 shadow-float">
        {bars(MESSY, "bg-foreground/25")}
        {/* The same voice with the noise taken out, wiping in over it. */}
        <div className="absolute inset-0 flex items-center rounded-full bg-card px-4" style={{ animation: "v-clean 5s ease-in-out infinite" }}>
          {bars(CLEAN, "bg-brand")}
        </div>
      </div>
    </Stage>
  );
}

export function PhoneVignette() {
  return (
    <Stage>
      <div className="relative h-[104px] w-[58px] overflow-hidden rounded-[14px] border-[3px] border-foreground/80">
        {/* The real floor in a phone, someone walking a loop on it. */}
        <FloorScene
          view={[20, 11, 5, 9]}
          walking={[{ character: "Molly", path: [[20, 12, 0.6], [23, 12], [23, 15, 0.6], [20, 15]], speed: 1.6 }]}
          className="absolute inset-0"
        />
        <span className="absolute bottom-2.5 start-1.5 flex size-8 items-center justify-center rounded-full bg-white/35">
          <span className="size-4 rounded-full bg-white shadow" style={{ animation: "v-orbit 3s linear infinite" }} />
        </span>
      </div>
    </Stage>
  );
}

export function ThemeVignette() {
  const half = (dark: boolean) => (
    <div className={cn("absolute inset-0 flex items-center justify-center gap-3", dark ? "bg-[#1b1b1d] text-[#ededeb]" : "bg-[#f4f4f1] text-[#1a1a18]")}>
      <span className="flex w-40 items-center gap-2 rounded-full border border-current/10 px-2 py-1.5">
        <Face seed="maya-12" size={20} />
        <span className="h-1.5 flex-1 rounded-full bg-current opacity-20" />
        {dark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      </span>
    </div>
  );
  return (
    <Stage className="bg-transparent">
      <div className="relative size-full overflow-hidden rounded-[18px] border border-border">
        {half(true)}
        <div className="absolute inset-0" style={{ animation: "v-split 6s ease-in-out infinite" }}>
          {half(false)}
        </div>
      </div>
    </Stage>
  );
}

const HELLOS = ["Hello", "Hola", "Bonjour", "こんにちは", "Hallo", "Ciao", "مرحبا", "안녕하세요", "Hello"];

export function LanguagesVignette() {
  return (
    <Stage>
      <div className="h-7 overflow-hidden text-[20px] font-semibold leading-7 tracking-tight text-foreground">
        <div style={{ animation: "v-ticker 14s cubic-bezier(.7,0,.3,1) infinite" }}>
          {HELLOS.map((word, i) => (
            <p key={i} className="text-center">
              {word}
            </p>
          ))}
        </div>
      </div>
    </Stage>
  );
}
