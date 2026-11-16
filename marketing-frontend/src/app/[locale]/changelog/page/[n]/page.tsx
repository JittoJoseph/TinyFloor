import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { JsonLd } from "web-shared/components/JsonLd";
import { pageGraph } from "web-shared/lib/structured-data";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { CHANGELOG_DESCRIPTION, CHANGELOG_PATH, changelogListPath, changelogPageCount } from "@/lib/changelog";
import { MarketingShell } from "@/components/home/Blocks";
import { ChangelogList } from "@/components/changelog/ChangelogList";

type Props = { params: Promise<{ locale: string; n: string }> };

export const dynamicParams = false;

/** The older pages of the changelog, from 2; the first is /changelog itself. */
export function generateStaticParams() {
  return Array.from({ length: changelogPageCount() - 1 }, (_, index) => ({ n: String(index + 2) }));
}

const pageNumber = (n: string) => {
  const page = Number(n);
  return Number.isInteger(page) && page >= 2 && page <= changelogPageCount() ? page : null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = pageNumber((await params).n);
  if (!page) return {};
  return englishOnlyMetadata({
    path: changelogListPath(page),
    title: `Changelog, Page ${page}: What's New in TinyFloor`,
    description: CHANGELOG_DESCRIPTION,
  });
}

/** An older page of the changelog: the same list, further back (components/changelog/ChangelogList). */
export default async function ChangelogOlderPage({ params }: Props) {
  const { locale, n } = await params;
  const page = pageNumber(n);
  if (!page) notFound();
  setRequestLocale(locale as Locale);
  const path = changelogListPath(page);
  return (
    <MarketingShell path={path}>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path,
          type: "CollectionPage",
          name: `Changelog, page ${page}`,
          description: CHANGELOG_DESCRIPTION,
          parents: [{ name: "Changelog", path: CHANGELOG_PATH }],
        })}
      />
      <ChangelogList page={page} locale={locale} />
    </MarketingShell>
  );
}
