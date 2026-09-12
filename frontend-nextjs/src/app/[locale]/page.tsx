import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localizedMetadata } from "@/lib/seo";
import { appNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import type { Locale } from "@/lib/i18n/routing";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { RoomMoments } from "@/components/landing/RoomMoments";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

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
    t.raw("landing.features") as string[],
  );

  return (
    <div className="min-h-screen w-full relative">
      <link rel="preload" as="image" href="/office.png" fetchPriority="high" />
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
      <Navbar />

      <main className="pt-24 md:pt-32">
        <Hero />
        <RoomMoments />
        <FAQ />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
