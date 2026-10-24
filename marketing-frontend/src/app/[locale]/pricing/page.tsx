import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { absoluteUrl, faqNode, pageGraph } from "@/lib/structured-data";
import { PLANS } from "@/lib/plans";
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
  const tq = await getTranslations("pricingFaq");
  // The product with each plan as its own offer, so search engines read the prices off the pricing page itself.
  const app = {
    "@type": "WebApplication",
    "@id": `${absoluteUrl(locale, "/")}#app`,
    name: "TinyFloor",
    url: absoluteUrl(locale, "/"),
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Virtual office",
    operatingSystem: "Any",
    offers: PLANS.map((plan) => ({
      "@type": "Offer",
      name: plan.key === "free" ? "Free" : "Pro",
      price: String(plan.price),
      priceCurrency: "USD",
      url: absoluteUrl(locale, "/pricing"),
      ...(plan.price
        ? { priceSpecification: { "@type": "UnitPriceSpecification", price: String(plan.price), priceCurrency: "USD", unitCode: "MON", referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" } } }
        : {}),
    })),
  };
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale,
          path: "/pricing",
          name: t("title"),
          description: t("description"),
          mainEntity: `${absoluteUrl(locale, "/")}#app`,
          nodes: [app, faqNode(locale, "/pricing", tq.raw("items") as Array<{ q: string; a: string }>)],
        })}
      />
      <PricingPage />
    </>
  );
}
