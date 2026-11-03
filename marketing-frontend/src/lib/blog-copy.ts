import { cache } from "react";
import { postsIn, type BlogPost, type BlogUi, type PostCopy } from "@/lib/blog";

/** A post's words in one language, from messages/blog/<locale>/<slug>.json (lib/blog). */
export const postCopy = cache(async (locale: string, slug: string): Promise<PostCopy> => (await import(`../../messages/blog/${locale}/${slug}.json`)).default);

/** The blog's own words in one language, from messages/blog/<locale>/index.json. */
export const blogUi = cache(async (locale: string): Promise<BlogUi> => (await import(`../../messages/blog/${locale}/index.json`)).default);

/** Every post in one language with its words, newest first, for the index, the cards and llms.txt. */
export const postsWithCopy = cache(async (locale: string): Promise<Array<{ post: BlogPost; copy: PostCopy }>> =>
  Promise.all(postsIn(locale).map(async (post) => ({ post, copy: await postCopy(locale, post.slug) }))),
);
