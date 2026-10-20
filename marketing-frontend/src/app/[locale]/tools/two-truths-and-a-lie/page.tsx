import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { QuestionListPage } from "@/components/tools/QuestionListPage";
import { TWO_TRUTHS_PATH } from "@/lib/tools/catalog";
import { TWO_TRUTHS_UPDATED, twoTruthsIn } from "@/lib/tools/two-truths";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = twoTruthsIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: TWO_TRUTHS_PATH, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = twoTruthsIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <QuestionListPage locale={locale} path={TWO_TRUTHS_PATH} updated={TWO_TRUTHS_UPDATED} content={content} />;
}
