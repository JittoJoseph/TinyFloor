import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { LegalPage } from "@/components/legal/LegalPage";
import { Linked } from "@/components/legal/Linked";
import { JsonLd } from "web-shared/components/JsonLd";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { faqNode, pageGraph } from "web-shared/lib/structured-data";
import { FACTS, FACTS_DESCRIPTION, FACTS_INTRO, FACTS_PATH, FACTS_TITLE, FACTS_UPDATED } from "@/lib/facts";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return englishOnlyMetadata({ path: FACTS_PATH, title: FACTS_TITLE, description: FACTS_DESCRIPTION });
}

/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const updated = new Date(`${FACTS_UPDATED}T00:00:00Z`).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The facts about TinyFloor (lib/facts.ts), set like How it works: one fact a line, dated, with its questions as FAQ markup. */
export default async function FactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  const faq = FACTS.flatMap((section) => section.faq ?? []);
  return (
    <>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path: FACTS_PATH,
          name: FACTS_TITLE,
          description: FACTS_DESCRIPTION,
          nodes: [faqNode("en", FACTS_PATH, faq.map(({ q, a }) => ({ q, a: unlinked(a) })))],
        })}
      />
      <LegalPage
        path={FACTS_PATH}
        title={FACTS_TITLE}
        updated={updated}
        intro={<p>{FACTS_INTRO}</p>}
        note={locale === "en" ? undefined : t("englishOnly")}
        sections={FACTS.map((section) => ({
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
