import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, INK, LEAD, MarketingShell, Questions } from "@/components/home/Blocks";
import { ArticleSections, READ, numberItems } from "@/components/guides/ArticleSections";
import { ICEBREAKERS_PATH, ICEBREAKERS_UPDATED, type IcebreakersContent } from "@/lib/tools/icebreakers";
import { IcebreakerPicker } from "./IcebreakerPicker";

/**
 * The icebreaker questions tool (lib/tools/icebreakers): the picker up top,
 * then how to run one, every question by group, what makes a good one, and
 * where TinyFloor fits. Read in the guides' column, in the list's own language.
 */
export function IcebreakersPage({ locale, content: copy }: { locale: string; content: IcebreakersContent }) {
  const groups = copy.groups;
  const updated = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${ICEBREAKERS_UPDATED}T00:00:00Z`),
  );
  // The how-to's steps are numbered; the lists of questions carry their own numbers.
  const howTo = numberItems(copy.howTo);
  const rules = numberItems(copy.rules);
  const listed = howTo.length + 1;

  return (
    <MarketingShell path={ICEBREAKERS_PATH} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path: ICEBREAKERS_PATH,
          name: copy.meta.title,
          description: copy.meta.description,
          mainEntity: `${absoluteUrl(locale, ICEBREAKERS_PATH)}#article`,
          nodes: [
            articleNode({
              locale,
              path: ICEBREAKERS_PATH,
              headline: copy.meta.title,
              description: copy.meta.description,
              published: ICEBREAKERS_UPDATED,
              updated: ICEBREAKERS_UPDATED,
            }),
            faqNode(locale, ICEBREAKERS_PATH, copy.faq),
          ],
        })}
      />

      <article lang={locale}>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className={READ}>
            <p className={EYEBROW}>{copy.eyebrow}</p>
            <h1
              className={cn(
                "mt-6 text-balance text-[36px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, locale, "text-muted-foreground/75")}
            </h1>
            <p className={cn(LEAD, "mt-7")}>{copy.intro}</p>
            <p className="mt-7 text-[14px] text-muted-foreground">
              {copy.updated} <time dateTime={ICEBREAKERS_UPDATED}>{updated}</time>
            </p>
          </div>
        </header>

        <div className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <div className={READ}>
            <IcebreakerPicker
              groups={groups}
              labels={{ all: copy.picker.all, another: copy.picker.another, copy: copy.picker.copy, copied: copy.picker.copied }}
            />
          </div>
        </div>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <div className={READ}>
            <ArticleSections sections={howTo} />

            {groups.map((group, index) => (
              <section key={group.key} id={`section-${listed + index}`} className="scroll-mt-24 pt-16 sm:pt-20">
                <h2 className={cn("text-balance text-[27px] font-normal leading-[1.12] tracking-[-0.035em] sm:text-[34px]", CJK_HEADLINE)}>
                  {group.title}
                </h2>
                <p className="mt-5 text-pretty text-[17px] leading-[1.75] text-foreground/80">{group.when}</p>
                <ol className="mt-6 grid gap-x-8 gap-y-3 rounded-[20px] bg-muted/80 p-5 sm:p-6">
                  {group.questions.map((question, number) => (
                    <li key={question} className="flex gap-3 text-[16px] leading-[1.6] text-foreground/85">
                      <span className="w-6 shrink-0 text-end tabular-nums text-faint">{number + 1}</span>
                      {question}
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <ArticleSections sections={rules} first={listed + groups.length} />

            <aside className="mt-16 rounded-[24px] bg-brand/[0.07] p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{copy.fit.body}</p>
              <div className="mt-6">
                <Link href="/lobby" className={INK}>
                  {copy.fit.cta}
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={emphasised(copy.faqTitle, locale, "text-muted-foreground/75")} />

      <Closing />
    </MarketingShell>
  );
}
