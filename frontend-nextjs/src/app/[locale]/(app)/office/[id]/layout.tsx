import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { officePath } from "@/lib/links";
import { OfficeShell } from "@/components/app/OfficeShell";

// Private to the office's members: nothing here belongs in a search index,
// and nothing about the office is said before someone signed in opens it.
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale, id } = await params;
  return pageMetadata({ locale, path: officePath(id), noindex: true });
}

type Props = { params: Promise<{ locale: string; id: string }>; children: React.ReactNode };

/** Everything about an office lives inside the shell: the rail, and the floor under it. */
export default async function OfficeLayout({ params, children }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale as Locale);
  // Keyed by the office, so moving to another one starts at its door.
  return (
    <OfficeShell key={id} officeId={id}>
      {children}
    </OfficeShell>
  );
}
