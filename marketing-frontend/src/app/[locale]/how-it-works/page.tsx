import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { JsonLd } from "@/components/JsonLd";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { faqNode, pageGraph } from "@/lib/structured-data";
import {
  HOW_IT_WORKS,
  HOW_IT_WORKS_DESCRIPTION,
  HOW_IT_WORKS_INTRO,
  HOW_IT_WORKS_PATH,
  HOW_IT_WORKS_TITLE,
  HOW_IT_WORKS_UPDATED,
} from "@/lib/how-it-works";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({ path: HOW_IT_WORKS_PATH, title: HOW_IT_WORKS_TITLE, description: HOW_IT_WORKS_DESCRIPTION });
}

/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const updated = new Date(`${HOW_IT_WORKS_UPDATED}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * How TinyFloor works (lib/how-it-works.ts), set like the legal pages: what a
 * team asks before running its day on it, answered with the numbers. Its
 * questions are FAQ markup too, since assistants and search engines read
 * them first.
 */
export default async function HowItWorksPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  const faq = HOW_IT_WORKS.flatMap((section) => section.faq ?? []);
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path: HOW_IT_WORKS_PATH,
          name: HOW_IT_WORKS_TITLE,
          description: HOW_IT_WORKS_DESCRIPTION,
          nodes: [faqNode("en", HOW_IT_WORKS_PATH, faq.map(({ q, a }) => ({ q, a: unlinked(a) })))],
        })}
      />
      <LegalPage
        path={HOW_IT_WORKS_PATH}
        title={HOW_IT_WORKS_TITLE}
        updated={updated}
        intro={<p>{HOW_IT_WORKS_INTRO}</p>}
        note={locale === "en" ? undefined : t("englishOnly")}
        sections={HOW_IT_WORKS.map((section) => ({
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
