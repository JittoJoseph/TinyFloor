import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { BLOG_LOCALES, BLOG_PATH } from "@/lib/blog";
import { blogUi, postsWithCopy } from "@/lib/blog-copy";
import { GUIDES_PATH } from "@/lib/guides";
import { topGuidesIn } from "@/components/home/HomeNav";
import { guideCopies } from "@/lib/guide-copy";
import { emphasised } from "@/lib/words";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/JsonLd";
import { ArrowRight } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { CJK_HEADLINE, COLUMN, Closing, H2, LEAD, MarketingShell, quiet } from "@/components/home/Blocks";
import { PostCard } from "@/components/blog/BlogPost";
import { CategoryFilter } from "@/components/blog/CategoryFilter";
import { GuideCard } from "@/components/guides/GuidePage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!BLOG_LOCALES.includes(locale as Locale)) return {};
  const ui = await blogUi(locale);
  return pageMetadata({ locale, path: BLOG_PATH, title: ui.meta.title, description: ui.meta.description, locales: BLOG_LOCALES });
}

/**
 * Every post in the reader's language, newest first, all the same size with
 * their covers, three to a row, under a choice of categories; then the guides
 * for the same readers. The blog is only in the languages it has posts in (lib/blog).
 */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (!BLOG_LOCALES.includes(locale as Locale)) notFound();
  setRequestLocale(locale as Locale);
  const tg = await getTranslations("guides");
  const ui = await blogUi(locale);
  const posts = await postsWithCopy(locale);
  // The categories this language has posts in, in the order they first appear.
  const categories = [...new Set(posts.map(({ post }) => post.category))];
  const guides = topGuidesIn(locale).slice(0, 4);
  const guideWords = await guideCopies(locale);

  return (
    <MarketingShell path={BLOG_PATH}>
      <JsonLd schema={pageGraph({ locale, path: BLOG_PATH, type: "CollectionPage", name: ui.meta.title, description: ui.meta.description })} />
      <section className={cn(COLUMN, "pt-32 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <h1
            className={cn(
              "max-w-[18ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px]",
              CJK_HEADLINE,
            )}
          >
            {emphasised(ui.title, locale, "text-foreground/55")}
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[34rem] text-balance")}>{ui.body}</p>
        </div>
      </section>

      <section className={cn(COLUMN, "pb-24 pt-12 sm:pb-32 sm:pt-16")}>
        <h2 className="sr-only">{ui.latest}</h2>
        {categories.length > 1 && (
          <CategoryFilter list="posts" all={ui.all} categories={categories.map((key) => ({ key, label: ui.categories[key] }))} />
        )}
        <ul id="posts" className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-14 sm:mt-16 md:grid-cols-2 lg:grid-cols-3">
          {posts.map(({ post, copy }, index) => (
            <li key={post.slug} data-category={post.category}>
              <PostCard post={post} copy={copy} ui={ui} locale={locale} priority={index < 3} />
            </li>
          ))}
        </ul>
      </section>

      <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{tg.rich("moreTitle", { em: quiet })}</h2>
        <ul className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <GuideCard guide={guide} title={guideWords[guide.key].label} description={guideWords[guide.key].meta.description} />
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center">
          <Link href={GUIDES_PATH} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {tg("all")}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </Link>
        </p>
      </section>
      <Closing />
    </MarketingShell>
  );
}
