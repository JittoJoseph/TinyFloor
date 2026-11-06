import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { JsonLd } from "web-shared/components/JsonLd";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { pageGraph } from "web-shared/lib/structured-data";
import { CHANGELOG, CHANGELOG_PATH, CHANGELOG_UPDATED, RELEASES } from "@/lib/changelog";
import { SOCIALS } from "web-shared/lib/site";

type Props = { params: Promise<{ locale: string }> };

const TITLE = "Changelog";
const DESCRIPTION = "What's changed in TinyFloor, by the day it went live: new features and fixes for people using an office, with how often it ships.";

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({ path: CHANGELOG_PATH, title: `${TITLE}: What's New in TinyFloor`, description: DESCRIPTION });
}

const day = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", { ...options, timeZone: "UTC" });

/**
 * What changed in TinyFloor (lib/changelog.ts), newest first, set like the
 * legal pages: each day it shipped something people would notice, and how
 * often it ships at all, so "is it still being worked on" has an answer.
 */
export default async function ChangelogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  const [latest, ...earlier] = RELEASES;
  return (
    <>
      <JsonLd schema={pageGraph({ locale: "en", path: CHANGELOG_PATH, name: TITLE, description: DESCRIPTION })} />
      <LegalPage
        path={CHANGELOG_PATH}
        title={TITLE}
        updated={day(CHANGELOG_UPDATED, { day: "numeric", month: "long", year: "numeric" })}
        intro={
          <p>
            TinyFloor ships to production almost every day: {earlier.map((one) => `${one.count} releases in ${one.month}`).join(" and ")},{" "}
            {latest.count} so far in {latest.month}. Here is what changed for people using it. Every change, small ones included, is public on{" "}
            <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        }
        note={locale === "en" ? undefined : t("englishOnly")}
        sections={CHANGELOG.map((entry) => ({
          id: entry.date,
          title: `${day(entry.date, { day: "numeric", month: "long", year: "numeric" })}: ${entry.title}`,
          body: (
            <ul>
              {entry.items.map((item) => (
                <li key={item}>
                  <Linked text={item} />
                </li>
              ))}
            </ul>
          ),
        }))}
      />
    </>
  );
}
