import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { POSTS, postBySlug, postPath } from "@/lib/blog";
import { postCopy } from "@/lib/blog-copy";
import { BlogPostPage } from "@/components/blog/BlogPost";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  const { meta } = await postCopy(post.slug);
  return pageMetadata({ locale: "en", path: postPath(post), title: meta.title, description: meta.description, locales: ["en"] });
}

export default async function Page({ params }: Props) {
  const { locale, slug } = await params;
  const post = postBySlug(slug);
  // The blog is in English only; the middleware turns other languages away first.
  if (!post || locale !== "en") notFound();
  setRequestLocale(locale as Locale);
  return <BlogPostPage post={post} copy={await postCopy(post.slug)} />;
}
