import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { PricingPage } from "@/components/home/PricingPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "pricingPage.meta" });
  return pageMetadata({ locale, path: "/pricing", title: t("title"), description: t("description") });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("pricingPage.meta");
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale,
          path: "/pricing",
          name: t("title"),
          description: t("description"),
          mainEntity: `${absoluteUrl(locale, "/")}#app`,
        })}
      />
      <PricingPage />
    </>
  );
}
