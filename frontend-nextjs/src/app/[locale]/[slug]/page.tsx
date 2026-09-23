import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { LANDINGS, landingBySlug } from "@/lib/landings";
import { LandingPage } from "@/components/landing/LandingPage";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return LANDINGS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = landingBySlug(slug);
  if (!page) return {};

  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "landings",
  });
  const tm = await getTranslations({ locale: locale as Locale, namespace: "metadata" });
  return pageMetadata({
    title: t(`pages.${page.key}.meta.title`),
    description: t(`pages.${page.key}.meta.description`),
    path: `/${slug}`,
    locale,
    imageAlt: tm("ogAlt"),
  });
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  const page = landingBySlug(slug);
  if (!page) notFound();

  setRequestLocale(locale as Locale);
  return <LandingPage page={page} locale={locale} />;
}
