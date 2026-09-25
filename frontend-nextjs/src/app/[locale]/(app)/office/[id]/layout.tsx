import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { officePath } from "@/lib/links";
import { fetchPublic } from "@/lib/serverApi";
import { OfficeShell } from "@/components/app/OfficeShell";

// Private to the office's members, so nothing here belongs in a search index;
// a link to it pasted in a chat unfurls with the office's name on the
// invitation card. Everything else about the office loads in the browser.
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale, id } = await params;
  const [t, card] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "metadata" }),
    fetchPublic<{ office: { name: string } }>(`/offices/${encodeURIComponent(id)}/card`),
  ]);
  const office = card?.office.name;
  return pageMetadata({
    locale,
    path: officePath(id),
    ...(office ? { title: t("officeTitle", { office }), description: t("officeDescription", { office }) } : {}),
    imageAlt: t("ogAlt"),
    noindex: true,
  });
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
