import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Bell, BookOpen, Building2, CalendarDays, Check, Clock3, Coffee, Copy, Footprints, GraduationCap, Link2, MessageSquare, Mic, Radio, Video } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { PEOPLE } from "@/components/floor/scenes";
import { FloorScene } from "@/components/floor/FloorScene";
import { LANDINGS, type LandingKey } from "@/lib/landings";
import { COLUMN, Heading } from "./Blocks";

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
  // You crossing the floor to Jack, staying a while, and heading back.
  "@keyframes m-walk{0%,10%{translate:0 0}38%,78%{translate:var(--reach) 0}92%,100%{translate:0 0}}" +
  // What only shows while you're beside him: his ring, and the call.
  "@keyframes m-lit{0%,36%{opacity:0;translate:0 4px}44%,76%{opacity:1;translate:0 0}84%,100%{opacity:0;translate:0 4px}}" +
  // The other way: the messages piling up one after another.
  "@keyframes m-pile{0%,4%{opacity:0;translate:0 10px}10%,92%{opacity:1;translate:0 0}98%,100%{opacity:0}}" +
  "@keyframes m-type{0%{width:0}45%,100%{width:var(--chars)}}" +
  "@keyframes m-swap{0%,55%{opacity:1}60%,92%{opacity:0}100%{opacity:1}}" +
  "@keyframes m-toast{0%,30%{opacity:0;translate:0 -6px}38%,85%{opacity:1;translate:0 0}93%,100%{opacity:0;translate:0 -6px}}" +
  "@media (prefers-reduced-motion:reduce){.m-still,.m-still *{animation:none!important}}";

const PILL = cn(
  APP,
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)] [--face-ring:var(--ui-card)]",
);

const NOTICE_ICONS: ReactNode[] = [<MessageSquare key="m" />, <CalendarDays key="c" />, <Video key="v" />, <Bell key="b" />];

/**
 * Why a floor, as the same small question asked two ways: on the left the
 * messages, the invite and the link it takes in most remote teams, piling
 * up; on the right you walking over to Jack, and the call that's one tap
 * away once you're there. Each side ends on how long it took.
 */
export function Moments() {
  const t = useTranslations("home.versus");
  const { emma, jack, olivia, sam } = PEOPLE;
  const notices = t.raw("before.items") as Array<{ title: string; body: string }>;
  return (
    <section id="floor" className={cn(COLUMN, "m-still scroll-mt-20 pt-24 sm:pt-36")}>
      <style>{KEYFRAMES}</style>
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
          <p className="mt-auto flex items-center gap-2 pt-8 text-[15px] text-muted-foreground">
            <Clock3 className="size-4 shrink-0" />
            {t("before.result")}
          </p>
        </div>

        {/* The way it goes on a floor. */}
        <div className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card p-6 sm:p-8">
          <p className={cn(APP, "text-[12px] font-medium uppercase tracking-[0.08em] text-brand")}>{t("after.label")}</p>
          {/* A picture, not text: laid out left to right in every language. */}
          <div dir="ltr" className="relative mt-6 h-[252px] overflow-hidden rounded-[20px] bg-muted/50 [container-type:inline-size] [--face-ring:var(--ui-card)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle,var(--ui-border-strong)_1px,transparent_1.2px)] bg-[length:22px_22px] opacity-70" />
            {/* The rest of the floor, getting on with their day. */}
            <span className="absolute left-[8%] top-[12%] opacity-60">
              <Face seed={sam.id} size={30} presence="busy" />
            </span>
            <span className="absolute bottom-[12%] left-[26%] opacity-60">
              <Face seed={olivia.id} size={30} presence="available" />
            </span>
            {/* Jack, and his ring lighting up once you're beside him. */}
            <span className="absolute right-[14%] top-[34%] flex flex-col items-center gap-1.5">
              <span className="relative">
                <span className="absolute -inset-2 rounded-full border-2 border-brand opacity-0" style={{ animation: "m-lit 8s ease-in-out infinite" }} />
                <Face seed={jack.id} size={52} presence="available" />
              </span>
              <span className={PILL}>{jack.name}</span>
            </span>
            {/* You, and how far you can be heard, walking over. */}
            <span
              className="absolute left-[12%] top-[34%] [--reach:calc(100cqw*0.6-100px)]"
              style={{ animation: "m-walk 8s cubic-bezier(.6,0,.3,1) infinite" }}
            >
              <span className="relative flex flex-col items-center gap-1.5">
                <span className="absolute left-1/2 top-[26px] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-foreground/25 bg-brand/[0.05]" />
                <Face seed={emma.id} size={52} />
                <span className={cn(PILL, "relative")}>{t("after.you")}</span>
              </span>
            </span>
            <span className="absolute bottom-4 right-4 opacity-0" style={{ animation: "m-lit 8s ease-in-out infinite" }}>
              <span className={cn(PILL, "gap-2 py-1 pe-1 ps-1.5")}>
                <Face seed={jack.id} size={20} />
                {t("after.talking", { name: jack.name })}
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-foreground">
                  <Mic className="size-3" />
                </span>
              </span>
            </span>
          </div>
          <p className="mt-auto flex items-center gap-2 pt-8 text-[15px] text-foreground">
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
      <ol className="mt-12 grid gap-3 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="flex min-w-0 flex-col overflow-hidden rounded-[28px] border border-border/60 bg-foreground/[0.035]"
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
