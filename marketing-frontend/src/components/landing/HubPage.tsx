import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import type { Locale } from "@/lib/i18n/routing";
import { HUBS, LANDINGS, LANDING_GROUPS, type LandingGroup } from "@/lib/landings";
import { pageMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { emphasised } from "@/lib/words";
import { cn } from "@/lib/utils";
import { hubArticle } from "@/lib/landing-articles";
import { JsonLd } from "@/components/JsonLd";
import { ArticleSections, READ, numberItems } from "@/components/guides/ArticleSections";
import { CJK_HEADLINE, COLUMN, Closing, LEAD, MarketingShell } from "@/components/home/Blocks";
import { PageCard } from "@/components/home/PageCard";
import { illustrationFor } from "@/lib/illustrations";

type Props = { params: Promise<{ locale: string }> };

/** The page's metadata, from `landings.hubs.<group>.meta`. */
export function hubMetadata(group: LandingGroup) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale: locale as Locale, namespace: "landings.hubs" });
    return pageMetadata({ locale, path: `/${HUBS[group]}`, title: t(`${group}.meta.title`), description: t(`${group}.meta.description`) });
  };
}

/**
 * The index of one group of pages (docs/search.md): a heading, then every page in the
 * group as a card with its name and the one line it says about itself, then
 * the other indexes. It is how a visitor, and a crawler, finds all of them.
 */
export async function HubPage({ group, params }: { group: LandingGroup; params: Props["params"] }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("landings");
  const path = `/${HUBS[group]}`;
  const pages = LANDINGS.filter((page) => page.group === group);
  // What's behind the list, where this language has it: a few short sections under the cards.
  const article = await hubArticle(locale, group);

  return (
    <MarketingShell path={path}>
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          type: "CollectionPage",
          name: t(`hubs.${group}.meta.title`),
          description: t(`hubs.${group}.meta.description`),
        })}
      />
      <section className={cn(COLUMN, "pb-24 pt-32 sm:pb-32 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <h1
            className={cn(
              "max-w-[18ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px]",
              CJK_HEADLINE,
            )}
          >
            {emphasised(t.raw(`hubs.${group}.title`) as string, locale, "text-foreground/55")}
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[34rem] text-balance")}>{t(`hubs.${group}.body`)}</p>
        </div>

        <ul className={cn("mx-auto mt-14 grid sm:mt-20 md:grid-cols-2 lg:grid-cols-3", illustrationFor(pages[0]?.slug ?? "") ? "max-w-[1120px] gap-x-6 gap-y-12" : "max-w-[1040px] gap-3")}>
          {pages.map((page) => (
            <li key={page.slug}>
              <PageCard href={`/${page.slug}`} title={t(`pages.${page.key}.label`)} description={t(`pages.${page.key}.meta.description`)} image={illustrationFor(page.slug)} />
            </li>
          ))}
        </ul>

        {article && (
          <div className={cn(READ, "mt-4 sm:mt-8")}>
            <ArticleSections sections={numberItems(article)} />
          </div>
        )}

        <nav aria-label={(t.raw("relatedTitle") as string).replace(/<\/?em>/g, "")} className="mt-14 flex flex-wrap justify-center gap-2">
          {LANDING_GROUPS.filter((other) => other !== group).map((other) => (
            <Link
              key={other}
              href={`/${HUBS[other]}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-foreground/[0.06] px-4 text-[14px] font-medium transition-colors hover:bg-foreground/[0.1]"
            >
              {t(other)}
              <ArrowRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
            </Link>
          ))}
        </nav>
      </section>
      <Closing />
    </MarketingShell>
  );
}
