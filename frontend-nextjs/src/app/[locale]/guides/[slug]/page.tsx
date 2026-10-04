import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { GUIDES, guideBySlug, guidePath } from "@/lib/guides";
import { GuidePage } from "@/components/guides/GuidePage";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  const t = await getTranslations({ locale: locale as Locale, namespace: "guides" });
  const tm = await getTranslations({ locale: locale as Locale, namespace: "metadata" });
  return pageMetadata({
    title: t(`pages.${guide.key}.meta.title`),
    description: t(`pages.${guide.key}.meta.description`),
    path: guidePath(guide),
    locale,
    imageAlt: tm("ogAlt"),
  });
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();
  setRequestLocale(locale as Locale);
  return <GuidePage guide={guide} locale={locale} />;
}
