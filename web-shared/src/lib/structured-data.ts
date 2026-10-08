import { APP_PATH, APP_URL, AUTHOR, SITE_URL, SOCIALS } from "@/lib/site";
import { localeCodes } from "@/lib/i18n/routing";
import { localePath, socialImage } from "@/lib/seo";

export type Schema = Record<string, unknown>;

const NAME = "TinyFloor";
export const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
/** The founder, who also writes the guides: the same Person node as founder and as author. */
const AUTHOR_NODE: Schema = {
  "@type": "Person",
  "@id": `${SITE_URL}/#author`,
  name: AUTHOR.name,
  url: AUTHOR.url,
  sameAs: [AUTHOR.linkedin, AUTHOR.github],
};

/** The home page's "also on every floor" items, named after the product's own features wherever those are listed. */
export const MORE_FEATURES = ["whiteboard", "music", "noise", "mobile", "languages"] as const;

/** The absolute URL a route is served at in a locale, matching its canonical. */
export function absoluteUrl(locale: string, path: string): string {
  const localized = localePath(locale, path);
  return `${APP_PATH.test(path) ? APP_URL : SITE_URL}${localized === "/" ? "" : localized}`;
}

/** Who makes TinyFloor and the site itself: the same two nodes on every page. */
export function siteGraph(): Schema {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon-512.png`,
        sameAs: Object.values(SOCIALS),
        founder: AUTHOR_NODE,
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: NAME,
        url: SITE_URL,
        inLanguage: localeCodes,
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/**
 * One page as its own node in the site graph, in its own language and at its
 * own URL, with a breadcrumb back to home and any nodes only this page has.
 */
export function pageGraph({
  locale,
  path,
  name,
  description,
  type = "WebPage",
  crumb = true,
  parents = [],
  mainEntity,
  nodes = [],
}: {
  locale: string;
  path: string;
  name: string;
  description?: string;
  type?: "WebPage" | "CollectionPage" | "AboutPage";
  crumb?: boolean;
  /** Pages between home and this one in the breadcrumb, like a guide's index. */
  parents?: Array<{ name: string; path: string }>;
  mainEntity?: string;
  nodes?: Schema[];
}): Schema {
  const url = absoluteUrl(locale, path);
  const breadcrumb = crumb && {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { name: NAME, item: absoluteUrl(locale, "/") },
      ...parents.map((parent) => ({ name: parent.name, item: absoluteUrl(locale, parent.path) })),
      { name, item: url },
    ].map((entry, i) => ({ "@type": "ListItem", position: i + 1, ...entry })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": `${url}#webpage`,
        url,
        name,
        ...(description ? { description } : {}),
        inLanguage: locale,
        image: socialImage(locale, path),
        isPartOf: { "@id": WEBSITE_ID },
        ...(breadcrumb ? { breadcrumb: { "@id": breadcrumb["@id"] } } : {}),
        ...(mainEntity ? { mainEntity: { "@id": mainEntity } } : {}),
      },
      ...(breadcrumb ? [breadcrumb] : []),
      ...nodes,
    ],
  };
}

/** The product, described in the language of the home page it sits on. */
export function appNode(
  locale: string,
  description: string,
  features: string[],
): Schema {
  const url = absoluteUrl(locale, "/");
  return {
    "@type": "WebApplication",
    "@id": `${url}#app`,
    name: NAME,
    url,
    description,
    inLanguage: locale,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Virtual office",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern browser with WebRTC",
    image: socialImage(locale, "/"),
    screenshot: socialImage(locale, "/"),
    isAccessibleForFree: true,
    featureList: features,
    // Free for 3, Plus $19 for 10, Pro $49 for 25 (docs/14).
    offers: { "@type": "AggregateOffer", lowPrice: "0", highPrice: "49", priceCurrency: "USD", offerCount: 3 },
    publisher: { "@id": ORG_ID },
  };
}

/** A guide as an article: its headline, who wrote it and when, in the page's language. */
export function articleNode({
  locale,
  path,
  headline,
  description,
  published,
  updated,
}: {
  locale: string;
  path: string;
  headline: string;
  description: string;
  published: string;
  updated: string;
}): Schema {
  const url = absoluteUrl(locale, path);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline,
    description,
    url,
    mainEntityOfPage: { "@id": `${url}#webpage` },
    inLanguage: locale,
    image: socialImage(locale, path),
    datePublished: published,
    dateModified: updated,
    author: AUTHOR_NODE,
    publisher: { "@id": ORG_ID },
  };
}

/** The FAQ exactly as it reads on the page, which Google requires. */
export function faqNode(
  locale: string,
  path: string,
  faqs: Array<{ q: string; a: string }>,
): Schema {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(locale, path)}#faq`,
    inLanguage: locale,
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
