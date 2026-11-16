import { SITE_URL } from "web-shared/lib/site";
import { CHANGELOG, CHANGELOG_FEED, CHANGELOG_PATH, changelogHref, changelogImage } from "@/lib/changelog";

export const dynamic = "force-static";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** `[words](/path)` links as HTML, with the site's own paths made whole. */
const html = (text: string) =>
  escape(text).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, words: string, href: string) => `<a href="${href.startsWith("/") ? SITE_URL + href : href}">${words}</a>`);

/**
 * The changelog as RSS (lib/changelog.ts): every change, newest first, with
 * its picture and the smaller changes that went with it, linking to its own
 * page or to its place on the changelog. For readers, and for anything that
 * follows the site's news.
 */
export function GET() {
  const items = CHANGELOG.map((entry) => {
    const link = `${SITE_URL}${changelogHref(entry)}`;
    const image = changelogImage(entry);
    const description = [
      image ? `<p><img src="${SITE_URL}${image}" alt="${escape(entry.image!.alt)}" width="1600" height="1000" /></p>` : "",
      `<p>${html(entry.summary)}</p>`,
      entry.also ? `<ul>${entry.also.map((item) => `<li>${html(item)}</li>`).join("")}</ul>` : "",
    ].join("");
    return [
      "<item>",
      `<title>${escape(entry.title)}</title>`,
      `<link>${link}</link>`,
      `<guid isPermaLink="false">tinyfloor-changelog-${entry.slug}</guid>`,
      `<pubDate>${new Date(`${entry.date}T12:00:00Z`).toUTCString()}</pubDate>`,
      `<category>${entry.kind}</category>`,
      image ? `<enclosure url="${SITE_URL}${image}" type="image/webp" length="0" />` : "",
      `<description><![CDATA[${description}]]></description>`,
      "</item>",
    ].join("");
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "<channel>",
    "<title>TinyFloor Changelog</title>",
    `<link>${SITE_URL}${CHANGELOG_PATH}</link>`,
    `<atom:link href="${SITE_URL}${CHANGELOG_FEED}" rel="self" type="application/rss+xml" />`,
    "<description>What's new in TinyFloor, the virtual office for remote teams, by the day it went live.</description>",
    "<language>en</language>",
    `<lastBuildDate>${new Date(`${CHANGELOG[0].date}T12:00:00Z`).toUTCString()}</lastBuildDate>`,
    ...items,
    "</channel>",
    "</rss>",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
