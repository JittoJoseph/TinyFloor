import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { Link } from "@/lib/i18n/navigation";
import { JsonLd } from "web-shared/components/JsonLd";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { HELP_PAGES } from "@/lib/help-pages";
import { HELP_LOCALES, HELP_PATH, HELP_UPDATED, helpBySlug, helpCopy, helpIn, helpPath } from "@/lib/help";
import { translatedMetadata, translatedPage } from "@/lib/translatedPage";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return HELP_PAGES.map(({ slug }) => ({ slug }));
}

/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!helpBySlug(slug)) return {};
  const answer = (await helpCopy(locale)).articles[slug];
  return translatedMetadata({ locale, locales: HELP_LOCALES, path: `${HELP_PATH}/${slug}`, title: answer.q, description: unlinked(answer.answer) });
}

/**
 * One question about TinyFloor (lib/help.ts), set like How it works: the
 * question as the title, the answer first, then the details and the questions
 * to read next. The answer is the page's FAQ markup too.
 */
export default async function HelpArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  if (!helpBySlug(slug)) notFound();
  setRequestLocale(locale as Locale);
  const copy = await helpCopy(locale);
  const articles = await helpIn(locale);
  const article = articles.find((one) => one.slug === slug);
  if (!article) notFound();
  const related = article.related.map((one) => articles.find((other) => other.slug === one)).filter((one) => !!one);
  const page = await translatedPage(locale, HELP_LOCALES, HELP_UPDATED);
  const details = [...(article.paragraphs ?? []), ...(article.items ?? [])];
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: page.language,
          path: helpPath(article),
          name: article.q,
          description: unlinked(article.answer),
          nodes: [faqNode(page.language, helpPath(article), [{ q: article.q, a: unlinked([article.answer, ...details].join(" ")) }])],
        })}
      />
      <LegalPage
        path={helpPath(article)}
        title={article.q}
        updated={page.updated}
        updatedLine={page.updatedLine}
        lang={page.language}
        dir={page.dir}
        intro={
          <p>
            <Linked text={article.answer} />
          </p>
        }
        note={page.note}
        sections={[
          ...(details.length
            ? [
                {
                  id: "details",
                  title: copy.details,
                  body: (
                    <>
                      {article.paragraphs?.map((paragraph) => (
                        <p key={paragraph}>
                          <Linked text={paragraph} />
                        </p>
                      ))}
                      {article.items && (
                        <ul>
                          {article.items.map((item) => (
                            <li key={item}>
                              <Linked text={item} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ),
                },
              ]
            : []),
          {
            id: "related",
            title: copy.related,
            body: (
              <ul>
                {related.map((one) => (
                  <li key={one.slug}>
                    <Link href={helpPath(one)}>{one.q}</Link>
                  </li>
                ))}
                <li>
                  <Link href={HELP_PATH}>{copy.all}</Link>
                </li>
              </ul>
            ),
          },
        ]}
      />
    </>
  );
}
