import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { SecretSantaPage } from "@/components/tools/SecretSantaPage";
import { SECRET_SANTA_PATH } from "@/lib/tools/catalog";
import { secretSantaIn } from "@/lib/tools/secret-santa";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const content = secretSantaIn(locale);
  if (!content) return {};
  return pageMetadata({ locale, path: SECRET_SANTA_PATH, ...content.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  const content = secretSantaIn(locale);
  if (!content) notFound();
  setRequestLocale(locale as Locale);
  return <SecretSantaPage locale={locale} content={content} />;
}
