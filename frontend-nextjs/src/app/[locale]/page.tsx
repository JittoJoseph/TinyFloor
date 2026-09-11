import React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE_URL } from "@/lib/site";
import { localizedMetadata } from "@/lib/seo";
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

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SpatialMeet",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      url: SITE_URL,
      image: `${SITE_URL}/office.png`,
      inLanguage: locale,
      description: t("landing.description"),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: t.raw("landing.features") as string[],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: locale,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
  ];

  return (
    <div className="min-h-screen w-full relative">
      <link rel="preload" as="image" href="/office.png" fetchPriority="high" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
