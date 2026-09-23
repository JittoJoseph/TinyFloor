import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { guestLinkPath } from "@/lib/links";
import { fetchPublic } from "@/lib/serverApi";
import { GuestLinkEntry, type GuestLinkPreview } from "@/components/entry/GuestLinkEntry";

type Props = { params: Promise<{ locale: string; token: string }> };

/** The link's room, looked up once per request for the page and its link preview. */
const preview = cache(async (token: string) => {
  const found = await fetchPublic<{ guestLink: GuestLinkPreview }>(`/guest-links/${encodeURIComponent(token)}`);
  return found?.guestLink ?? null;
});

// A guest link unfurls in chat apps with the room's name, but never shows up in search.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const [t, link] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "metadata" }),
    preview(token),
  ]);
  return pageMetadata({
    locale,
    path: guestLinkPath(token),
    title: link ? t("joinRoomTitle", { office: link.officeName }) : t("joinTitle"),
    description: link ? t("joinRoomDescription", { office: link.officeName }) : t("description"),
    imageAlt: t("ogAlt"),
    noindex: true,
  });
}

export default async function GuestLinkPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  return <GuestLinkEntry token={token} initialPreview={await preview(token)} />;
}
