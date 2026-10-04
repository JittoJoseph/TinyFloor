import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { GUIDES, GUIDES_PATH, guidePath, readingMinutes, type Guide, type GuideCopy } from "@/lib/guides";
import { landingByKey } from "@/lib/landings";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, H2, INK, LEAD, MarketingShell, Questions, quiet } from "@/components/home/Blocks";

/** The column a guide is read in: narrow enough for long lines of text to stay easy. */
const READ = "mx-auto w-full max-w-[44rem]";

const dateIn = (locale: string, date: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * One guide (docs/18): a headline, who wrote it and when, a list of its
 * sections, then the sections themselves, read in one narrow column. Steps
 * and activities are numbered through the whole guide, so "20 activities"
 * counts to 20. Where TinyFloor fits comes last, said once and plainly, then
 * the questions and the other guides.
 */
export async function GuidePage({ guide, locale }: { guide: Guide; locale: string }) {
  const t = await getTranslations("guides");
  const tl = await getTranslations("landings");
  const copy = t.raw(`pages.${guide.key}` as Parameters<typeof t.raw>[0]) as GuideCopy;
  const path = guidePath(guide);
  const minutes = readingMinutes(copy, locale);

  // Numbered items (those with a detail line, like an activity) count on across sections.
  let number = 0;
  const sections = copy.sections.map((section) => ({
    ...section,
    items: section.items?.map((item) => ({ ...item, number: item.detail ? ++number : 0 })),
  }));

  return (
    <MarketingShell path={path} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          name: copy.meta.title,
          description: copy.meta.description,
          parents: [{ name: t("label"), path: GUIDES_PATH }],
          mainEntity: `${absoluteUrl(locale, path)}#article`,
          nodes: [
            articleNode({ locale, path, headline: copy.meta.title, description: copy.meta.description, published: guide.published, updated: guide.updated }),
            faqNode(locale, path, copy.faq),
          ],
        })}
      />

      <article>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className={READ}>
            <Link
              href={GUIDES_PATH}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-faint transition-colors hover:text-foreground"
            >
              {t("label")}
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </Link>
            <h1
              className={cn(
                "mt-6 text-balance text-[36px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, locale, "text-muted-foreground/75")}
            </h1>
            <p className={cn(LEAD, "mt-7")}>{copy.intro}</p>
            <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted-foreground">
              <span>{t("by", { name: "Jitto Joseph" })}</span>
              <span aria-hidden>·</span>
              <span>{t("minutes", { count: minutes })}</span>
              <span aria-hidden>·</span>
              <time dateTime={guide.updated}>{t("updated", { date: dateIn(locale, guide.updated) })}</time>
            </p>
          </div>
        </header>

        <nav aria-label={t("contents")} className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <div className={cn(READ, "rounded-[22px] bg-muted/80 p-6 sm:p-7")}>
            <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">{t("contents")}</p>
            <ol className="mt-4 grid gap-2.5 text-[15px]">
              {sections.map((section, index) => (
                <li key={section.title} className="flex gap-3">
                  <span className="w-5 shrink-0 tabular-nums text-faint">{index + 1}</span>
                  <a href={`#section-${index + 1}`} className="text-foreground/85 transition-colors hover:text-foreground hover:underline hover:underline-offset-4">
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <div className={READ}>
            {sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-24 pt-16 sm:pt-20">
                <h2 className={cn("text-balance text-[27px] font-normal leading-[1.12] tracking-[-0.035em] sm:text-[34px]", CJK_HEADLINE)}>{section.title}</h2>
                {section.body?.map((paragraph) => (
                  <p key={paragraph} className="mt-5 text-pretty text-[17px] leading-[1.75] text-foreground/80">
                    {paragraph}
                  </p>
                ))}
                {section.items && section.items.some((item) => item.number) ? (
                  <ol className="mt-8 grid gap-3">
                    {section.items.map((item) => (
                      <li key={item.title} className="rounded-[20px] bg-muted/80 p-5 sm:p-6">
                        <div className="flex items-baseline gap-3">
                          <span className="shrink-0 text-[15px] font-semibold tabular-nums text-brand">{item.number}.</span>
                          <div className="min-w-0">
                            <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                            {item.detail && <p className="mt-1 text-[13px] text-faint">{item.detail}</p>}
                            <p className="mt-2.5 text-[15.5px] leading-[1.65] text-muted-foreground">{item.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  section.items && (
                    <ul className="mt-6 grid gap-4">
                      {section.items.map((item) => (
                        <li key={item.title} className="relative ps-6 text-[17px] leading-[1.7] text-foreground/80">
                          <span aria-hidden className="absolute start-0 top-[0.7em] size-1.5 rounded-full bg-brand" />
                          <strong className="font-semibold text-foreground">{item.title}.</strong> {item.body}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </section>
            ))}

            <aside className="mt-16 rounded-[24px] bg-brand/[0.07] p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{copy.fit.body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link href="/lobby" className={INK}>
                  {t("fitCta")}
                </Link>
                {guide.pages.map((key) => (
                  <Link
                    key={key}
                    href={`/${landingByKey(key).slug}`}
                    className="inline-flex h-11 items-center gap-1.5 rounded-full bg-background/70 px-4 text-[14px] font-medium transition-colors hover:bg-background"
                  >
                    {tl(`pages.${key}.label`)}
                    <ArrowRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("moreTitle", { em: quiet })}</h2>
        <ul className="mx-auto mt-12 grid max-w-[1040px] gap-3 md:grid-cols-2">
          {GUIDES.filter((other) => other.key !== guide.key)
            .slice(0, 4)
            .map((other) => (
              <li key={other.slug}>
                <GuideCard guide={other} title={t(`pages.${other.key}.label`)} description={t(`pages.${other.key}.meta.description`)} />
              </li>
            ))}
        </ul>
        <p className="mt-8 text-center">
          <Link href={GUIDES_PATH} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("all")}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        </p>
      </section>

      <Closing />
    </MarketingShell>
  );
}

/** A guide on an index or under another guide: its name and what it covers. */
export function GuideCard({ guide, title, description }: { guide: Guide; title: string; description: string }) {
  return (
    <Link href={guidePath(guide)} className="group flex h-full flex-col rounded-[24px] bg-muted/80 p-6 transition-colors hover:bg-muted sm:p-7">
      <span className="flex items-center justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
        {title}
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
      </span>
      <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{description}</span>
    </Link>
  );
}
