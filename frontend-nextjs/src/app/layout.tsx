import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site";
import { VT323, Nunito } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ui/Toast";
import { ClarityAnalytics } from "@/components/ClarityAnalytics";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { localeDirection } from "@/lib/i18n/routing";
import { ogLocale } from "@/lib/seo";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "metadata" });
  const title = t("title");
  const description = t("description");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: "%s | SpatialMeet",
    },
    description,
    keywords: t("keywords").split(/\s*[,،、，]\s*/),
    authors: [{ name: "Jitto Joseph" }],
    creator: "Jitto Joseph",
    openGraph: {
      title,
      description,
      url: SITE_URL,
      siteName: "SpatialMeet",
      images: [
        {
          url: "/office.png",
          width: 1200,
          height: 800,
          alt: t("ogAlt"),
        },
      ],
      locale: ogLocale(locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/office.png"],
    },
    applicationName: "SpatialMeet",
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
    <html lang={locale} dir={localeDirection(locale)} className="scroll-smooth">
      <body className={`${vt323.variable} ${nunito.variable} antialiased`}>
        <JsonLd schema={siteGraph()} />
        <NextIntlClientProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        <GoogleAnalytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
