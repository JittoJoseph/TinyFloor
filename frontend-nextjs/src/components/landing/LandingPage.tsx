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
  Map as MapIcon,
  PenLine,
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
  type LucideIcon,
} from "lucide-react";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { COMPARE_ROWS, LANDINGS, LANDING_GROUPS, type Landing, type LandingKey } from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { COLUMN, Closing, FloorMoments, H2, Hero, MarketingShell, Notes, Questions, CJK_HEADLINE, quiet } from "@/components/home/Blocks";

interface LandingCopy {
  subtitle: string;
  points: Array<{ title: string; body: string }>;
  them?: Record<(typeof COMPARE_ROWS)[number], string>;
  faq: Array<{ q: string; a: string }>;
}

/** An icon for each of a page's three reasons, in the order its copy lists them. */
const POINT_ICONS: Record<LandingKey, [LucideIcon, LucideIcon, LucideIcon]> = {
  gather: [CalendarOff, Globe, UserPlus],
  kumospace: [Users, DoorOpen, Smartphone],
  spatialchat: [TimerOff, Building2, Footprints],
  workadventure: [Users, MapIcon, ServerOff],
  wonder: [Footprints, Globe, Sun],
  virtualOffice: [Eye, Zap, Video],
  virtualCoworking: [Coffee, DoorOpen, Radio],
  onlineStudyRoom: [VolumeX, Users, PenLine],
  virtualClassroom: [GraduationCap, Users, PenLine],
  proximityChat: [Footprints, Users, ShieldCheck],
};

/**
 * One page written for a search, in the home page's design: its own pitch over
 * the app running, its three reasons as notes, a side-by-side table on
 * comparison pages, the floor's three moments, the questions people ask,
 * where to go next, and the last ask.
 */
export async function LandingPage({ page, locale }: { page: Landing; locale: string }) {
  const t = await getTranslations("landings");
  const copy = t.raw(`pages.${page.key}` as Parameters<typeof t.raw>[0]) as LandingCopy;
  const path = `/${page.slug}`;
  const icons = POINT_ICONS[page.key];

  return (
    <MarketingShell path={path}>
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

      <section className={cn(COLUMN, "pt-28 sm:pt-36")}>
        <Notes
          className="sm:grid-cols-3"
          items={copy.points.map((point, index) => {
            const Icon = icons[index % icons.length];
            return { icon: <Icon />, title: point.title, body: point.body };
          })}
        />
      </section>

      {page.competitor && copy.them && <Compare name={page.competitor} them={copy.them} t={t} />}

      <FloorMoments className="mt-28 sm:mt-40" />

      <div className="pt-28 sm:pt-40">
        <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />
      </div>

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("relatedTitle", { em: quiet })}</h2>
        <div className="mx-auto mt-12 grid max-w-[880px] gap-10 md:grid-cols-2">
          {LANDING_GROUPS.map((group) => (
            <nav key={group} aria-label={t(group)}>
              <p className="px-1 text-[12px] font-medium uppercase tracking-[0.16em] text-faint">{t(group)}</p>
              <ul className="mt-4 grid gap-2">
                {LANDINGS.filter((other) => other.group === group && other.key !== page.key).map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/${other.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-[18px] bg-muted/80 px-5 py-4 text-[15px] transition-colors hover:bg-muted"
                    >
                      {t(`pages.${other.key}.label`)}
                      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </Link>
                  </li>
                ))}
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

/**
 * TinyFloor and the other product, row by row: a table on wide screens, a
 * list on a phone. No rules: the rows are fills with the canvas showing
 * between them, and TinyFloor's column is a shade darker.
 */
function Compare({ name, them, t }: { name: string; them: NonNullable<LandingCopy["them"]>; t: Translate }) {
  return (
    <section className={cn(COLUMN, "pt-28 sm:pt-40")}>
      <h2 className={cn(H2, CJK_HEADLINE, "mx-auto max-w-[22ch] text-center")}>{t.rich("compareTitle", { name, em: quiet })}</h2>

      <div className="mx-auto mt-14 hidden max-w-[960px] overflow-hidden rounded-[24px] sm:block">
        <div className="grid grid-cols-[28%_1fr_1fr] gap-px bg-background">
          <span className="bg-foreground/[0.035] px-6 py-5" />
          <span className="flex items-center gap-2 bg-foreground/[0.075] px-6 py-5 text-[16px] font-semibold">
            <Logo size={22} />
            TinyFloor
          </span>
          <span className="bg-foreground/[0.035] px-6 py-5 text-[16px] font-semibold text-muted-foreground">{name}</span>
          {COMPARE_ROWS.map((row) => (
            <div key={row} className="contents">
              <span className="bg-foreground/[0.035] px-6 py-5 text-[15px] text-muted-foreground">{t(`rows.${row}`)}</span>
              <span className="bg-foreground/[0.075] px-6 py-5 text-[15px] font-medium leading-snug">{t(`us.${row}`)}</span>
              <span className="bg-foreground/[0.035] px-6 py-5 text-[15px] leading-snug text-muted-foreground">{them[row]}</span>
            </div>
          ))}
        </div>
      </div>

      <dl className="mt-12 grid gap-2 sm:hidden">
        {COMPARE_ROWS.map((row) => (
          <div key={row} className="rounded-[18px] bg-muted/80 p-4">
            <dt className="text-[12.5px] text-muted-foreground">{t(`rows.${row}`)}</dt>
            <dd className="mt-2 grid grid-cols-2 gap-3 text-[14px] leading-snug">
              <span>
                <span className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold">
                  <Logo size={14} />
                  TinyFloor
                </span>
                <span className="font-medium">{t(`us.${row}`)}</span>
              </span>
              <span className="text-muted-foreground">
                <span className="mb-1 block text-[12px] font-semibold">{name}</span>
                {them[row]}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mx-auto mt-4 max-w-[960px] px-1 text-[13px] text-faint">{t("checked", { name })}</p>
    </section>
  );
}
