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
import { Link } from "@/lib/i18n/navigation";
import { COMPARE_ROWS, LANDINGS, LANDING_GROUPS, type Landing, type LandingKey } from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { Logo } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import {
  CJK_HEADLINE,
  COLUMN,
  HeroAsk,
  Faq,
  Final,
  Heading,
  MarketingShell,
  ProductPreview,
  RuledSheet,
  Trust,
  quiet,
} from "@/components/home/Blocks";
import { Moments, Steps } from "@/components/home/Moments";

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
 * One page written for a search, in the site's design: the pitch over the
 * product itself, three reasons, a side-by-side table on comparison pages,
 * then the home page's quick question, three steps and trust, the questions
 * people ask, where to go next, and the last ask.
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

      <section className={cn(COLUMN, "pt-9 sm:pt-24")}>
        <div className="mx-auto flex max-w-[50rem] flex-col items-start text-start sm:items-center sm:text-center">
          <span className="inline-flex h-8 items-center rounded-full border border-border bg-card px-3.5 text-[13px] text-muted-foreground">
            {t(`pages.${page.key}.label`)}
          </span>
          <h1
            className={cn(
              "mt-5 text-balance hyphens-auto text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] sm:mt-7 sm:text-[58px] lg:text-[66px]",
              CJK_HEADLINE,
            )}
          >
            {emphasised(t.raw(`pages.${page.key}.title`) as string, locale, "text-brand")}
          </h1>
          <p className="mt-4 max-w-[38rem] text-pretty text-[15.5px] leading-relaxed text-muted-foreground sm:mt-6 sm:text-[19px]">{copy.subtitle}</p>
          <HeroAsk />
        </div>
        <ProductPreview className="mt-16 sm:mt-20" />
      </section>

      <section className={cn(COLUMN, "pt-24 sm:pt-32")}>
        <RuledSheet
          columns={3}
          items={copy.points.map((point, index) => {
            const Icon = icons[index % icons.length];
            return { icon: <Icon />, title: point.title, body: point.body };
          })}
        />
      </section>

      {page.competitor && copy.them && <Compare name={page.competitor} them={copy.them} t={t} />}

      <Moments />
      <div id="how-it-works" className="scroll-mt-24 pt-24 sm:pt-32">
        <Steps />
      </div>
      <Trust />

      <Faq title={t.rich("faqTitle", { em: quiet })} items={copy.faq} />

      <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
        <Heading title={t.rich("relatedTitle", { em: quiet })} />
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {LANDING_GROUPS.map((group) => (
            <nav key={group} aria-label={t(group)}>
              <p className="text-[13px] font-semibold text-faint">{t(group)}</p>
              <ul className="mt-3 grid gap-2">
                {LANDINGS.filter((other) => other.group === group && other.key !== page.key).map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/${other.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-[15px] transition-[border-color,background-color] hover:border-border-strong hover:bg-foreground/[0.03]"
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

      <Final />
    </MarketingShell>
  );
}

type Translate = Awaited<ReturnType<typeof getTranslations<"landings">>>;

/** TinyFloor and the other product, row by row: a table on wide screens, a list on a phone. */
function Compare({ name, them, t }: { name: string; them: NonNullable<LandingCopy["them"]>; t: Translate }) {
  return (
    <section className={cn(COLUMN, "pt-24 sm:pt-32")}>
      <Heading title={t.rich("compareTitle", { name, em: quiet })} className="max-w-[22ch]" />
      <div className="mt-12 hidden overflow-hidden rounded-[24px] border border-border bg-card sm:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-border">
              <td className="w-[28%] px-6 py-5" />
              <th scope="col" className="bg-brand/[0.05] px-6 py-5 text-start">
                <span className="inline-flex items-center gap-2 text-[16px] font-semibold">
                  <Logo size={22} />
                  TinyFloor
                </span>
              </th>
              <th scope="col" className="px-6 py-5 text-start text-[16px] font-semibold text-muted-foreground">
                {name}
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row} className="border-b border-border last:border-0">
                <th scope="row" className="px-6 py-5 text-start align-top text-[15px] font-normal text-muted-foreground">
                  {t(`rows.${row}`)}
                </th>
                <td className="bg-brand/[0.05] px-6 py-5 align-top text-[15px] font-semibold leading-snug">{t(`us.${row}`)}</td>
                <td className="px-6 py-5 align-top text-[15px] leading-snug text-muted-foreground">{them[row]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="mt-10 overflow-hidden rounded-[20px] border border-border bg-card sm:hidden">
        <div className="grid grid-cols-2 border-b border-border text-[14px] font-semibold">
          <span className="flex items-center gap-2 bg-brand/[0.05] px-4 py-3.5">
            <Logo size={18} />
            TinyFloor
          </span>
          <span className="px-4 py-3.5 text-muted-foreground">{name}</span>
        </div>
        {COMPARE_ROWS.map((row) => (
          <div key={row} className="border-b border-border last:border-0">
            <dt className="px-4 pb-1 pt-3.5 text-[12.5px] text-muted-foreground">{t(`rows.${row}`)}</dt>
            <dd className="grid grid-cols-2 text-[14px] leading-snug">
              <span className="px-4 pb-3.5 pt-1 font-semibold">{t(`us.${row}`)}</span>
              <span className="px-4 pb-3.5 pt-1 text-muted-foreground">{them[row]}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 px-1 text-[13px] text-faint">{t("checked", { name })}</p>
    </section>
  );
}
