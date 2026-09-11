import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { localeDirection, routing } from "@/lib/i18n/routing";
import { HtmlLangSync } from "@/components/HtmlLangSync";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // The provider sits inside the `[locale]` segment, not only in the root
  // layout, so it re-renders when the locale changes. The root layout does not
  // re-render on a client-side switch and would keep the old messages.
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSync lang={locale} dir={localeDirection(locale)} />
      {children}
    </NextIntlClientProvider>
  );
}
