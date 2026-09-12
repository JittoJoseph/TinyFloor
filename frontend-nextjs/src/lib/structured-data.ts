import { SITE_URL } from "@/lib/site";
import { localeCodes } from "@/lib/i18n/routing";
import { localePath } from "@/lib/seo";

export type Schema = Record<string, unknown>;

const NAME = "SpatialMeet";
const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const IMAGE = `${SITE_URL}/office.png`;

/** The absolute URL a route is served at in a locale, matching its canonical. */
export function absoluteUrl(locale: string, path: string): string {
  const localized = localePath(locale, path);
  return `${SITE_URL}${localized === "/" ? "" : localized}`;
}

/** Who makes SpatialMeet and the site itself: the same two nodes on every page. */
export function siteGraph(): Schema {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: NAME,
        url: SITE_URL,
        sameAs: ["https://github.com/JittoJoseph/SpatialMeet"],
        founder: {
          "@type": "Person",
          name: "Jitto Joseph",
          url: "https://www.jittojoseph.xyz",
          sameAs: [
            "https://github.com/JittoJoseph",
            "https://www.linkedin.com/in/jittojoseph17/",
          ],
        },
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
  mainEntity,
  nodes = [],
}: {
  locale: string;
  path: string;
  name: string;
  description?: string;
  type?: "WebPage" | "CollectionPage";
  crumb?: boolean;
  mainEntity?: string;
  nodes?: Schema[];
}): Schema {
  const url = absoluteUrl(locale, path);
  const breadcrumb = crumb && {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { name: NAME, item: absoluteUrl(locale, "/") },
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
        image: IMAGE,
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
    image: IMAGE,
    screenshot: IMAGE,
    isAccessibleForFree: true,
    featureList: features,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
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
