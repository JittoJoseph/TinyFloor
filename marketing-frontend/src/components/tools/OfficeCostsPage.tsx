import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import type { GuideSection } from "@/lib/guides";
import {
  OFFICE_COSTS_PATH,
  OFFICE_COSTS_UPDATED,
  OFFICE_PRODUCTS,
  usd,
  type OfficeCostsContent,
} from "@/lib/tools/office-costs";
import { OfficeCostCalculator } from "./OfficeCostCalculator";
import { ToolPage } from "./ToolPage";

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
 * leaves out and how we checked.
 */
export function OfficeCostsPage({ locale, content: copy }: { locale: string; content: OfficeCostsContent }) {
  return (
    <ToolPage
      locale={locale}
      path={OFFICE_COSTS_PATH}
      updated={OFFICE_COSTS_UPDATED}
      copy={copy}
      tool={<OfficeCostCalculator locale={locale} labels={copy.calculator} />}
    >
      <ArticleSections sections={numberItems([...copy.sections, sizesTable(copy, locale), ...copy.after])} />
    </ToolPage>
  );
}
