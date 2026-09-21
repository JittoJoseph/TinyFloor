import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { OfficeShell } from "@/components/app/OfficeShell";

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
