import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  CalendarOff,
  Coffee,
  DoorOpen,
  Eye,
  Footprints,
  Globe,
  GraduationCap,
  Hand,
  Hash,
  Link2,
  Lock,
  MapIcon,
  MessagesSquare,
  MonitorUp,
  Moon,
  Music2,
  PenLine,
  Presentation,
  Radio,
  ServerOff,
  ShieldCheck,
  Smartphone,
  Sun,
  TimerOff,
  UserPlus,
  Users,
  Video,
  VolumeX,
  Zap,
  type AppIcon,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { COMPARE_ROWS, HUBS, LANDINGS, LANDING_GROUPS, landingByKey, type Landing, type LandingKey } from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { COLUMN, Closing, FloorMoments, H2, Hero, MarketingShell, Questions, CJK_HEADLINE, quiet } from "@/components/home/Blocks";

type Row = (typeof COMPARE_ROWS)[number];

interface LandingCopy {
  subtitle: string;
  points: Array<{ title: string; body: string }>;
  /** The other product, row by row. A row it has no answer for is left out of the table. */
  them?: Partial<Record<Row, string>>;
  /** Feature pages: a few words for the nav's Product menu. */
  line?: string;
  /** Team, use-case and feature pages: three moments of the day, each with a short label (a time, a size, a step). */
  momentsTitle?: string;
  moments?: Array<{ label: string; title: string; body: string }>;
  faq: Array<{ q: string; a: string }>;
}

/** An icon for each of a page's three reasons, in the order its copy lists them. */
const POINT_ICONS: Record<LandingKey, [AppIcon, AppIcon, AppIcon]> = {
  gather: [CalendarOff, Globe, UserPlus],
  kumospace: [Users, DoorOpen, Smartphone],
  spatialchat: [TimerOff, Building2, Footprints],
  workadventure: [Users, MapIcon, ServerOff],
  wonder: [Footprints, Globe, Sun],
  sococo: [Users, Footprints, TimerOff],
  ovice: [Users, Footprints, MessagesSquare],
  teamflow: [Users, TimerOff, Globe],
  roam: [DoorOpen, Globe, Users],
  slackHuddles: [Eye, Users, Hash],
  discord: [Lock, Eye, Presentation],
  gatherVsKumospace: [MapIcon, Users, Zap],
  virtualOffice: [Eye, Zap, Video],
  virtualCoworking: [Coffee, DoorOpen, Radio],
  virtualClassroom: [GraduationCap, Users, PenLine],
  proximityChat: [Footprints, Users, ShieldCheck],
  meetingRoom: [DoorOpen, Users, MonitorUp],
  teamChat: [Hash, MessagesSquare, Zap],
  presence: [Eye, Radio, Footprints],
  whiteboard: [PenLine, Users, CalendarOff],
  pairProgramming: [Zap, MonitorUp, UserPlus],
  standup: [Presentation, Eye, TimerOff],
  onboarding: [Link2, Users, Hand],
  watercooler: [Footprints, Music2, CalendarOff],
  engineering: [VolumeX, Zap, Presentation],
  design: [MonitorUp, PenLine, Moon],
  startups: [Users, Building2, Zap],
  agencies: [Eye, MonitorUp, Hash],
};

/**
 * One page written for a search, in the home page's design: its own pitch over
 * the app running, its three reasons as notes, a side-by-side table on
 * comparison pages, the floor's three moments, the questions people ask,
 * where to go next, and the last ask.
 */
export async function LandingPage({ page, locale }: { page: Landing; locale: string }) {
  const t = await getTranslations("landings");
  const copyOf = (key: LandingKey) => t.raw(`pages.${key}` as Parameters<typeof t.raw>[0]) as LandingCopy;
  const copy = copyOf(page.key);
  const path = `/${page.slug}`;
  const icons = POINT_ICONS[page.key];
  const checked = page.checked
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${page.checked}-01T00:00:00Z`))
    : "";
  // The products beside TinyFloor: the one this page is about, or both sides of an "X vs Y".
  const others = page.versus
    ? page.versus.map((key) => ({ name: landingByKey(key).competitor ?? "", them: copyOf(key).them ?? {} }))
    : page.competitor && copy.them
      ? [{ name: page.competitor, them: copy.them }]
      : [];
  const compareTitle =
    others.length === 2
      ? t.rich("versusTitle", { a: others[0].name, b: others[1].name, em: quiet })
      : t.rich("compareTitle", { name: page.competitor ?? "", em: quiet });
  const note =
    others.length === 2
      ? t("checkedBothIn", { a: others[0].name, b: others[1].name, date: checked })
      : checked
        ? t("checkedIn", { name: page.competitor ?? "", date: checked })
        : t("checked", { name: page.competitor ?? "" });

  return (
    <MarketingShell path={path} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          name: t(`pages.${page.key}.meta.title`),
          description: t(`pages.${page.key}.meta.description`),
          nodes: [faqNode(locale, path, copy.faq)],
        })}
      />

      <Hero
        size="page"
        eyebrow={t(`pages.${page.key}.label`)}
        title={emphasised(t.raw(`pages.${page.key}.title`) as string, locale, "")}
        body={copy.subtitle}
      />

      <Points
        items={copy.points.map((point, index) => {
          const Icon = icons[index % icons.length];
          return { icon: <Icon />, title: point.title, body: point.body };
        })}
      />

      {copy.moments && copy.momentsTitle && (
        <Moments title={emphasised(copy.momentsTitle, locale, "text-muted-foreground/75")} items={copy.moments} />
      )}

      {others.length > 0 && <Compare title={compareTitle} note={note} others={others} t={t} />}

      {/* The home page's three moments, for pages that have no day of their own to show. */}
      {!copy.moments && <FloorMoments className={SECTION_GAP} />}

      <div className={SECTION}>
        <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />
      </div>

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("relatedTitle", { em: quiet })}</h2>
        <div className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* The page's own group first, then the others; each shows a few and leads to its index for the rest. */}
          {[page.group, ...LANDING_GROUPS.filter((group) => group !== page.group)].map((group) => (
            <nav key={group} aria-label={t(group)}>
              <p className="px-1 text-[12px] font-medium uppercase tracking-[0.16em] text-faint">{t(group)}</p>
              <ul className="mt-4 grid gap-2">
                {LANDINGS.filter((other) => other.group === group && other.key !== page.key)
                  .slice(0, 3)
                  .map((other) => (
                    <li key={other.slug}>
                      <Link
                        href={`/${other.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-[16px] bg-muted/80 px-4 py-3.5 text-[14.5px] transition-colors hover:bg-muted"
                      >
                        {t(`pages.${other.key}.label`)}
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                <li>
                  <Link
                    href={`/${HUBS[group]}`}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("all")}
                    <ArrowRight className="size-3.5 rtl:rotate-180" />
                  </Link>
                </li>
              </ul>
            </nav>
          ))}
        </div>
      </section>

      <Closing />
    </MarketingShell>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<"landings">>>;

/** The gap above a section: the same rhythm on every page written for a search. */
const SECTION_GAP = "mt-24 sm:mt-32";
const SECTION = "pt-24 sm:pt-32";

/**
 * The page's three reasons, as cards under the hero: an icon, a short claim,
 * a line or two. They carry the page's own argument, so they sit first.
 */
function Points({ items }: { items: Array<{ icon: ReactNode; title: string; body: string }> }) {
  return (
    <section className={cn(COLUMN, SECTION)}>
      <ul className="mx-auto grid max-w-[1040px] gap-3 md:grid-cols-3">
        {items.map((one) => (
          <li key={one.title} className="flex flex-col rounded-[24px] bg-muted/80 p-6 sm:p-7">
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)] [&_svg]:size-5">
              {one.icon}
            </span>
            <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{one.title}</h3>
            <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{one.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Three moments of the day as a timeline: a rail with a dot for each, its
 * label (a time, a team size, a step) by the dot. Across on wide screens,
 * down the side on a phone.
 */
function Moments({ title, items }: { title: ReactNode; items: NonNullable<LandingCopy["moments"]> }) {
  return (
    <section className={cn(COLUMN, SECTION)}>
      <h2 className={cn(H2, CJK_HEADLINE, "mx-auto max-w-[20ch] text-center")}>{title}</h2>
      <ol className="relative mx-auto mt-12 grid max-w-[1040px] gap-8 ps-8 sm:mt-16 md:grid-cols-3 md:gap-6 md:ps-0 md:pt-10">
        {/* The rail: down the side on a phone, across the top on wider screens. */}
        <span aria-hidden className="absolute bottom-2 start-[7px] top-2 w-0.5 rounded-full bg-foreground/10 md:inset-x-0 md:bottom-auto md:top-[6px] md:h-0.5 md:w-auto" />
        {items.map((one) => (
          <li key={one.title} className="relative">
            <span
              aria-hidden
              className="absolute -start-8 top-1 size-[15px] rounded-full border-[3px] border-background bg-brand shadow-[0_0_0_1px_var(--ui-border)] md:-top-10 md:start-0"
            />
            <p className="text-[13px] font-medium tabular-nums text-brand">{one.label}</p>
            <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.01em]">{one.title}</h3>
            <p className="mt-2 max-w-[22rem] text-[15px] leading-[1.6] text-muted-foreground">{one.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * TinyFloor and the other products, row by row: a table on wide screens, a
 * list on a phone. No rules: the rows are fills with the canvas showing
 * between them, and TinyFloor's column is a shade darker. A row shows only
 * when every other product has an answer for it.
 */
function Compare({
  title,
  note,
  others,
  t,
}: {
  title: ReactNode;
  note: string;
  others: Array<{ name: string; them: Partial<Record<Row, string>> }>;
  t: Translate;
}) {
  const rows = COMPARE_ROWS.filter((row) => others.every((other) => other.them[row]));
  return (
    <section className={cn(COLUMN, SECTION)}>
      <h2 className={cn(H2, CJK_HEADLINE, "mx-auto max-w-[22ch] text-center")}>{title}</h2>

      <div className="mx-auto mt-14 hidden max-w-[960px] overflow-hidden rounded-[24px] sm:block">
        <div className={cn("grid gap-px bg-background", others.length === 1 ? "grid-cols-[28%_1fr_1fr]" : "grid-cols-[22%_1fr_1fr_1fr]")}>
          <span className="bg-foreground/[0.035] px-6 py-5" />
          <span className="flex items-center gap-2 bg-foreground/[0.075] px-6 py-5 text-[16px] font-semibold">
            <Logo size={22} />
            TinyFloor
          </span>
          {others.map((other) => (
            <span key={other.name} className="bg-foreground/[0.035] px-6 py-5 text-[16px] font-semibold text-muted-foreground">
              {other.name}
            </span>
          ))}
          {rows.map((row) => (
            <div key={row} className="contents">
              <span className="bg-foreground/[0.035] px-6 py-5 text-[15px] text-muted-foreground">{t(`rows.${row}`)}</span>
              <span className="bg-foreground/[0.075] px-6 py-5 text-[15px] font-medium leading-snug">{t(`us.${row}`)}</span>
              {others.map((other) => (
                <span key={other.name} className="bg-foreground/[0.035] px-6 py-5 text-[15px] leading-snug text-muted-foreground">
                  {other.them[row]}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <dl className="mt-12 grid gap-2 sm:hidden">
        {rows.map((row) => (
          <div key={row} className="rounded-[18px] bg-muted/80 p-4">
            <dt className="text-[12.5px] text-muted-foreground">{t(`rows.${row}`)}</dt>
            <dd className={cn("mt-2 grid gap-3 text-[14px] leading-snug", others.length === 1 ? "grid-cols-2" : "grid-cols-3")}>
              <span className="min-w-0">
                <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold">
                  <Logo size={14} />
                  TinyFloor
                </span>
                <span className="font-medium">{t(`us.${row}`)}</span>
              </span>
              {others.map((other) => (
                <span key={other.name} className="min-w-0 text-muted-foreground">
                  <span className="mb-1 block text-[12px] font-semibold">{other.name}</span>
                  {other.them[row]}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mx-auto mt-4 max-w-[960px] px-1 text-[13px] text-faint">{note}</p>
    </section>
  );
}
