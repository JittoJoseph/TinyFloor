import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { GUIDES, GUIDES_PATH } from "@/lib/guides";
import { pageMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { emphasised } from "@/lib/words";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/JsonLd";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, LEAD, MarketingShell } from "@/components/home/Blocks";
import { GuideCard } from "./GuidePage";

type Props = { params: Promise<{ locale: string }> };

export async function guidesMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "guides.hub" });
  return pageMetadata({ locale, path: GUIDES_PATH, title: t("meta.title"), description: t("meta.description") });
}

/** Every guide on one page, the way the other indexes list their pages (docs/18). */
export async function GuidesHub({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("guides");

  return (
    <MarketingShell path={GUIDES_PATH}>
      <JsonLd
        schema={pageGraph({ locale, path: GUIDES_PATH, type: "CollectionPage", name: t("hub.meta.title"), description: t("hub.meta.description") })}
      />
      <section className={cn(COLUMN, "pb-24 pt-32 sm:pb-32 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <p className={cn(EYEBROW, "mb-6")}>{t("label")}</p>
          <h1
            className={cn(
              "max-w-[18ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px]",
              CJK_HEADLINE,
            )}
          >
            {emphasised(t.raw("hub.title") as string, locale, "text-foreground/55")}
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[34rem] text-balance")}>{t("hub.body")}</p>
        </div>
        <ul className="mx-auto mt-14 grid max-w-[1040px] gap-3 sm:mt-20 md:grid-cols-2">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <GuideCard guide={guide} title={t(`pages.${guide.key}.label`)} description={t(`pages.${guide.key}.meta.description`)} />
            </li>
          ))}
        </ul>
      </section>
      <Closing />
    </MarketingShell>
  );
}
