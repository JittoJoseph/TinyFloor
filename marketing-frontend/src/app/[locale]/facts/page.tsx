import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { JsonLd } from "web-shared/components/JsonLd";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { FACTS_LOCALES, FACTS_PATH, FACTS_UPDATED, factsCopy } from "@/lib/facts";
import { translatedMetadata, translatedPage } from "@/lib/translatedPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const copy = await factsCopy(locale);
  return translatedMetadata({ locale, locales: FACTS_LOCALES, path: FACTS_PATH, title: copy.title, description: copy.description });
}

/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

/** The facts about TinyFloor (lib/facts.ts), set like How it works: one fact a line, dated, with its questions as FAQ markup. */
export default async function FactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const copy = await factsCopy(locale);
  const page = await translatedPage(locale, FACTS_LOCALES, FACTS_UPDATED);
  const faq = copy.sections.flatMap((section) => section.faq ?? []);
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: page.language,
          path: FACTS_PATH,
          name: copy.title,
          description: copy.description,
          nodes: [faqNode(page.language, FACTS_PATH, faq.map(({ q, a }) => ({ q, a: unlinked(a) })))],
        })}
      />
      <LegalPage
        path={FACTS_PATH}
        title={copy.title}
        updated={page.updated}
        updatedLine={page.updatedLine}
        lang={page.language}
        dir={page.dir}
        intro={<p>{copy.intro}</p>}
        note={page.note}
        sections={copy.sections.map((section) => ({
          id: section.id,
          title: section.title,
          body: (
            <>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>
                  <Linked text={paragraph} />
                </p>
              ))}
              {section.items && (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <Linked text={item} />
                    </li>
                  ))}
                </ul>
              )}
              {section.faq?.map(({ q, a }) => (
                <div key={q}>
                  <p>
                    <strong>{q}</strong>
                  </p>
                  <p className="!mt-1">
                    <Linked text={a} />
                  </p>
                </div>
              ))}
            </>
          ),
        }))}
      />
    </>
  );
}
