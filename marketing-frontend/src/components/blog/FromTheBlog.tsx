import { getLocale } from "next-intl/server";
import { BLOG_LOCALES, postsIn, type BlogPost } from "@/lib/blog";
import type { Locale } from "@/lib/i18n/routing";
import { blogUi, postCopy } from "@/lib/blog-copy";
import { cn } from "@/lib/utils";
import { CJK_HEADLINE, COLUMN, H2 } from "@/components/home/Blocks";
import { PostCard } from "./BlogPost";

/** The blog's posts on a page they lead to, a guide or a product page, so the link goes both ways (lib/blog). */
export async function FromTheBlog({ posts, locale }: { posts: BlogPost[]; locale: string }) {
  if (!posts.length) return null;
  const [ui, copies] = await Promise.all([blogUi(locale), Promise.all(posts.map((post) => postCopy(locale, post.slug)))]);
  return (
    <section className={cn(COLUMN, "pb-24 sm:pb-32")}>
      <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>{ui.fromBlog}</h2>
      <ul className="mx-auto mt-12 grid max-w-[1120px] gap-x-6 gap-y-12 md:grid-cols-3">
        {posts.map((post, index) => (
          <li key={post.slug}>
            <PostCard post={post} copy={copies[index]} ui={ui} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The newest posts, on the home page of a language that has a blog. */
export async function LatestPosts() {
  const locale = await getLocale();
  if (!BLOG_LOCALES.includes(locale as Locale)) return null;
  return <FromTheBlog posts={postsIn(locale).slice(0, 3)} locale={locale} />;
}
