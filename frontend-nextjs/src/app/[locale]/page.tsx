import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/seo";
import { MORE_FEATURES, appNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import type { Locale } from "@/lib/i18n/routing";
import { HomePage } from "@/components/home/HomePage";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = localizedMetadata({
  path: "/",
  description: "description",
  socialTitle: "title",
});

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations();
  const faqs = t.raw("faq.items") as Array<{ q: string; a: string }>;
  const app = appNode(
    locale,
    t("landing.description"),
    [...(t.raw("landing.features") as string[]), ...MORE_FEATURES.map((key) => t(`home.more.items.${key}.title`))],
  );

  return (
    <>
      <link rel="preload" as="image" href="/floor.webp" type="image/webp" fetchPriority="high" />
      <JsonLd
        schema={pageGraph({
          locale,
          path: "/",
          name: t("metadata.title"),
          description: t("metadata.description"),
          crumb: false,
          mainEntity: app["@id"] as string,
          nodes: [app, faqNode(locale, "/", faqs)],
        })}
      />
      <HomePage faqs={faqs} />
    </>
  );
}
