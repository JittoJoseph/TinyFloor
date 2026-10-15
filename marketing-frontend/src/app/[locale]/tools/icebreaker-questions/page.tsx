import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { IcebreakersPage } from "@/components/tools/IcebreakersPage";
import { ICEBREAKERS_COPY, ICEBREAKERS_PATH } from "@/lib/tools/icebreakers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({ path: ICEBREAKERS_PATH, ...ICEBREAKERS_COPY.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  return <IcebreakersPage locale={locale} note={locale === "en" ? undefined : t("englishOnly")} />;
}
