import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SpatialMeet",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "A virtual office that looks like a game. Walk around, talk to coworkers, and feel like a team again.",
    url: "https://spatialmeet-app.vercel.app",
    image: "https://spatialmeet-app.vercel.app/office.png",
  };

  return (
    <div className="min-h-screen w-full relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="container mx-auto px-4 pb-12 pt-24 md:pt-32 flex flex-col gap-12 md:gap-16 max-w-5xl">
        <Hero />
        <HowItWorks />
        <Features />
      </main>

      <CTA />
      <Footer />
    </div>
  );
}
