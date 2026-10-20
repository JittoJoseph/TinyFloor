import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { QuestionListPage } from "@/components/tools/QuestionListPage";
import { FEW, TEAM_BUILDING_PATH } from "@/lib/tools/catalog";
import { TEAM_BUILDING_UPDATED, teamBuildingIn } from "@/lib/tools/team-building";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = teamBuildingIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: TEAM_BUILDING_PATH, locales: FEW, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = teamBuildingIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <QuestionListPage locale={locale} path={TEAM_BUILDING_PATH} updated={TEAM_BUILDING_UPDATED} content={content} />;
}
