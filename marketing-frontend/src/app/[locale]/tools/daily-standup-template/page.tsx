import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { StandupPage } from "@/components/tools/StandupPage";
import { STANDUP_PATH } from "@/lib/tools/catalog";
import { standupIn } from "@/lib/tools/standup";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = standupIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: STANDUP_PATH, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = standupIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <StandupPage locale={locale} content={content} />;
}
