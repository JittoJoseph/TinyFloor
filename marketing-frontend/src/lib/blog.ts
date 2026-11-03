import type { LandingKey } from "@/lib/landings";
import type { GuideCopy, GuideKey } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";

/**
 * The blog: posts written to answer one question with facts someone can
 * check and quote, each with its sources (docs/search.md). Separate from the
 * guides, which are how-tos for remote team leads: a post is written in the
 * languages where people search for it, each from that language's own
 * keyword research, and its words are in messages/blog/<locale>/<slug>.json,
 * so no other page loads them (lib/blog-copy). The middleware reads this list
 * without them.
 */

export type BlogCategory = "costs" | "comparisons" | "remoteWork";

export interface BlogPost {
  slug: string;
  category: BlogCategory;
  /** First published and last changed (YYYY-MM-DD): shown on the page, in its schema and as the sitemap's lastmod. */
  published: string;
  updated: string;
  /** The languages it's written in, English first. */
  locales: readonly Locale[];
  /** Product pages the post leads on to, after its own words; each lists the post in turn. */
  pages: LandingKey[];
  /** Guides that go further on the same subject; each lists the post in turn. */
  guides: GuideKey[];
}

/** Newest first. */
export const POSTS: BlogPost[] = [
  {
    slug: "remote-work-statistics",
    category: "remoteWork",
    published: "2026-11-03",
    updated: "2026-11-03",
    locales: ["en"],
    pages: ["presence", "virtualOffice", "watercooler"],
    guides: ["remoteCulture", "manageRemote", "remoteCommunication"],
  },
  {
    slug: "discord-voice-channel-for-work",
    category: "comparisons",
    published: "2026-11-03",
    updated: "2026-11-03",
    locales: ["en", "ja", "ko", "pt", "de", "fr"],
    pages: ["discord", "proximityChat", "virtualOffice"],
    guides: ["discordVsSlack", "remoteCommunication", "proximityChat"],
  },
  {
    slug: "slack-and-zoom-or-a-virtual-office",
    category: "comparisons",
    published: "2026-11-03",
    updated: "2026-11-03",
    locales: ["en"],
    pages: ["slackHuddles", "presence", "virtualOffice"],
    guides: ["async", "remoteCommunication", "remoteTools"],
  },
  {
    slug: "virtual-office-cost",
    category: "costs",
    published: "2026-11-03",
    updated: "2026-11-03",
    locales: ["en", "ja"],
    pages: ["virtualOffice", "gather", "kumospace"],
    guides: ["bestVirtualOffice", "gatherPricing", "remoteTools"],
  },
];

export const BLOG_PATH = "/blog";

export const postPath = (post: BlogPost) => `${BLOG_PATH}/${post.slug}`;

export const postBySlug = (slug: string) => POSTS.find((post) => post.slug === slug);

/** The posts written in this language, newest first. */
export const postsIn = (locale: string) => POSTS.filter((post) => post.locales.includes(locale as Locale));

/** The languages the blog has an index in: any that has a post. */
export const BLOG_LOCALES = [...new Set(POSTS.flatMap((post) => post.locales))] as Locale[];

/** The picture under a post's headline and on its card: an illustration made for the post, 16:9, in public/blog. */
export const coverSrc = (post: BlogPost) => `/blog/${post.slug}.webp`;

/** Posts that lead on to a product page or go further than a guide, for those pages to list in turn. */
export const postsForPage = (key: LandingKey, locale: string) => postsIn(locale).filter((post) => post.pages.includes(key));
export const postsForGuide = (key: GuideKey, locale: string) => postsIn(locale).filter((post) => post.guides.includes(key));

/** The posts to read after this one: the same category first, then the newest. */
export function postsAfter(post: BlogPost, locale: string, count: number): BlogPost[] {
  const others = postsIn(locale).filter((one) => one.slug !== post.slug);
  return [...others.filter((one) => one.category === post.category), ...others.filter((one) => one.category !== post.category)].slice(0, count);
}

/** A post's words: a guide's, plus the cover's description, the points to take away, and its numbered sources, which its text cites as [1]. */
export interface PostCopy extends GuideCopy {
  coverAlt: string;
  takeaways: string[];
  sources: Array<{ title: string; url: string; note?: string }>;
}

/** The blog's own words in a language: messages/blog/<locale>/index.json. */
export interface BlogUi {
  label: string;
  meta: { title: string; description: string };
  title: string;
  body: string;
  categories: Record<BlogCategory, string>;
  latest: string;
  takeaways: string;
  sources: string;
  related: string;
  guides: string;
  fromBlog: string;
  all: string;
}
