import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { pageMetadata } from "web-shared/lib/seo";
import { TimeZonesPage } from "@/components/tools/TimeZonesPage";
import { TIME_ZONES_PATH, timeZonesIn } from "@/lib/tools/time-zones";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: TIME_ZONES_PATH, ...timeZonesIn(locale as Locale).meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <TimeZonesPage locale={locale} content={timeZonesIn(locale as Locale)} />;
}
