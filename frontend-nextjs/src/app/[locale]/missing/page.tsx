import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import LocaleNotFound from "../not-found";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "notFound" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The 404 page, built once per language. The middleware sends every address
 * that isn't one of the site's routes here with a 404, so a missing page is a
 * file served as is rather than a page put together for each stray request.
 */
export default async function MissingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <LocaleNotFound />;
}
