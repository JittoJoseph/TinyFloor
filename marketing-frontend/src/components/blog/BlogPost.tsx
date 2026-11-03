import { getTranslations } from "next-intl/server";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { readingMinutes } from "@/lib/guides";
import { landingByKey } from "@/lib/landings";
import { BLOG_PATH, BLOG_TITLE, postPath, type BlogPost, type PostCopy } from "@/lib/blog";
import { postsWithCopy } from "@/lib/blog-copy";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { AUTHOR } from "@/lib/site";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, H2, INK, LEAD, MarketingShell, Questions, quiet } from "@/components/home/Blocks";
import { ArticleContents, ArticleSections, READ, linked, numberItems } from "@/components/guides/ArticleSections";
import { byline } from "@/components/guides/Byline";

export const postDate = (date: string) =>
  new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

/**
 * One blog post, in English: set like a guide, with the points to take away
 * above its sections and its numbered sources below them, so a claim on the
 * page can be checked, and quoted with where it came from.
 */
export async function BlogPostPage({ post, copy }: { post: BlogPost; copy: PostCopy }) {
  const t = await getTranslations("guides");
  const tl = await getTranslations("landings");
  const path = postPath(post);
  const sections = numberItems(copy.sections);
  const others = (await postsWithCopy()).filter((one) => one.post.slug !== post.slug).slice(0, 4);

  return (
    <MarketingShell path={path} oneTap>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path,
          name: copy.meta.title,
          description: copy.meta.description,
          parents: [{ name: BLOG_TITLE, path: BLOG_PATH }],
          mainEntity: `${absoluteUrl("en", path)}#article`,
          nodes: [
            articleNode({ locale: "en", path, headline: copy.meta.title, description: copy.meta.description, published: post.published, updated: post.updated }),
            faqNode("en", path, copy.faq),
          ],
        })}
      />

      <article>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className={READ}>
            <Link
              href={BLOG_PATH}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.14em] text-faint transition-colors hover:text-foreground"
            >
              {BLOG_TITLE}
              <ArrowRight className="size-3.5" />
            </Link>
            <h1
              className={cn(
                "mt-6 text-balance text-[36px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, "en", "text-muted-foreground/75")}
            </h1>
            <p className={cn(LEAD, "mt-7")}>{copy.intro}</p>
            <p className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-muted-foreground">
              <span>{byline(t("by", { name: AUTHOR.name }))}</span>
              <span aria-hidden>·</span>
              <span>{t("minutes", { count: readingMinutes(copy, "en") })}</span>
              <span aria-hidden>·</span>
              <time dateTime={post.updated}>{t("updated", { date: postDate(post.updated) })}</time>
            </p>
          </div>
        </header>

        <div className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <section aria-label="Key takeaways" className={cn(READ, "rounded-[22px] bg-brand/[0.07] p-6 sm:p-7")}>
            <h2 className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">Key takeaways</h2>
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

        <nav aria-label={t("contents")} className={cn(COLUMN, "mt-3")}>
          <ArticleContents sections={sections} label={t("contents")} />
        </nav>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
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
                    <ArrowRight className="size-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </aside>

            <section id="sources" className="scroll-mt-24 pt-16 sm:pt-20">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Sources</h2>
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
                      {source.note && <>. {source.note}</>}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={t.rich("faqTitle", { em: quiet })} />

      {others.length > 0 && (
        <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
          <h2 className={cn(H2, "text-center")}>More from the blog</h2>
          <ul className="mx-auto mt-12 grid max-w-[1040px] gap-3 md:grid-cols-2">
            {others.map(({ post: other, copy: words }) => (
              <li key={other.slug}>
                <PostCard post={other} copy={words} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Closing />
    </MarketingShell>
  );
}

/** A post on the index or under another post: its name, what it answers and when. */
export function PostCard({ post, copy }: { post: BlogPost; copy: PostCopy }) {
  return (
    <Link href={postPath(post)} className="group flex h-full flex-col rounded-[24px] bg-muted/80 p-6 transition-colors hover:bg-muted sm:p-7">
      <time dateTime={post.published} className="text-[13px] text-faint">
        {postDate(post.published)}
      </time>
      <span className="mt-2 flex items-center justify-between gap-3 text-[17px] font-semibold tracking-[-0.01em]">
        {copy.label}
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="mt-2 text-[14.5px] leading-[1.55] text-muted-foreground">{copy.meta.description}</span>
    </Link>
  );
}
