import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { AppTheme } from "@/components/app/AppTheme";
import { LocalTimeZone } from "@/components/LocalTimeZone";
import { AuthProvider } from "@/contexts/AuthContext";

/** What only the site's pages say, all of it put together on the server. */
const SITE_ONLY = new Set(["landings", "landing", "home", "faq", "about", "metadata", "notFound"]);

/**
 * Every signed-in screen, the doors and the lobby: the app's theme and face,
 * not the landing pages', and who is signed in (the site's pages never ask).
 * The first paint is themed by the root layout's script; AppTheme keeps it
 * right on client-side navigation. The app's screens say most of what they
 * say in the browser, so they get every message but the site's own pages'
 * (some 27KB of the 61KB); the site's pages above get only the few they use.
 * A provider made here carries the server's time zone, so the reader's own is
 * set again inside it.
 */
export default async function AppLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <NextIntlClientProvider messages={Object.fromEntries(Object.entries(await getMessages()).filter(([key]) => !SITE_ONLY.has(key)))}>
      <LocalTimeZone>
        <AuthProvider>
          <AppTheme>{children}</AppTheme>
        </AuthProvider>
      </LocalTimeZone>
    </NextIntlClientProvider>
  );
}
