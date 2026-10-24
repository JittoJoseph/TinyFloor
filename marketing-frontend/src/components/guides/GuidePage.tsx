import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { GUIDES_PATH, guidePath, guidesIn, readingMinutes, type Guide } from "@/lib/guides";
import { guideCopies } from "@/lib/guide-copy";
import { landingByKey } from "@/lib/landings";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { AUTHOR } from "@/lib/site";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, H2, INK, LEAD, MarketingShell, Questions, quiet } from "@/components/home/Blocks";
import { RelatedTools } from "@/components/tools/RelatedTools";
import { ArticleContents, ArticleSections, READ, numberItems } from "./ArticleSections";
import { byline } from "./Byline";

const dateIn = (locale: string, date: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * One guide (docs/search.md): a headline, who wrote it and when, a list of its
 * sections, then the sections themselves, read in one narrow column. Steps
 * and activities are numbered through the whole guide, so "20 activities"
 * counts to 20. Where TinyFloor fits comes last, said once and plainly, then
 * the questions and the other guides.
 */
export async function GuidePage({ guide, locale }: { guide: Guide; locale: string }) {
  const t = await getTranslations("guides");
  const tl = await getTranslations("landings");
  const copies = await guideCopies(locale);
  const copy = copies[guide.key];
  const path = guidePath(guide);
  const minutes = readingMinutes(copy, locale);

  const sections = numberItems(copy.sections);

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
              <span>{byline(t("by", { name: AUTHOR.name }))}</span>
              <span aria-hidden>·</span>
              <span>{t("minutes", { count: minutes })}</span>
              <span aria-hidden>·</span>
              <time dateTime={guide.updated}>{t("updated", { date: dateIn(locale, guide.updated) })}</time>
            </p>
          </div>
        </header>

        <nav aria-label={t("contents")} className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <ArticleContents sections={sections} label={t("contents")} />
        </nav>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <div className={READ}>
            <ArticleSections sections={sections} />

            <aside className="mt-16 rounded-[24px] bg-brand/[0.07] p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{copy.fit.body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link href="/lobby" data-cta="guide" className={INK}>
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

            <RelatedTools locale={locale} path={path} />
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{t.rich("moreTitle", { em: quiet })}</h2>
        <ul className="mx-auto mt-12 grid max-w-[1040px] gap-3 md:grid-cols-2">
          {/* The four after this one, round the list: every guide is linked from others, the newest too. */}
          {guidesIn(locale)
            .flatMap((_, index, list) => list[(list.findIndex((one) => one.key === guide.key) + 1 + index) % list.length])
            .filter((other) => other.key !== guide.key)
            .slice(0, 4)
            .map((other) => (
              <li key={other.slug}>
                <GuideCard guide={other} title={copies[other.key].label} description={copies[other.key].meta.description} />
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
