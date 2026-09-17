import type { Metadata } from "next";
import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { invitePath } from "@/lib/links";
import { fetchPublic } from "@/lib/serverApi";
import { InviteEntry, type InvitePreview } from "@/components/workspace/InviteEntry";

type Props = { params: Promise<{ locale: string; token: string }> };

const preview = cache(async (token: string) => {
  const found = await fetchPublic<{ invite: InvitePreview }>(`/invites/${encodeURIComponent(token)}`);
  return found?.invite ?? null;
});

// An invite unfurls in chat apps with the workspace's name, but never shows up in search.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const [t, invite] = await Promise.all([
    getTranslations({ locale: locale as Locale, namespace: "metadata" }),
    preview(token),
  ]);
  return pageMetadata({
    locale,
    path: invitePath(token),
    title: invite ? t("inviteTitle", { workspace: invite.workspaceName }) : t("inviteFallbackTitle"),
    description: invite
      ? t("inviteDescription", { workspace: invite.workspaceName, name: invite.invitedBy })
      : t("description"),
    noindex: true,
  });
}

export default async function InvitePage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale as Locale);
  return <InviteEntry token={token} initialPreview={await preview(token)} />;
}
