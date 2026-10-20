import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { OutOfOfficePage } from "@/components/tools/OutOfOfficePage";
import { FEW, OUT_OF_OFFICE_PATH } from "@/lib/tools/catalog";
import { outOfOfficeIn } from "@/lib/tools/out-of-office";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = outOfOfficeIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: OUT_OF_OFFICE_PATH, locales: FEW, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = outOfOfficeIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <OutOfOfficePage locale={locale} content={content} />;
}
