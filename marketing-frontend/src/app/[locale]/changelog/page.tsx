import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { JsonLd } from "web-shared/components/JsonLd";
import { pageGraph } from "web-shared/lib/structured-data";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { CHANGELOG, CHANGELOG_DESCRIPTION, CHANGELOG_FEED, CHANGELOG_PATH, changelogCard } from "@/lib/changelog";
import { MarketingShell } from "@/components/home/Blocks";
import { ChangelogList } from "@/components/changelog/ChangelogList";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const metadata = englishOnlyMetadata({
    path: CHANGELOG_PATH,
    title: "Changelog: What's New in TinyFloor",
    description: CHANGELOG_DESCRIPTION,
    image: changelogCard(CHANGELOG.find((entry) => entry.image)!) ?? undefined,
  });
  // The feed, where readers and feed finders look for it.
  return { ...metadata, alternates: { ...metadata.alternates, types: { "application/rss+xml": [{ url: CHANGELOG_FEED, title: "TinyFloor Changelog" }] } } };
}

/** What changed in TinyFloor (lib/changelog.ts): the newest changes, and the way to older ones (components/changelog/ChangelogList). */
export default async function ChangelogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <MarketingShell path={CHANGELOG_PATH}>
      <JsonLd schema={pageGraph({ locale: "en", path: CHANGELOG_PATH, type: "CollectionPage", name: "Changelog", description: CHANGELOG_DESCRIPTION })} />
      <ChangelogList page={1} locale={locale} />
    </MarketingShell>
  );
}
