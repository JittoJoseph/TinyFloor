import { getTranslations } from "next-intl/server";
import { localizedMetadata } from "web-shared/lib/seo";
import { pageGraph } from "web-shared/lib/structured-data";
import { JsonLd } from "web-shared/components/JsonLd";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LobbyShell } from "@/components/app/LobbyShell";

export const generateMetadata = localizedMetadata({
  path: "/lobby",
  title: "lobbyTitle",
  description: "lobbyDescription",
});

/** The public lobby, in the same shell as an office: the floor, its chat, who is here. */
export default async function LobbyLayout({ params, children }: { params: Promise<{ locale: string }>; children: React.ReactNode }) {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "metadata" });
  return (
    <>
      <JsonLd schema={pageGraph({ locale, path: "/lobby", name: t("lobbyTitle"), description: t("lobbyDescription") })} />
      <LobbyShell>{children}</LobbyShell>
    </>
  );
}
