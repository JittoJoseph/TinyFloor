import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Link } from "@/lib/i18n/navigation";
import { JsonLd } from "web-shared/components/JsonLd";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { HELP, HELP_DESCRIPTION, HELP_INTRO, HELP_PATH, HELP_TITLE, HELP_TOPICS, HELP_UPDATED, helpPath, type HelpTopic } from "@/lib/help";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({ path: HELP_PATH, title: HELP_TITLE, description: HELP_DESCRIPTION });
}

const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const updated = new Date(`${HELP_UPDATED}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Every question in the help center (lib/help.ts), by topic, each linking to its own page. */
export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path: HELP_PATH,
          name: HELP_TITLE,
          description: HELP_DESCRIPTION,
          nodes: [faqNode("en", HELP_PATH, HELP.map(({ q, answer }) => ({ q, a: unlinked(answer) })))],
        })}
      />
      <LegalPage
        path={HELP_PATH}
        title={HELP_TITLE}
        updated={updated}
        intro={<p>{HELP_INTRO}</p>}
        note={locale === "en" ? undefined : t("englishOnly")}
        sections={(Object.keys(HELP_TOPICS) as HelpTopic[]).map((topic) => ({
          id: topic,
          title: HELP_TOPICS[topic],
          body: (
            <ul>
              {HELP.filter((article) => article.topic === topic).map((article) => (
                <li key={article.slug}>
                  <Link href={helpPath(article)}>{article.q}</Link>
                </li>
              ))}
            </ul>
          ),
        }))}
      />
    </>
  );
}
