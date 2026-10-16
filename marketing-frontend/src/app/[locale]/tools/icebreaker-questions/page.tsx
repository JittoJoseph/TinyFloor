import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { IcebreakersPage } from "@/components/tools/IcebreakersPage";
import { ICEBREAKERS_PATH, icebreakersIn } from "@/lib/tools/icebreakers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: ICEBREAKERS_PATH, ...icebreakersIn(locale as Locale).meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <IcebreakersPage locale={locale} content={icebreakersIn(locale as Locale)} />;
}
