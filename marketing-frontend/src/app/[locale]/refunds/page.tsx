import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { REFUNDS_UPDATED, refundsSections, refundsIntro } from "@/components/legal/refunds";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({
    path: "/refunds",
    title: "Refund Policy",
    description: "How cancelling and refunds work for TinyFloor's paid plans: cancel any time, and a full refund within 14 days of any payment.",
  });
}

export default async function RefundsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage
      path="/refunds"
      title="Refund Policy"
      updated={REFUNDS_UPDATED}
      intro={refundsIntro}
      sections={refundsSections}
      note={locale === "en" ? undefined : t("englishOnly")}
    />
  );
}
