import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL, X_HANDLE } from "@/lib/site";
import { VT323, Nunito, Caveat, Geist } from "next/font/google";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClarityAnalytics } from "@/components/ClarityAnalytics";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { localeDirection } from "@/lib/i18n/routing";
import { ogLocale, socialImage } from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";

const vt323 = VT323({
  variable: "--font-pixel",
  subsets: ["latin"],
  weight: "400",
});

const nunito = Nunito({
  variable: "--font-body",
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "600", "700", "800"],
});

// The app's face (docs/06-app-design.md). Not preloaded: only the app routes
// use it, so the landing pages never download it.
const geist = Geist({
  variable: "--font-app",
  subsets: ["latin", "latin-ext", "cyrillic"],
  preload: false,
});

// The handwriting on the landing page's notes and arrows.
const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s | TinyFloor",
    },
    description,
    keywords: t("keywords").split(/\s*[,،、，]\s*/),
    authors: [{ name: "Jitto Joseph" }],
    creator: "Jitto Joseph",
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: "TinyFloor",
      images: [
        {
          url: socialImage(locale, "/"),
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: t("ogAlt"),
        },
      ],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      site: X_HANDLE,
      card: "summary_large_image",
      title,
      description,
      images: [{ url: socialImage(locale, "/"), alt: t("ogAlt") }],
    },
    applicationName: "TinyFloor",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    // The app routes set their theme on <html> before React loads (lib/theme-script.ts).
    <html
      lang={locale}
      dir={localeDirection(locale)}
      className="scroll-smooth"
      suppressHydrationWarning
    >
      <body
        className={`${vt323.variable} ${nunito.variable} ${caveat.variable} ${geist.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <JsonLd schema={siteGraph()} />
        <NextIntlClientProvider>
          <AuthProvider>{children}</AuthProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
