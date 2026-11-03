import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { POSTS, postBySlug, postPath } from "@/lib/blog";
import { blogUi, postCopy } from "@/lib/blog-copy";
import { BlogPostPage } from "@/components/blog/BlogPost";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = postBySlug(slug);
  if (!post || !post.locales.includes(locale as Locale)) return {};
  const { meta, coverAlt } = await postCopy(locale, post.slug);
  return pageMetadata({ locale, path: postPath(post), title: meta.title, description: meta.description, locales: post.locales, imageAlt: coverAlt });
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  const post = postBySlug(slug);
  // A post not written in this language (the middleware turns these away first).
  if (!post || !post.locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale as Locale);
  const [copy, ui] = await Promise.all([postCopy(locale, post.slug), blogUi(locale)]);
  return <BlogPostPage post={post} copy={copy} ui={ui} locale={locale} />;
}
