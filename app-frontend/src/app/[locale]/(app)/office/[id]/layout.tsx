import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { OfficeShell } from "@/components/app/OfficeShell";

// Private to the office's members: nothing here belongs in a search index or
// a link preview, and nothing about the office is said before someone signed
// in opens it.
export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * One office page is built, for an office called `_`, and it is every office:
 * the front door (cf-worker.mjs) hands it out for any office's address, and
 * the shell reads which office from the address in the browser.
 */
export function generateStaticParams() {
  return [{ id: "_" }];
}

/** Everything about an office lives inside the shell: the rail, and the floor under it. */
export default async function OfficeLayout({ params, children }: { params: Promise<{ locale: string }>; children: React.ReactNode }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <OfficeShell>{children}</OfficeShell>;
}
