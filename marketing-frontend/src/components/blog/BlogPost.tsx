import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { guidesIn, readingMinutes } from "@/lib/guides";
import { guideCopies } from "@/lib/guide-copy";
import { landingByKey } from "@/lib/landings";
import { BLOG_PATH, coverSrc, postPath, postsAfter, type BlogPost, type BlogUi, type PostCopy } from "@/lib/blog";
import { postCopy } from "@/lib/blog-copy";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { AUTHOR } from "@/lib/site";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, H2, INK, LEAD, MarketingShell, Questions, quiet } from "@/components/home/Blocks";
import { ArticleContents, ArticleSections, READ, linked, numberItems } from "@/components/guides/ArticleSections";
import { GuideCard } from "@/components/guides/GuidePage";
import { byline } from "@/components/guides/Byline";

export const postDate = (locale: string, date: string) =>
  new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/** A post's cover, the illustration made for it, under its headline and on every card. */
export function Cover({ post, alt, priority = false, className }: { post: BlogPost; alt: string; priority?: boolean; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-[28px] bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverSrc(post)}
        alt={alt}
        width={1600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="aspect-video h-auto w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
      />
    </div>
  );
}

/**
 * One post, laid out the way the big product blogs set theirs: a centred
 * headline with who wrote it, when and under what; the cover beneath, as wide
 * as the text; then one reading column with the points to take away first,
 * the sections, where TinyFloor fits and the numbered sources its text cites.
 * After it, related articles with their covers, the guides that go further,
 * and the questions.
 */
export async function BlogPostPage({ post, copy, ui, locale }: { post: BlogPost; copy: PostCopy; ui: BlogUi; locale: string }) {
  const t = await getTranslations("guides");
  const tl = await getTranslations("landings");
  const path = postPath(post);
  const sections = numberItems(copy.sections);
  const related = await Promise.all(postsAfter(post, locale, 3).map(async (one) => ({ post: one, copy: await postCopy(locale, one.slug) })));
  const guides = guidesIn(locale).filter((guide) => post.guides.includes(guide.key));
  const guideWords = guides.length ? await guideCopies(locale) : null;

  return (
    <MarketingShell path={path} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          name: copy.meta.title,
          description: copy.meta.description,
          parents: [{ name: ui.label, path: BLOG_PATH }],
          mainEntity: `${absoluteUrl(locale, path)}#article`,
          nodes: [
            articleNode({ locale, path, headline: copy.meta.title, description: copy.meta.description, published: post.published, updated: post.updated }),
            faqNode(locale, path, copy.faq),
          ],
        })}
      />

      <article>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className="mx-auto max-w-[52rem] text-center">
            <h1
              className={cn(
                "text-balance text-[34px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, locale, "text-muted-foreground/75")}
            </h1>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px] text-muted-foreground">
              <span>{byline(t("by", { name: AUTHOR.name }))}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.updated}>{postDate(locale, post.updated)}</time>
              <span aria-hidden>·</span>
              <Link href={BLOG_PATH} className="transition-colors hover:text-foreground">
                {ui.categories[post.category]}
              </Link>
              <span aria-hidden>·</span>
              <span>{t("minutes", { count: readingMinutes(copy, locale) })}</span>
            </p>
          </div>
        </header>

        <div className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <div className={READ}>
            <Cover post={post} alt={copy.coverAlt} priority className="rounded-[24px]" />
            <p className={cn(LEAD, "mt-10 text-pretty sm:mt-12")}>{linked(copy.intro)}</p>
            <section aria-labelledby="takeaways" className="mt-10 rounded-[22px] bg-brand/[0.07] p-6 sm:p-7">
              <h2 id="takeaways" className="text-[17px] font-semibold tracking-[-0.01em]">
                {ui.takeaways}
              </h2>
              <ul className="mt-4 grid gap-3">
                {copy.takeaways.map((point) => (
                  <li key={point} className="relative ps-5 text-[16px] leading-[1.6] text-foreground/85">
                    <span aria-hidden className="absolute start-0 top-[0.65em] size-1.5 rounded-full bg-brand" />
                    {linked(point)}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <nav aria-label={t("contents")} className={cn(COLUMN, "mt-3")}>
          <ArticleContents sections={sections} label={t("contents")} />
        </nav>

        <div className={cn(COLUMN, "pb-20 sm:pb-24")}>
          <div className={READ}>
            <ArticleSections sections={sections} />

            <aside className="mt-16 rounded-[24px] bg-muted/80 p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{linked(copy.fit.body)}</p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Link href="/lobby" data-cta="blog" className={INK}>
                  {t("fitCta")}
                </Link>
                {post.pages.map((key) => (
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

            <section id="sources" aria-labelledby="sources-title" className="scroll-mt-24 pt-14 sm:pt-16">
              <h2 id="sources-title" className="text-[20px] font-semibold tracking-[-0.02em]">
                {ui.sources}
              </h2>
              <ol className="mt-5 grid gap-3">
                {copy.sources.map((source, index) => (
                  <li key={source.url} id={`source-${index + 1}`} className="flex scroll-mt-24 gap-3 text-[14.5px] leading-[1.6]">
                    <span className="w-6 shrink-0 tabular-nums text-faint">{index + 1}.</span>
                    <span className="min-w-0 text-muted-foreground">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground underline decoration-foreground/25 underline-offset-[3px] transition-colors hover:decoration-foreground"
                      >
                        {source.title}
                      </a>
                      {source.note && <> · {source.note}</>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{ui.related}</h2>
          <ul className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-12 md:grid-cols-3">
            {related.map((one) => (
              <li key={one.post.slug}>
                <PostCard post={one.post} copy={one.copy} ui={ui} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {guideWords && (
        <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{ui.guides}</h2>
          <ul className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-12 md:grid-cols-3">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <GuideCard guide={guide} title={guideWords[guide.key].label} description={guideWords[guide.key].meta.description} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />
      <Closing />
    </MarketingShell>
  );
}

/** A post on the index, under another post, or on a page it leads to: its cover, its category and date, its title. */
export function PostCard({ post, copy, ui, locale, priority = false }: { post: BlogPost; copy: PostCopy; ui: BlogUi; locale: string; priority?: boolean }) {
  return (
    <Link href={postPath(post)} className="group block">
      <Cover post={post} alt={copy.coverAlt} priority={priority} className="rounded-[22px]" />
      <span className="mt-5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground/80">{ui.categories[post.category]}</span>
        <span aria-hidden>·</span>
        <time dateTime={post.published}>{postDate(locale, post.published)}</time>
      </span>
      <span className={cn("mt-2.5 block text-balance text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] transition-colors group-hover:text-foreground/80", CJK_HEADLINE)}>
        {copy.meta.title}
      </span>
    </Link>
  );
}
