import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { legalMetadata } from "@/components/legal/legalMetadata";
import { PRIVACY_UPDATED, privacySections, privacySummary } from "@/components/legal/privacy";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata({
    path: "/privacy",
    title: "Privacy Policy",
    description: "What TinyFloor collects, why, who it is shared with, how long it is kept, and how to get a copy or have it deleted.",
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage
      path="/privacy"
      title="Privacy Policy"
      updated={PRIVACY_UPDATED}
      summary={privacySummary}
      sections={privacySections}
      note={locale === "en" ? undefined : t("englishOnly")}
    />
  );
}
