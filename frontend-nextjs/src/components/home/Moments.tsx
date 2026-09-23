import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Bell, BookOpen, Building2, CalendarDays, Check, Clock3, Coffee, Copy, Footprints, GraduationCap, Link2, MessageSquare, Radio, Video } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { PEOPLE } from "@/components/floor/scenes";
import { FloorScene, OnFloor } from "@/components/floor/FloorScene";
import { NearbyBar } from "@/components/floor/NearbyBar";
import { LANDINGS, type LandingKey } from "@/lib/landings";
import { COLUMN, Heading, SWIPE, SWIPE_ITEM } from "./Blocks";

/*
 * The sections that say why a floor, how a team gets onto it, and who it's
 * for: the same question asked the usual way and by walking over, three steps
 * with the app doing each, and a directory of the pages for each use. CSS
 * only; nothing here runs in the browser.
 */

const APP =
  "font-(family-name:--font-app) [font-feature-settings:'cv11','ss01']";
const CHIP = cn(
  APP,
  "flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-float [--face-ring:var(--ui-card)]",
);

const KEYFRAMES =
  // The other way: the messages piling up one after another.
  "@keyframes m-pile{0%,4%{opacity:0;translate:0 10px}10%,92%{opacity:1;translate:0 0}98%,100%{opacity:0}}" +
  "@keyframes m-type{0%{width:0}45%,100%{width:var(--chars)}}" +
  "@keyframes m-swap{0%,55%{opacity:1}60%,92%{opacity:0}100%{opacity:1}}" +
  "@keyframes m-toast{0%,30%{opacity:0;translate:0 -6px}38%,85%{opacity:1;translate:0 0}93%,100%{opacity:0;translate:0 -6px}}" +
  "@media (prefers-reduced-motion:reduce){.m-still,.m-still *{animation:none!important}}";

/*
 * The walk over to Jack, in seconds: a while beside him, the walk back along
 * the desks, a moment there, and the walk over again. The loop starts beside
 * him, so that's where you are without motion, and everything that happens
 * there is timed on the same loop.
 */
const WAIT = 1;
const STAY = 7.5;
const SPEED = 3;
const FROM: [number, number] = [28, 15];
const TO: [number, number] = [32, 15];
const GO = (TO[0] - FROM[0]) / SPEED;
const LOOP = WAIT + GO * 2 + STAY;
/** A moment this many seconds after you arrive, as a point in the loop. */
const beat = (seconds: number) => `${((seconds / LOOP) * 100).toFixed(2)}%`;

const CALL_KEYFRAMES =
  // The bar beside Jack, under your feet, until the call replaces it.
  `@keyframes mc-bar{0%,${beat(0.3)}{opacity:0;translate:0 6px}${beat(0.6)},${beat(1.95)}{opacity:1;translate:0 0}${beat(2.2)},100%{opacity:0;translate:0 0}}` +
  // The pointer coming in from the corner to the video button, and pressing it.
  `@keyframes mc-hand{0%,${beat(0.7)}{opacity:0;translate:72px 48px}${beat(0.9)}{opacity:1}${beat(1.55)}{translate:0 0}${beat(2.3)}{opacity:1}${beat(2.6)},100%{opacity:0;translate:0 0}}` +
  `@keyframes mc-press{0%,${beat(1.62)}{scale:1}${beat(1.72)}{scale:.82}${beat(1.86)},100%{scale:1}}` +
  `@keyframes mc-ring{0%,${beat(1.71)}{opacity:0;scale:.3}${beat(1.73)}{opacity:1;scale:.35}${beat(2.2)},100%{opacity:0;scale:1.3}}` +
  // The call's cards dropping in along the top, and going as you leave.
  `@keyframes mc-card{0%,${beat(2.05)}{opacity:0;translate:0 -12px;scale:.96}${beat(2.4)},${beat(STAY - 0.5)}{opacity:1;translate:0 0;scale:1}${beat(STAY - 0.1)},100%{opacity:0;translate:0 -6px;scale:1}}` +
  // Who's talking: Jack, then you.
  `@keyframes mc-them{0%,${beat(2.6)}{opacity:0}${beat(2.75)},${beat(4.3)}{opacity:1}${beat(4.45)},100%{opacity:0}}` +
  `@keyframes mc-you{0%,${beat(4.55)}{opacity:0}${beat(4.7)},${beat(6.3)}{opacity:1}${beat(6.45)},100%{opacity:0}}`;

const loop = (name: string, timing = "ease-in-out", delay = 0) => `${name} ${LOOP.toFixed(3)}s ${timing} ${delay}s infinite both`;

const NOTICE_ICONS: ReactNode[] = [<MessageSquare key="m" />, <CalendarDays key="c" />, <Video key="v" />, <Bell key="b" />];

/**
 * Why a floor, as the same small question asked two ways: on the left the
 * messages, the invite and the link it takes in most remote teams, piling
 * up; on the right you walking over to Jack, and the call that's one tap
 * away once you're there. Each side ends on how long it took.
 */
export function Moments() {
  const t = useTranslations("home.versus");
  const tp = useTranslations("home.preview");
  const { emma, jack } = PEOPLE;
  const notices = t.raw("before.items") as Array<{ title: string; body: string }>;
  return (
    <section id="floor" className={cn(COLUMN, "m-still scroll-mt-20 pt-24 sm:pt-36")}>
      <style>{KEYFRAMES + CALL_KEYFRAMES}</style>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
        <Heading title={t("title")} muted={t("muted")} />
        <p className="max-w-[30rem] text-pretty text-[16.5px] leading-relaxed text-muted-foreground lg:pb-1.5">{t("body")}</p>
      </div>
      <div className="mt-12 grid gap-3 lg:mt-14 lg:grid-cols-2">
        {/* The way it usually goes. */}
        <div className="flex flex-col rounded-[28px] bg-muted/60 p-6 sm:p-8">
          <p className={cn(APP, "text-[12px] font-medium uppercase tracking-[0.08em] text-muted-foreground")}>{t("before.label")}</p>
          <ol className="mt-6 grid gap-2">
            {notices.map((one, index) => (
              <li
                key={one.title}
                className={cn(APP, "flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(0_0_0/0.04)]")}
                style={{ animation: `m-pile 10s ease-out ${index * 0.9}s infinite both` }}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{NOTICE_ICONS[index]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-foreground">{one.title}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{one.body}</span>
                </span>
                <span className="size-2 shrink-0 rounded-full bg-brand" />
              </li>
            ))}
          </ol>
          <p className="mt-auto flex items-center gap-2 text-pretty pt-8 text-[15px] text-muted-foreground">
            <Clock3 className="size-4 shrink-0" />
            {t("before.result")}
          </p>
        </div>

        {/* The way it goes on a floor. */}
        <div className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <p className={cn(APP, "text-[12px] font-medium uppercase tracking-[0.08em] text-brand")}>{t("after.label")}</p>
          {/* The real floor, zoomed out: you walk along the desks to Jack's, and a click on the bar beside him starts the call. */}
          <FloorScene
            view={[25, 8.5, 19, 11]}
            className="mt-6 h-[260px] rounded-[20px] sm:h-[288px]"
            sitting={[
              { ...PEOPLE.jack, chair: [34, 16], status: "available" },
              { ...PEOPLE.noah, chair: [34, 13], status: "busy" },
              { ...PEOPLE.sam, chair: [40, 13], status: "busy" },
              { ...PEOPLE.grace, chair: [40, 16], status: "away" },
            ]}
            walking={[
              {
                ...emma,
                name: t("after.you"),
                status: "available",
                speed: SPEED,
                path: [
                  [TO[0], TO[1], STAY],
                  [FROM[0], FROM[1], WAIT],
                ],
                faces: { 0: "right", 1: "right" },
              },
              { ...PEOPLE.olivia, status: "available", path: [[31, 9, 2], [44, 9, 3]], speed: 1.6, offset: 4 },
            ]}
            over={
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center gap-2 px-3 [--face-ring:var(--ui-card)]">
                {[
                  { seed: emma.id, name: t("after.you"), talks: "mc-you" },
                  { seed: jack.id, name: jack.name, talks: "mc-them" },
                ].map((card, index) => (
                  <div
                    key={card.seed}
                    className={cn(APP, "relative aspect-video w-[min(40%,10.5rem)] overflow-hidden rounded-xl bg-card shadow-lg ring-2 ring-card/80")}
                    style={{ animation: loop("mc-card", "ease-out", index * 0.08) }}
                  >
                    <span className={cn("absolute inset-0 rounded-[inherit] border-2 border-brand", index === 0 && "motion-reduce:hidden")} style={{ animation: loop(card.talks, "linear") }} />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Face seed={card.seed} size={34} />
                    </span>
                    <span className="absolute bottom-1.5 start-1.5 rounded-full bg-card/90 px-2 py-0.5 text-[10.5px] font-semibold text-foreground shadow-sm">{card.name}</span>
                  </div>
                ))}
              </div>
            }
          >
            <OnFloor at={[TO[0] + 0.5, TO[1] + 0.85]}>
              <div className="mt-[calc(var(--tile)*0.95)] motion-reduce:hidden" style={{ animation: loop("mc-bar", "ease-out") }}>
                <NearbyBar
                  name={jack.name}
                  seed={jack.id}
                  labels={{ video: tp("video"), audio: tp("audio"), message: tp("message") }}
                  call={
                    <span className="absolute left-1/2 top-1/2 motion-reduce:hidden" style={{ animation: loop("mc-hand") }}>
                      <span className="absolute -left-4 -top-4 size-8 rounded-full border-2 border-brand" style={{ animation: loop("mc-ring", "ease-out") }} />
                      <svg width="18" height="22" viewBox="0 0 22 26" className="absolute -left-[2px] -top-[2px] origin-[2px_2px] drop-shadow-[0_2px_2px_rgb(0_0_0/0.4)]" style={{ animation: loop("mc-press", "linear") }}>
                        <path d="M2 2 L2 21 L7 16.5 L10.5 24 L13.8 22.6 L10.4 15.2 L17 15.2 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    </span>
                  }
                />
              </div>
            </OnFloor>
          </FloorScene>
          <p className="mt-auto flex items-center gap-2 text-pretty pt-8 text-[15px] text-foreground">
            <Footprints className="size-4 shrink-0 text-brand" />
            {t("after.result")}
          </p>
        </div>
      </div>
    </section>
  );
}

const CASE_ICONS: Partial<Record<LandingKey, ReactNode>> = {
  virtualOffice: <Building2 />,
  virtualCoworking: <Coffee />,
  onlineStudyRoom: <BookOpen />,
  virtualClassroom: <GraduationCap />,
  proximityChat: <Radio />,
};

/** Who it's for: a ruled directory of the pages written for each use, one row each. */
export function UseCases() {
  const t = useTranslations();
  const cases = LANDINGS.filter((page) => page.group === "useCases");
  return (
    <section
      id="use-cases"
      className={cn(
        COLUMN,
        "grid scroll-mt-24 gap-10 pb-24 sm:pb-32 lg:grid-cols-[1fr_1.5fr] lg:gap-20",
      )}
    >
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Heading title={t("home.cases.title")} muted={t("home.cases.muted")} />
        <p className="mt-5 max-w-[26rem] text-pretty text-[16px] leading-relaxed text-muted-foreground">
          {t("home.cases.body")}
        </p>
      </div>
      <ul className="border-t border-border">
        {cases.map((page) => (
          <li key={page.slug}>
            <Link
              href={`/${page.slug}`}
              className="group flex items-center gap-5 border-b border-border py-6 outline-none focus-visible:bg-muted/60"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-foreground group-hover:text-background [&_svg]:size-[18px]">
                {CASE_ICONS[page.key]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[19px] font-semibold tracking-tight">
                  {t(
                    `landings.pages.${page.key}.label` as "landings.pages.gather.label",
                  )}
                </span>
                <span className="mt-0.5 block text-[15px] text-muted-foreground">
                  {t(
                    `home.nav.cases.${page.key}` as "home.nav.cases.virtualOffice",
                  )}
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground rtl:rotate-180" />
            </Link>
          </li>
        ))}
      </ul>
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
        <div
          className={cn(APP, "flex h-full flex-col justify-center gap-3 p-6")}
        >
          <span className="text-[11.5px] font-medium text-muted-foreground">
            {t("create.nameLabel")}
          </span>
          <span className="flex h-10 items-center rounded-xl border border-border bg-card px-3 text-[14px] text-foreground">
            {/* The name typing itself in, the caret riding its end. */}
            <span
              dir="ltr"
              className="overflow-hidden whitespace-nowrap border-e-2 border-brand pe-0.5"
              style={{
                ["--chars" as string]: `${office.length}ch`,
                animation: `m-type 4.5s steps(${office.length}) infinite`,
              }}
            >
              {office}
            </span>
          </span>
          <span className="flex h-10 items-center justify-center rounded-full bg-foreground text-[13px] font-medium text-background">
            {t("create.continue")}
          </span>
        </div>
      ),
    },
    {
      key: "invite",
      art: (
        <div
          className={cn(
            APP,
            "flex h-full flex-col justify-center gap-3 p-6 [--face-ring:var(--ui-background)]",
          )}
        >
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-foreground">
            <Link2 className="size-3.5 text-muted-foreground" />
            {t("home.preview.guestLink")}
          </span>
          <span className="flex h-10 items-center gap-2 rounded-full border border-border bg-card pe-1 ps-3.5">
            <span
              dir="ltr"
              className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground"
            >
              tinyfloor.com/join/x7k2q
            </span>
            <span className="flex h-8 items-center gap-1 rounded-full bg-foreground px-3 text-[11.5px] font-medium text-background">
              <span className="relative size-3">
                <Copy
                  className="absolute inset-0 size-3"
                  style={{ animation: "m-swap 4s infinite" }}
                />
                <Check
                  className="absolute inset-0 size-3 opacity-0"
                  style={{ animation: "m-swap 4s infinite reverse" }}
                />
              </span>
              {t("home.preview.copy")}
            </span>
          </span>
          <span className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <FaceStack
              seeds={Object.values(PEOPLE).map((one) => one.id)}
              size={22}
              max={4}
            />
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
          walking={[
            {
              ...PEOPLE.emma,
              status: "available",
              path: [
                [17, 14, 2.4],
                [22, 14, 3],
                [22, 12, 1.5],
                [17, 12],
              ],
              faces: { 1: "right" },
            },
          ]}
          className="h-full w-full"
          over={
            <span
              className={cn(
                CHIP,
                "absolute bottom-3 start-1/2 -translate-x-1/2 rtl:translate-x-1/2",
              )}
              style={{ animation: "m-toast 8s infinite" }}
            >
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
      <Heading
        title={t("home.steps.title")}
        muted={t("home.steps.muted")}
        className="max-w-[24ch]"
      />
      <ol className={cn(SWIPE, "mt-10 sm:mt-12")}>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className={cn(SWIPE_ITEM, "flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-foreground/[0.035]")}
          >
            <div className="m-2 h-[220px] overflow-hidden rounded-[22px] border border-border bg-background">
              {step.art}
            </div>
            <div className="px-6 pb-7 pt-4 sm:px-7">
              <span
                className={cn(
                  APP,
                  "text-[12.5px] font-semibold tabular-nums text-brand",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1.5 text-balance text-[20px] font-semibold tracking-[-0.02em]">
                {t(`home.steps.${step.key}.title`)}
              </h3>
              <p className="mt-1.5 text-pretty text-[15px] leading-relaxed text-muted-foreground">
                {t(`home.steps.${step.key}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
