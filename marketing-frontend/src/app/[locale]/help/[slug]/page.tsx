import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { Link } from "@/lib/i18n/navigation";
import { JsonLd } from "web-shared/components/JsonLd";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { HELP, HELP_PATH, HELP_UPDATED, helpBySlug, helpPath } from "@/lib/help";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return HELP.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = helpBySlug(slug);
  if (!article) return {};
  return englishOnlyMetadata({ path: helpPath(article), title: article.q, description: unlinked(article.answer) });
}

/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const updated = new Date(`${HELP_UPDATED}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * One question about TinyFloor (lib/help.ts), set like How it works: the
 * question as the title, the answer first, then the details and the questions
 * to read next. The answer is the page's FAQ markup too.
 */
export default async function HelpArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const article = helpBySlug(slug);
  if (!article) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  const related = article.related.map(helpBySlug).filter((one) => !!one);
  const details = [...(article.paragraphs ?? []), ...(article.items ?? [])].length > 0;
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path: helpPath(article),
          name: article.q,
          description: unlinked(article.answer),
          nodes: [faqNode("en", helpPath(article), [{ q: article.q, a: unlinked([article.answer, ...(article.paragraphs ?? []), ...(article.items ?? [])].join(" ")) }])],
        })}
      />
      <LegalPage
        path={helpPath(article)}
        title={article.q}
        updated={updated}
        intro={
          <p>
            <Linked text={article.answer} />
          </p>
        }
        note={locale === "en" ? undefined : t("englishOnly")}
        sections={[
          ...(details
            ? [
                {
                  id: "details",
                  title: "Details",
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
            title: "Related questions",
            body: (
              <ul>
                {related.map((one) => (
                  <li key={one.slug}>
                    <Link href={helpPath(one)}>{one.q}</Link>
                  </li>
                ))}
                <li>
                  <Link href={HELP_PATH}>All questions</Link>
                </li>
              </ul>
            ),
          },
        ]}
      />
    </>
  );
}
