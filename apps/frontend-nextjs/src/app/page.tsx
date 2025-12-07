import React from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full relative">
      <Navbar />

      <main className="container mx-auto px-4 pb-20 pt-24 md:pt-32 flex flex-col gap-20 md:gap-32 max-w-5xl">
        <Hero />
        <Features />
        <HowItWorks />
      </main>

      <Footer />
    </div>
  );
}
