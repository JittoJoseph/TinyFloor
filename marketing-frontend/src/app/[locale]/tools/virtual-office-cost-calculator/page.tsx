import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { OfficeCostsPage } from "@/components/tools/OfficeCostsPage";
import { OFFICE_COSTS_PATH, officeCostsIn } from "@/lib/tools/office-costs";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: OFFICE_COSTS_PATH, ...officeCostsIn(locale as Locale).meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <OfficeCostsPage locale={locale} content={officeCostsIn(locale as Locale)} />;
}
