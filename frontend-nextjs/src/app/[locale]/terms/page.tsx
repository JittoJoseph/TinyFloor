import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalMetadata } from "@/components/legal/legalMetadata";
import { TERMS_UPDATED, termsSections, termsSummary } from "@/components/legal/terms";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata({
    path: "/terms",
    title: "Terms of Service",
    description: "The terms for using TinyFloor: accounts and guests, offices, acceptable use, your content, and the law that applies.",
  });
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage
      path="/terms"
      title="Terms of Service"
      updated={TERMS_UPDATED}
      summary={termsSummary}
      sections={termsSections}
      note={locale === "en" ? undefined : t("englishOnly")}
    />
  );
}
