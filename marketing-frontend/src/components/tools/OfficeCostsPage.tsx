import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, INK, LEAD, MarketingShell, Questions } from "@/components/home/Blocks";
import { ArticleSections, READ, numberItems } from "@/components/guides/ArticleSections";
import type { GuideSection } from "@/lib/guides";
import {
  OFFICE_COSTS_PATH,
  OFFICE_COSTS_UPDATED,
  OFFICE_PRODUCTS,
  usd,
  type OfficeCostsContent,
} from "@/lib/tools/office-costs";
import { OfficeCostCalculator } from "./OfficeCostCalculator";

const SIZES = [5, 10, 15];

/** The table of team sizes, worked out from the same prices as the calculator, billed yearly where a product offers it. */
function sizesTable(copy: OfficeCostsContent, locale: string): GuideSection {
  const { calculator: labels, table } = copy;
  const fill = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));
  const rows = [...OFFICE_PRODUCTS]
    .sort((a, b) => (a.cost(10, "yearly")?.amount ?? Infinity) - (b.cost(10, "yearly")?.amount ?? Infinity))
    .map((product) => [
      product.plan === product.name ? product.name : `${product.name} ${product.plan}`,
      ...SIZES.map((people) => {
        const cost = product.cost(people, "yearly");
        if (!cost) return fill(labels.upTo, { count: product.maxPeople! });
        return cost.billed === "yearly" ? usd(cost.amount, locale) : `${usd(cost.amount, locale)} (${labels.only.monthly})`;
      }),
    ]);
  return {
    title: table.title,
    body: table.body,
    table: { head: [table.product, ...SIZES.map((count) => fill(labels.count, { count }))], rows, note: table.note },
  };
}

/**
 * The virtual office cost calculator (lib/tools/office-costs): the calculator
 * up top, then how these tools charge, a table of team sizes, what the price
 * leaves out and how we checked. Read in the guides' column.
 */
export function OfficeCostsPage({ locale, content: copy }: { locale: string; content: OfficeCostsContent }) {
  const updated = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${OFFICE_COSTS_UPDATED}T00:00:00Z`),
  );
  const sections = numberItems([...copy.sections, sizesTable(copy, locale), ...copy.after]);

  return (
    <MarketingShell path={OFFICE_COSTS_PATH} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path: OFFICE_COSTS_PATH,
          name: copy.meta.title,
          description: copy.meta.description,
          mainEntity: `${absoluteUrl(locale, OFFICE_COSTS_PATH)}#article`,
          nodes: [
            articleNode({
              locale,
              path: OFFICE_COSTS_PATH,
              headline: copy.meta.title,
              description: copy.meta.description,
              published: OFFICE_COSTS_UPDATED,
              updated: OFFICE_COSTS_UPDATED,
            }),
            faqNode(locale, OFFICE_COSTS_PATH, copy.faq),
          ],
        })}
      />

      <article lang={locale}>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className={READ}>
            <p className={EYEBROW}>{copy.eyebrow}</p>
            <h1
              className={cn(
                "mt-6 text-balance text-[36px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, locale, "text-muted-foreground/75")}
            </h1>
            <p className={cn(LEAD, "mt-7")}>{copy.intro}</p>
            <p className="mt-7 text-[14px] text-muted-foreground">
              {copy.updated} <time dateTime={OFFICE_COSTS_UPDATED}>{updated}</time>
            </p>
          </div>
        </header>

        <div className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <div className={READ}>
            <OfficeCostCalculator locale={locale} labels={copy.calculator} />
          </div>
        </div>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <div className={READ}>
            <ArticleSections sections={sections} />

            <aside className="mt-16 rounded-[24px] bg-brand/[0.07] p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{copy.fit.body}</p>
              <div className="mt-6">
                <Link href="/lobby" className={INK}>
                  {copy.fit.cta}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={emphasised(copy.faqTitle, locale, "text-muted-foreground/75")} />

      <Closing />
    </MarketingShell>
  );
}
