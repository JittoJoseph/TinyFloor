import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  Coffee,
  Copy,
  DoorClosed,
  Footprints,
  GraduationCap,
  Link2,
  Presentation,
  Radio,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Face, FaceStack, faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { PEOPLE } from "@/components/floor/scenes";
import { FloorScene } from "@/components/floor/FloorScene";
import { LANDINGS, type LandingKey } from "@/lib/landings";
import { CJK_HEADLINE, COLUMN, Heading } from "./Blocks";

/*
 * The sections between the features and the pricing that say what the floor
 * is like, how a team gets onto it, and who it's for: type set with faces in
 * it, three steps with the app doing each, and a directory of the pages for
 * each use. CSS only; nothing here runs in the browser.
 */

const APP =
  "font-(family-name:--font-app) [font-feature-settings:'cv11','ss01']";
const CHIP = cn(
  APP,
  "flex h-8 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground shadow-float [--face-ring:var(--ui-card)]",
);

const KEYFRAMES =
  // The second face in "walk over" closing the gap to the first, then leaving again.
  "@keyframes m-near{0%,20%{translate:14px 0}40%,80%{translate:0 0}95%,100%{translate:14px 0}}" +
  // A ring on whoever is talking at the table.
  "@keyframes m-talk{0%,100%{scale:1;opacity:.9}50%{scale:1.08;opacity:.55}}" +
  "@keyframes m-type{0%{width:0}45%,100%{width:var(--chars)}}" +
  "@keyframes m-swap{0%,55%{opacity:1}60%,92%{opacity:0}100%{opacity:1}}" +
  "@keyframes m-toast{0%,30%{opacity:0;translate:0 -6px}38%,85%{opacity:1;translate:0 0}93%,100%{opacity:0;translate:0 -6px}}" +
  "@media (prefers-reduced-motion:reduce){.m-still,.m-still *{animation:none!important}}";

/** Faces set into a line of type, sized to it and sitting on its baseline. */
function InType({ children }: { children: ReactNode }) {
  return (
    <span className="mx-[0.18em] inline-flex translate-y-[0.1em] items-center align-baseline [--face-ring:var(--ui-background)]">
      {children}
    </span>
  );
}

const ORB = "size-[0.92em]";

/**
 * What the floor is like, said the way a person would, the people in it set
 * into the words: two faces walking together, three at a table with a ring on
 * whoever is talking, one on their own and busy. Then what each is called and
 * how it works, under a hairline.
 */
export function Moments() {
  const t = useTranslations("home");
  const { emma, jack, olivia, sam, noah } = PEOPLE;
  // A face at the size of the type around it, with the same light and shade the app's faces have.
  const face = (seed: string, className?: string, busy?: boolean) => (
    <span
      className={cn(
        "relative inline-block shrink-0 rounded-full",
        ORB,
        className,
      )}
      style={{
        backgroundImage: faceBackground(seed),
        boxShadow:
          "inset -0.06em -0.08em 0.18em rgb(0 0 0 / 0.22), inset 0.04em 0.05em 0.12em rgb(255 255 255 / 0.28)",
      }}
    >
      {busy && (
        <span className="absolute bottom-[2%] end-[2%] size-[28%] rounded-full bg-destructive shadow-[0_0_0_0.06em_var(--ui-background)]" />
      )}
    </span>
  );
  const columns: Array<{
    key: "walk" | "meet" | "door";
    icon: ReactNode;
    body: string;
    href?: string;
  }> = [
    {
      key: "walk",
      icon: <Footprints />,
      body: t("features.proximity.body"),
      href: "/proximity-chat",
    },
    { key: "meet", icon: <Presentation />, body: t("features.meetings.body") },
    { key: "door", icon: <DoorClosed />, body: t("moments.door.body") },
  ];
  return (
    <section
      id="floor"
      className={cn(COLUMN, "m-still scroll-mt-20 pt-24 sm:pt-36")}
    >
      <style>{KEYFRAMES}</style>
      <h2
        className={cn(
          APP,
          "text-[13px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        )}
      >
        {t("moments.title")}
      </h2>
      <p
        className={cn(
          "mt-6 text-[36px] font-normal leading-[1.22] tracking-[-0.025em] sm:text-[54px] sm:leading-[1.18] lg:text-[62px] [:lang(ja)_&]:[word-break:auto-phrase]",
          CJK_HEADLINE,
        )}
      >
        {/* A sentence to a line where there's room for it. */}
        <span className="sm:block">
          {t.rich("moments.lines.walk", {
            faces: () => (
              <InType>
                {face(emma.id)}
                <span
                  className="-ms-[0.18em] inline-flex"
                  style={{
                    animation: "m-near 6s cubic-bezier(.6,0,.3,1) infinite",
                  }}
                >
                  {face(jack.id)}
                </span>
              </InType>
            ),
          })}
        </span>{" "}
        <span className="sm:block">
          {t.rich("moments.lines.meet", {
            faces: () => (
              <InType>
                {face(olivia.id)}
                <span className="relative -ms-[0.18em] inline-flex">
                  <span
                    className="absolute -inset-[0.08em] rounded-full border-[0.05em] border-brand"
                    style={{ animation: "m-talk 1.4s ease-in-out infinite" }}
                  />
                  {face(jack.id)}
                </span>
                <span className="-ms-[0.18em] inline-flex">{face(sam.id)}</span>
              </InType>
            ),
          })}
        </span>{" "}
        <span className="sm:block">
          {t.rich("moments.lines.door", {
            faces: () => <InType>{face(noah.id, undefined, true)}</InType>,
            quiet: (chunks) => (
              <span className="text-muted-foreground/80">{chunks}</span>
            ),
          })}
        </span>
      </p>
      <div
        id="meetings"
        className="mt-14 grid scroll-mt-28 gap-10 border-t border-border pt-10 sm:grid-cols-3 sm:gap-8"
      >
        {columns.map((one) => (
          <div key={one.key}>
            <span className="flex items-center gap-2 text-[15.5px] font-semibold [&_svg]:size-4 [&_svg]:text-brand">
              {one.icon}
              {t(`moments.labels.${one.key}`)}
            </span>
            <p className="mt-2.5 max-w-[24rem] text-pretty text-[15px] leading-relaxed text-muted-foreground">
              {one.body}
            </p>
            {one.href && (
              <Link
                href={one.href}
                className="group mt-3 inline-flex items-center gap-1 text-[14.5px] font-medium text-foreground"
              >
                {t("moments.more")}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            )}
          </div>
        ))}
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
