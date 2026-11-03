import { cache } from "react";
import { POSTS, type PostCopy } from "@/lib/blog";

/** A post's words, from messages/blog/<slug>.json (lib/blog). */
export const postCopy = cache(async (slug: string): Promise<PostCopy> => (await import(`../../messages/blog/${slug}.json`)).default);

/** Every post with its words, newest first, for the index and llms.txt. */
export const postsWithCopy = cache(async () => Promise.all(POSTS.map(async (post) => ({ post, copy: await postCopy(post.slug) }))));
