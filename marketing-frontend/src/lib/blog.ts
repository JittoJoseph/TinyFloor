import type { LandingKey } from "@/lib/landings";
import type { GuideCopy } from "@/lib/guides";

/**
 * The blog: posts written to answer one question with facts someone can
 * check and quote, each with its sources (docs/search.md). Separate from the
 * guides, which are how-tos for remote team leads in every language: a post
 * is in English only, and its words are in messages/blog/<slug>.json, so no
 * other page loads them (lib/blog-copy), and the middleware can read this
 * list without them.
 */
export interface BlogPost {
  slug: string;
  /** First published and last changed (YYYY-MM-DD): shown on the page, in its schema and as the sitemap's lastmod. */
  published: string;
  updated: string;
  /** Product pages the post leads on to, after its own words. */
  pages: LandingKey[];
}

/** Newest first. */
export const POSTS: BlogPost[] = [
  { slug: "discord-voice-channel-for-work", published: "2026-11-03", updated: "2026-11-03", pages: ["discord", "proximityChat", "virtualOffice"] },
  { slug: "slack-and-zoom-or-a-virtual-office", published: "2026-11-03", updated: "2026-11-03", pages: ["slackHuddles", "presence", "virtualOffice"] },
  { slug: "virtual-office-cost", published: "2026-11-03", updated: "2026-11-03", pages: ["virtualOffice", "gather", "kumospace"] },
];

export const BLOG_PATH = "/blog";
export const BLOG_TITLE = "Blog";
export const BLOG_DESCRIPTION =
  "What remote teams ask before choosing how to work together, answered with numbers and where they come from, by the people who make TinyFloor.";

export const postPath = (post: BlogPost) => `${BLOG_PATH}/${post.slug}`;

export const postBySlug = (slug: string) => POSTS.find((post) => post.slug === slug);

/** A post's words: a guide's, plus the points to take away and its numbered sources, which its text cites as [1]. */
export interface PostCopy extends GuideCopy {
  takeaways: string[];
  sources: Array<{ title: string; url: string; note?: string }>;
}
