import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Link } from "@/lib/i18n/navigation";
import { JsonLd } from "web-shared/components/JsonLd";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { HELP_LOCALES, HELP_PATH, HELP_TOPIC_ORDER, HELP_UPDATED, helpCopy, helpIn, helpPath } from "@/lib/help";
import { translatedMetadata, translatedPage } from "@/lib/translatedPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const copy = await helpCopy(locale);
  return translatedMetadata({ locale, locales: HELP_LOCALES, path: HELP_PATH, title: copy.title, description: copy.description });
}

const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

/** Every question in the help center (lib/help.ts), by topic, each linking to its own page. */
export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const copy = await helpCopy(locale);
  const articles = await helpIn(locale);
  const page = await translatedPage(locale, HELP_LOCALES, HELP_UPDATED);
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: page.language,
          path: HELP_PATH,
          name: copy.title,
          description: copy.description,
          nodes: [faqNode(page.language, HELP_PATH, articles.map(({ q, answer }) => ({ q, a: unlinked(answer) })))],
        })}
      />
      <LegalPage
        path={HELP_PATH}
        title={copy.title}
        updated={page.updated}
        updatedLine={page.updatedLine}
        lang={page.language}
        dir={page.dir}
        intro={<p>{copy.intro}</p>}
        note={page.note}
        sections={HELP_TOPIC_ORDER.map((topic) => ({
          id: topic,
          title: copy.topics[topic],
          body: (
            <ul>
              {articles
                .filter((article) => article.topic === topic)
                .map((article) => (
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
