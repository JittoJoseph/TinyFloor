import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { someLanguagesMetadata } from "@/lib/someLanguagesMetadata";
import { IcebreakersPage } from "@/components/tools/IcebreakersPage";
import { ICEBREAKER_LOCALES, ICEBREAKERS_PATH, icebreakersIn } from "@/lib/tools/icebreakers";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const own = icebreakersIn(locale);
  if (!own) return englishOnlyMetadata({ path: ICEBREAKERS_PATH, ...icebreakersIn("en")!.meta });
  return someLanguagesMetadata({ locale, locales: ICEBREAKER_LOCALES, path: ICEBREAKERS_PATH, ...own.meta });
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const own = icebreakersIn(locale);
  if (own) return <IcebreakersPage locale={locale} content={own} />;
  // A language without its own list shows the English one, marked as English.
  const t = await getTranslations("legal");
  return <IcebreakersPage locale="en" content={icebreakersIn("en")!} note={t("englishOnly")} />;
}
