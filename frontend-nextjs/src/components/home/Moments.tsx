import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Coffee, Copy, DoorClosed, Footprints, Headphones, Link2, Music2, Presentation } from "lucide-react";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { FloorScene } from "@/components/floor/FloorScene";
import { PEOPLE } from "@/components/floor/scenes";
import { NearbyBar } from "@/components/floor/PlayableYou";
import { COLUMN, Heading } from "./Blocks";

/*
 * The floor's everyday moments, and how a team gets there: cards that hold
 * still on the page, each with a small piece of the real floor living in it.
 * CSS only; nothing here runs in the browser.
 */

const APP = "font-(family-name:--font-app) [font-feature-settings:'cv11','ss01']";
const CHIP = cn(
  APP,
  "flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-float [--face-ring:var(--ui-card)]",
);

/*
 * You walk four tiles over to Jack and Olivia at 2.2 a second, stop, and walk
 * back. The app's bar for the person you're next to shows only while you're
 * stopped beside them.
 */
const WALK = 4 / 2.2;
const STOP = 3.6;
const LOOP = WALK * 2 + STOP;
const at = (seconds: number) => ((seconds / LOOP) * 100).toFixed(1);
const KEYFRAMES =
  `@keyframes m-bar{0%,${at(WALK)}%{opacity:0;translate:0 6px}${at(WALK + 0.25)}%,${at(WALK + STOP - 0.2)}%{opacity:1;translate:0 0}${at(WALK + STOP)}%,100%{opacity:0;translate:0 6px}}` +
  "@keyframes m-type{0%{width:0}45%,100%{width:var(--chars)}}" +
  "@keyframes m-swap{0%,55%{opacity:1}60%,92%{opacity:0}100%{opacity:1}}" +
  "@keyframes m-toast{0%,30%{opacity:0;translate:0 -6px}38%,85%{opacity:1;translate:0 0}93%,100%{opacity:0;translate:0 -6px}}" +
  "@media (prefers-reduced-motion:reduce){.m-still,.m-still *{animation:none!important}}";

function WalkOver({ you, labels, className }: { you: string; labels: { video: string; audio: string; message: string }; className?: string }) {
  const { jack, olivia } = PEOPLE;
  return (
    <FloorScene
      view={[29, 5, 14, 10]}
      standing={[
        { ...jack, at: [35, 10], face: "right", status: "available" },
        { ...olivia, at: [38, 10], face: "left", status: "available" },
      ]}
      walking={[{ character: "Ash", name: you, status: "available", path: [[33, 11], [37, 11, STOP]], faces: { 1: "up" } }]}
      className={className}
      over={
        <div className="m-still absolute inset-x-0 bottom-4 flex justify-center" style={{ animation: `m-bar ${LOOP.toFixed(2)}s linear infinite` }}>
          <NearbyBar name={olivia.name} seed={olivia.id} labels={labels} />
        </div>
      }
    />
  );
}

type Kind = "walk" | "meet" | "door" | "lounge";

/** Each moment's piece of the real floor, with the app's own chip or bar over it. */
export function MomentScene({ kind, className }: { kind: Kind; className?: string }) {
  const t = useTranslations("home");
  if (kind === "walk") {
    return (
      <WalkOver
        you={t("preview.you")}
        labels={{ video: t("preview.video"), audio: t("preview.audio"), message: t("preview.message") }}
        className={className}
      />
    );
  }
  if (kind === "meet") {
    return (
      <FloorScene
        view={[1, 3, 13, 10]}
        sitting={[
          { name: "Ava", character: "Amelia", chair: [4, 11], status: "in_call" },
          { name: "Leo", character: "Adam", chair: [6, 8], status: "in_call" },
          { name: "Zoe", character: "Lucy", chair: [8, 11], status: "in_call" },
          { name: "Ben", character: "Bob", chair: [4, 8], status: "in_call" },
        ]}
        className={className}
        over={
          <div className="absolute inset-x-0 top-3 flex justify-center gap-1.5 [--face-ring:var(--ui-card)]">
            {["Ava", "Leo", "Zoe", "Ben"].map((name, index) => (
              <span
                key={name}
                className={cn("flex aspect-video w-11 items-center justify-center rounded-[9px] sm:w-14 bg-card shadow-lg ring-2", index === 1 ? "ring-brand" : "ring-card/80")}
              >
                <Face seed={`${name.toLowerCase()}-desk`} size={18} />
              </span>
            ))}
          </div>
        }
      />
    );
  }
  if (kind === "door") {
    return (
      <FloorScene
        view={[1, 19, 13, 9]}
        sitting={[{ ...PEOPLE.noah, chair: [7, 24], status: "busy" }]}
        className={className}
        over={
          <span className={cn(CHIP, "absolute start-3 top-3")}>
            <Headphones className="size-3.5 text-destructive" />
            {t("moments.door.chip", { name: PEOPLE.noah.name })}
          </span>
        }
      />
    );
  }
  return (
    <FloorScene
      view={[33, 1, 14, 9]}
      standing={[
        { ...PEOPLE.lily, at: [38, 4], face: "right", status: "away" },
        { ...PEOPLE.ryan, at: [40, 4], face: "left", status: "away" },
      ]}
      walking={[{ ...PEOPLE.grace, status: "available", path: [[45, 6, 1.5], [42, 6], [42, 5, 2.5]], faces: { 2: "up" }, speed: 1.8 }]}
      className={className}
      over={
        <span className={cn(CHIP, "absolute start-3 top-3")}>
          <Music2 className="size-3.5 text-brand" />
          {t("moments.lounge.chip")} · Slow Stride
        </span>
      }
    />
  );
}

const ICONS: Record<Kind, ReactNode> = {
  walk: <Footprints />,
  meet: <Presentation />,
  door: <DoorClosed />,
  lounge: <Coffee />,
};

function useMoments() {
  const t = useTranslations("home");
  return [
    { kind: "walk", id: undefined, label: t("moments.labels.walk"), title: t("features.proximity.title"), body: t("features.proximity.body") },
    { kind: "meet", id: "meetings", label: t("moments.labels.meet"), title: t("features.meetings.title"), body: t("features.meetings.body") },
    { kind: "door", id: undefined, label: t("moments.labels.door"), title: t("moments.door.title"), body: t("moments.door.body") },
    { kind: "lounge", id: undefined, label: t("moments.labels.lounge"), title: t("moments.lounge.title"), body: t("moments.lounge.body") },
  ] as const;
}

function Label({ kind, children }: { kind: Kind; children: ReactNode }) {
  return (
    <span className={cn(APP, "flex items-center gap-1.5 text-[12.5px] font-medium text-brand [&_svg]:size-3.5")}>
      {ICONS[kind]}
      {children}
    </span>
  );
}

/** The section's head: the claim on one side, the plain answer on the other. */
function Head() {
  const t = useTranslations("home");
  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
      <Heading title={t("moments.title")} muted={t("moments.muted")} block />
      <p className="max-w-[34rem] text-pretty text-[16.5px] leading-relaxed text-muted-foreground lg:pb-1.5">{t("moments.lead")}</p>
    </div>
  );
}

/**
 * What happens on the floor, as four moments of an ordinary day: two by two,
 * each a piece of the real floor with the app's own chip or bar over it, then
 * what it's called, what it is and how it works.
 */
export function Moments() {
  const moments = useMoments();
  return (
    <section id="floor" className={cn(COLUMN, "m-still scroll-mt-20 pt-24 sm:pt-36")}>
      <style>{KEYFRAMES}</style>
      <Head />
      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:mt-14">
        {moments.map((one) => (
          <article
            key={one.kind}
            id={one.id}
            className="grid min-w-0 scroll-mt-24 grid-rows-[auto_1fr] overflow-hidden rounded-[28px] border border-border bg-card p-2 transition-[border-color,box-shadow] duration-300 hover:border-border-strong hover:shadow-[0_24px_60px_-36px_rgb(0_0_0/0.35)]"
          >
            <MomentScene kind={one.kind} className="aspect-[16/9] w-full rounded-[22px]" />
            <div className="px-5 pb-5 pt-6 sm:px-6 sm:pb-6">
              <Label kind={one.kind}>{one.label}</Label>
              <h3 className="mt-2.5 text-balance text-[21px] font-semibold leading-[1.2] tracking-[-0.02em]">{one.title}</h3>
              <p className="mt-2 max-w-[32rem] text-pretty text-[15px] leading-relaxed text-muted-foreground">{one.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** How a team gets onto the floor, in three steps, each with the app doing it. */
export function Steps() {
  const t = useTranslations();
  const office = t("home.preview.office");
  const steps: Array<{ key: "make" | "invite" | "walk"; art: ReactNode }> = [
    {
      key: "make",
      art: (
        <div className={cn(APP, "flex h-full flex-col justify-center gap-3 p-6")}>
          <span className="text-[11.5px] font-medium text-muted-foreground">{t("create.nameLabel")}</span>
          <span className="flex h-10 items-center rounded-xl border border-border bg-card px-3 text-[14px] text-foreground">
            {/* The name typing itself in, the caret riding its end. */}
            <span
              dir="ltr"
              className="overflow-hidden whitespace-nowrap border-e-2 border-brand pe-0.5"
              style={{ ["--chars" as string]: `${office.length}ch`, animation: `m-type 4.5s steps(${office.length}) infinite` }}
            >
              {office}
            </span>
          </span>
          <span className="flex h-10 items-center justify-center rounded-full bg-foreground text-[13px] font-medium text-background">{t("create.continue")}</span>
        </div>
      ),
    },
    {
      key: "invite",
      art: (
        <div className={cn(APP, "flex h-full flex-col justify-center gap-3 p-6 [--face-ring:var(--ui-background)]")}>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <Link2 className="size-3.5 text-muted-foreground" />
            {t("home.preview.guestLink")}
          </span>
          <span className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pe-1 ps-3.5">
            <span dir="ltr" className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
              tinyfloor.com/join/x7k2q
            </span>
            <span className="flex h-8 items-center gap-1 rounded-full bg-foreground px-3 text-[11.5px] font-medium text-background">
              <span className="relative size-3">
                <Copy className="absolute inset-0 size-3" style={{ animation: "m-swap 4s infinite" }} />
                <Check className="absolute inset-0 size-3 opacity-0" style={{ animation: "m-swap 4s infinite reverse" }} />
              </span>
              {t("home.preview.copy")}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <FaceStack seeds={Object.values(PEOPLE).map((one) => one.id)} size={22} max={4} />
            {t("home.steps.joined", { count: 4 })}
          </span>
        </div>
      ),
    },
    {
      key: "walk",
      art: (
        <FloorScene
          view={[15, 8, 17, 10]}
          standing={[
            { ...PEOPLE.sam, at: [24, 14], face: "left", status: "available" },
            { ...PEOPLE.olivia, at: [25, 13], face: "down", status: "busy" },
          ]}
          walking={[{ ...PEOPLE.emma, status: "available", path: [[17, 14, 2.4], [22, 14, 3], [22, 12, 1.5], [17, 12]], faces: { 1: "right" } }]}
          className="h-full w-full"
          over={
            <span className={cn(CHIP, "absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2")} style={{ animation: "m-toast 8s infinite" }}>
              <Face seed={PEOPLE.emma.id} size={18} />
              {t("home.steps.walkedIn", { name: PEOPLE.emma.name })}
            </span>
          }
        />
      ),
    },
  ];
  return (
    <section className={cn(COLUMN, "m-still pb-24 sm:pb-32")}>
      <Heading title={t("home.steps.title")} muted={t("home.steps.muted")} className="max-w-[24ch]" />
      <ol className="mt-12 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.key} className="flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-foreground/[0.035]">
            <div className="m-2 h-[220px] overflow-hidden rounded-[22px] border border-border bg-background">{step.art}</div>
            <div className="px-6 pb-7 pt-4 sm:px-7">
              <span className={cn(APP, "text-[12.5px] font-semibold tabular-nums text-brand")}>{String(index + 1).padStart(2, "0")}</span>
              <h3 className="mt-1.5 text-balance text-[20px] font-semibold tracking-[-0.02em]">{t(`home.steps.${step.key}.title`)}</h3>
              <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-muted-foreground">{t(`home.steps.${step.key}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
