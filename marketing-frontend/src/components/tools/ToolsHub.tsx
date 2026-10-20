import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { pageMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { emphasised } from "@/lib/words";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/JsonLd";
import { ArrowRight } from "@/components/ui/icons";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, LEAD, MarketingShell } from "@/components/home/Blocks";
import { OUT_OF_OFFICE_PATH, STANDUP_PATH, TOOLS_PATH, TWO_TRUTHS_PATH, WOULD_YOU_RATHER_PATH, toolsIn } from "@/lib/tools/catalog";
import { FEW_TOOL_NAMES, TOOLS_HUB } from "@/lib/tools/hub-copy";
import { ICEBREAKERS_PATH, icebreakersIn } from "@/lib/tools/icebreakers";
import { OFFICE_COSTS_PATH, officeCostsIn } from "@/lib/tools/office-costs";
import { TIME_ZONES_PATH, timeZonesIn } from "@/lib/tools/time-zones";
import { outOfOfficeIn } from "@/lib/tools/out-of-office";
import { standupIn } from "@/lib/tools/standup";
import { twoTruthsIn } from "@/lib/tools/two-truths";
import { wouldYouRatherIn } from "@/lib/tools/would-you-rather";

type Props = { params: Promise<{ locale: string }> };

export async function toolsMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: TOOLS_PATH, ...TOOLS_HUB[locale as Locale].meta });
}

/** What each tool's card says in this language: its short name, and its page's own description. */
async function cards(locale: Locale) {
  const t = await getTranslations({ locale, namespace: "home.footer" });
  const few = FEW_TOOL_NAMES[locale] ?? {};
  const described: Record<string, () => { name: string; description: string } | undefined> = {
    [ICEBREAKERS_PATH]: () => ({ name: t("icebreakers"), description: icebreakersIn(locale).meta.description }),
    [OFFICE_COSTS_PATH]: () => ({ name: t("officeCosts"), description: officeCostsIn(locale).meta.description }),
    [TIME_ZONES_PATH]: () => ({ name: t("timeZones"), description: timeZonesIn(locale).meta.description }),
    [STANDUP_PATH]: () => standupIn(locale) && { name: few[STANDUP_PATH], description: standupIn(locale)!.meta.description },
    [WOULD_YOU_RATHER_PATH]: () => wouldYouRatherIn(locale) && { name: few[WOULD_YOU_RATHER_PATH], description: wouldYouRatherIn(locale)!.meta.description },
    [TWO_TRUTHS_PATH]: () => twoTruthsIn(locale) && { name: few[TWO_TRUTHS_PATH], description: twoTruthsIn(locale)!.meta.description },
    [OUT_OF_OFFICE_PATH]: () => outOfOfficeIn(locale) && { name: few[OUT_OF_OFFICE_PATH], description: outOfOfficeIn(locale)!.meta.description },
  };
  return toolsIn(locale).flatMap((tool) => {
    const card = described[tool.path]?.();
    return card ? [{ path: tool.path, ...card }] : [];
  });
}

/** Every free tool written in this language, on one page, like the guides' index. */
export async function ToolsHub({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const copy = TOOLS_HUB[locale as Locale];
  const list = await cards(locale as Locale);

  return (
    <MarketingShell path={TOOLS_PATH}>
      <JsonLd schema={pageGraph({ locale, path: TOOLS_PATH, type: "CollectionPage", name: copy.meta.title, description: copy.meta.description })} />
      <section className={cn(COLUMN, "pb-24 pt-32 sm:pb-32 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <p className={cn(EYEBROW, "mb-6")}>{copy.label}</p>
          <h1
            className={cn(
              "max-w-[18ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px]",
              CJK_HEADLINE,
            )}
          >
            {emphasised(copy.title, locale, "text-foreground/55")}
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[34rem] text-balance")}>{copy.body}</p>
        </div>
        <ul className="mx-auto mt-14 grid max-w-[1040px] gap-3 sm:mt-20 md:grid-cols-2">
          {list.map((card) => (
            <li key={card.path}>
              <Link href={card.path} className="group flex h-full flex-col rounded-[24px] bg-muted/80 p-6 transition-colors hover:bg-muted sm:p-7">
                <span className="flex items-center justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
                  {card.name}
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                </span>
                <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{card.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Closing />
    </MarketingShell>
  );
}
