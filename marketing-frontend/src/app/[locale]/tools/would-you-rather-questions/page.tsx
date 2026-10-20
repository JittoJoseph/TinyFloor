import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { QuestionListPage } from "@/components/tools/QuestionListPage";
import { FEW, WOULD_YOU_RATHER_PATH } from "@/lib/tools/catalog";
import { WOULD_YOU_RATHER_UPDATED, wouldYouRatherIn } from "@/lib/tools/would-you-rather";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = wouldYouRatherIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: WOULD_YOU_RATHER_PATH, locales: FEW, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = wouldYouRatherIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <QuestionListPage locale={locale} path={WOULD_YOU_RATHER_PATH} updated={WOULD_YOU_RATHER_UPDATED} content={content} />;
}
