import React from "react";
import { SITE_URL } from "@/lib/site";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { RoomMoments } from "@/components/landing/RoomMoments";
import { FAQ } from "@/components/landing/FAQ";
import { faqs } from "@/components/landing/faqs";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

const description =
  "A virtual office that looks like a game. Walk around a pixel-art floor with your team and start a video call just by standing next to someone.";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SpatialMeet",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web browser",
    url: SITE_URL,
    image: `${SITE_URL}/office.png`,
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Proximity video and voice calls",
      "Walkable 2D office map",
      "Pixel-art avatars",
      "Real-time presence and status",
      "Room chat",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  },
];

export default function LandingPage() {
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
