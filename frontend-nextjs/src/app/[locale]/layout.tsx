import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { localeDirection, routing, type Locale } from "@/lib/i18n/routing";
import { SITE_URL, X_HANDLE } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { ogLocale, socialImage } from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";
import { ClarityAnalytics } from "@/components/ClarityAnalytics";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { JsonLd } from "@/components/JsonLd";
import { fontVariables } from "../fonts";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

/** The messages the browser needs on every page: none of the site's own scripts read any beyond these. */
const SHARED = ["common", "languageSwitcher"];

function pick(messages: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(keys.filter((key) => key in messages).map((key) => [key, messages[key]]));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "metadata" });
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

/**
 * The document for every page: its language from the URL, so each page is
 * rendered once when the site is built and then served as a file (see the
 * root layout for why it lives here).
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  // Only what every page's own scripts read. The site's pages are put
  // together on the server, which has every message; the app screens get the
  // rest from (app)/layout. The whole set is some 50KB a page otherwise.
  const messages = pick(await getMessages(), SHARED);

  return (
    // The app routes set their theme on <html> before React loads (lib/theme-script.ts).
    <html lang={locale} dir={localeDirection(locale)} className="scroll-smooth" suppressHydrationWarning>
      <body className={`${fontVariables} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <JsonLd schema={siteGraph()} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <GoogleAnalytics />
        <ClarityAnalytics />
      </body>
    </html>
  );
}
