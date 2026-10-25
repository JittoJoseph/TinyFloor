import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Footprints,
  Globe,
  Sun,
  type AppIcon,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { COMPARE_ROWS, HUBS, LANDINGS, LANDING_GROUPS, landingByKey, relatedLandings, type Landing, type LandingKey } from "@/lib/landings";
import { guidesFor } from "@/lib/guides";
import { guideCopies } from "@/lib/guide-copy";
import { GuideCard } from "@/components/guides/GuidePage";
import { articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { AUTHOR } from "@/lib/site";
import { byline } from "@/components/guides/Byline";
import { JsonLd } from "@/components/JsonLd";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { COLUMN, Closing, FloorMoments, H2, Hero, MarketingShell, Questions, CJK_HEADLINE, quiet } from "@/components/home/Blocks";
import { ArticleSections, READ, numberItems } from "@/components/guides/ArticleSections";
import { landingArticle } from "@/lib/landing-articles";

type Row = (typeof COMPARE_ROWS)[number];

interface LandingCopy {
  subtitle: string;
  /** A page without its own article (lib/landing-articles): three short points. */
  points?: Array<{ title: string; body: string }>;
  /** The other product, row by row. A row it has no answer for is left out of the table. */
  them?: Partial<Record<Row, string>>;
  /** Feature pages: a few words for the nav's Product menu. */
  line?: string;
  faq: Array<{ q: string; a: string }>;
}

/** An icon for each of the three reasons on a page without its own article, in the order its copy lists them. */
const POINT_ICONS: Partial<Record<LandingKey, [AppIcon, AppIcon, AppIcon]>> = {
  wonder: [Footprints, Globe, Sun],
};

/**
 * One page written for a search, in the home page's design: its own pitch over
 * the app running, its three reasons as notes, a side-by-side table on
 * comparison pages, the floor's three moments, the questions people ask,
 * where to go next, and the last ask.
 */
export async function LandingPage({ page, locale }: { page: Landing; locale: string }) {
  const t = await getTranslations("landings");
  const tg = await getTranslations("guides");
  const copyOf = (key: LandingKey) => t.raw(`pages.${key}` as Parameters<typeof t.raw>[0]) as LandingCopy;
  const copy = copyOf(page.key);
  // The page's own long text where this language has it (lib/landing-articles): it takes
  // the place of the three short points and the home page's moments, so nothing is shared.
  const article = await landingArticle(locale, page.key);
  // The guides that lead here, so the link goes both ways.
  const guides = guidesFor(page.key, page.group === "compare", locale).slice(0, 4);
  const guideCopy = guides.length ? await guideCopies(locale) : null;
  const path = `/${page.slug}`;
  const icons = POINT_ICONS[page.key] ?? [Footprints, Globe, Sun];
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
          nodes: [
            // A page with its own long text is an article, written by someone: the guides' author.
            ...(article
              ? [
                  articleNode({
                    locale,
                    path,
                    headline: t(`pages.${page.key}.meta.title`),
                    description: t(`pages.${page.key}.meta.description`),
                    updated: page.checked ? `${page.checked}-01` : undefined,
                  }),
                ]
              : []),
            faqNode(locale, path, copy.faq),
          ],
        })}
      />

      <Hero
        size="page"
        eyebrow={t(`pages.${page.key}.label`)}
        title={emphasised(t.raw(`pages.${page.key}.title`) as string, locale, "")}
        body={copy.subtitle}
      />

      {article ? (
        <div className={cn(COLUMN, "pb-4")}>
          <div className={READ}>
            {/* Who wrote it, and when the facts in it were last checked. */}
            <p className="mb-10 mt-14 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border pb-6 text-[14px] text-muted-foreground sm:mt-20">
              <span>{byline(tg("by", { name: AUTHOR.name }))}</span>
              {checked && (
                <>
                  <span aria-hidden>·</span>
                  <span>{tg("updated", { date: checked })}</span>
                </>
              )}
            </p>
            <ArticleSections sections={numberItems(article)} />
          </div>
        </div>
      ) : (
        <Points
          items={(copy.points ?? []).map((point, index) => {
            const Icon = icons[index % icons.length];
            return { icon: <Icon />, title: point.title, body: point.body };
          })}
        />
      )}

      {others.length > 0 && <Compare title={compareTitle} note={note} others={others} t={t} />}

      {/* The home page's three moments, for a page without its own article. */}
      {!article && <FloorMoments className={SECTION_GAP} />}

      <div className={SECTION}>
        <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />
      </div>

      {guideCopy && (
        <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
          <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("guidesTitle", { em: quiet })}</h2>
          <ul className="mx-auto mt-12 grid max-w-[1040px] gap-3 md:grid-cols-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <GuideCard guide={guide} title={guideCopy[guide.key].label} description={guideCopy[guide.key].meta.description} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("relatedTitle", { em: quiet })}</h2>
        <div className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* The page's own group first, then the others; each shows a few and leads to its index for the rest. */}
          {[page.group, ...LANDING_GROUPS.filter((group) => group !== page.group)].map((group) => (
            <nav key={group} aria-label={t(group)}>
              <p className="px-1 text-[12px] font-medium uppercase tracking-[0.16em] text-faint">{t(group)}</p>
              <ul className="mt-4 grid gap-2">
                {(group === page.group ? relatedLandings(page, 3) : LANDINGS.filter((other) => other.group === group).slice(0, 3)).map(
                  (other) => (
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
            <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.01em]">{one.title}</h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">{one.body}</p>
          </li>
        ))}
      </ul>
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
