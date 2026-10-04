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
import { JsonLd } from "@/components/JsonLd";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, LEAD, MarketingShell } from "@/components/home/Blocks";

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
 * The index of one group of pages (docs/16): a heading, then every page in the
 * group as a card with its name and the one line it says about itself, then
 * the other indexes. It is how a visitor, and a crawler, finds all of them.
 */
export async function HubPage({ group, params }: { group: LandingGroup; params: Props["params"] }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("landings");
  const path = `/${HUBS[group]}`;
  const pages = LANDINGS.filter((page) => page.group === group);

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
          <p className={cn(EYEBROW, "mb-6")}>{t(group)}</p>
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

        <ul className="mx-auto mt-14 grid max-w-[1040px] gap-3 sm:mt-20 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <li key={page.slug}>
              <Link
                href={`/${page.slug}`}
                className="group flex h-full flex-col rounded-[24px] bg-muted/80 p-6 transition-colors hover:bg-muted sm:p-7"
              >
                <span className="flex items-center justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
                  {t(`pages.${page.key}.label`)}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </span>
                <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{t(`pages.${page.key}.meta.description`)}</span>
              </Link>
            </li>
          ))}
        </ul>

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
