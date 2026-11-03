import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { pageGraph } from "@/lib/structured-data";
import { BLOG_DESCRIPTION, BLOG_PATH, BLOG_TITLE } from "@/lib/blog";
import { postsWithCopy } from "@/lib/blog-copy";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/components/JsonLd";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, LEAD, MarketingShell } from "@/components/home/Blocks";
import { PostCard } from "@/components/blog/BlogPost";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ locale: "en", path: BLOG_PATH, title: "Blog: Remote Team Questions, Answered With Numbers", description: BLOG_DESCRIPTION, locales: ["en"] });
}

/** Every post, newest first. The blog is in English only (lib/blog), so other languages have no index. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  if (locale !== "en") notFound();
  setRequestLocale(locale as Locale);
  const posts = await postsWithCopy();

  return (
    <MarketingShell path={BLOG_PATH}>
      <JsonLd schema={pageGraph({ locale: "en", path: BLOG_PATH, type: "CollectionPage", name: BLOG_TITLE, description: BLOG_DESCRIPTION })} />
      <section className={cn(COLUMN, "pb-24 pt-32 sm:pb-32 sm:pt-44")}>
        <div className="flex flex-col items-center text-center">
          <p className={cn(EYEBROW, "mb-6")}>{BLOG_TITLE}</p>
          <h1
            className={cn(
              "max-w-[18ch] text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[64px]",
              CJK_HEADLINE,
            )}
          >
            Questions remote teams ask, <span className="text-foreground/55">answered with numbers.</span>
          </h1>
          <p className={cn(LEAD, "mt-7 max-w-[34rem] text-balance")}>{BLOG_DESCRIPTION}</p>
        </div>
        <ul className="mx-auto mt-14 grid max-w-[1040px] gap-3 sm:mt-20 md:grid-cols-2">
          {posts.map(({ post, copy }) => (
            <li key={post.slug}>
              <PostCard post={post} copy={copy} />
            </li>
          ))}
        </ul>
      </section>
      <Closing />
    </MarketingShell>
  );
}
