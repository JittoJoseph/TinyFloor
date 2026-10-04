import { getTranslations } from "next-intl/server";
import { locales } from "@/lib/i18n/routing";
import { COMPARE_ROWS, HUBS, LANDINGS, LANDING_GROUPS, landingByKey, type Landing, type LandingGroup, type LandingKey } from "@/lib/landings";
import { GUIDES, GUIDES_PATH, guidePath, type GuideCopy } from "@/lib/guides";
import { PLANS } from "@/lib/plans";
import { SUPPORT_EMAIL } from "@/lib/site";
import { MORE_FEATURES, absoluteUrl } from "@/lib/structured-data";

/**
 * The site in plain text for AI assistants and answer engines, in English
 * (https://llmstxt.org): llms.txt is the map, a line on every page, and
 * llms-full.txt is every marketing page's own words, so an assistant can
 * answer from one file without crawling 18 languages of HTML.
 */

type Row = (typeof COMPARE_ROWS)[number];
interface PageCopy {
  label: string;
  meta: { title: string; description: string };
  subtitle: string;
  points: Array<{ title: string; body: string }>;
  them?: Partial<Record<Row, string>>;
  momentsTitle?: string;
  moments?: Array<{ label: string; title: string; body: string }>;
  faq: Array<{ q: string; a: string }>;
}

type Link = [title: string, path: string, note: string];

async function translator() {
  const t = await getTranslations({ locale: "en" });
  return {
    text: (key: string, values?: Record<string, string>) => t(key as Parameters<typeof t>[0], values as never),
    raw: <T,>(key: string) => t.raw(key as Parameters<typeof t.raw>[0]) as T,
  };
}

/** Rich text as plain text: `<em>` only marks emphasis on the page. */
const plain = (value: string) => value.replace(/<\/?em>/g, "");
const url = (path: string) => absoluteUrl("en", path);
const list = (links: Link[]) => links.map(([title, path, note]) => `- [${title}](${url(path)}): ${note}`);

const GROUP_TITLES: Record<LandingGroup, string> = { features: "Features", teams: "Teams", useCases: "Use cases", compare: "Compare" };

async function common() {
  const { text, raw } = await translator();
  const page = (key: LandingKey) => raw<PageCopy>(`landings.pages.${key}`);
  const hub = (group: LandingGroup): Link => [
    text(`landings.hubs.${group}.meta.title`),
    `/${HUBS[group]}`,
    text(`landings.hubs.${group}.meta.description`),
  ];
  const pagesOf = (group: LandingGroup) => LANDINGS.filter((landing) => landing.group === group);
  const product: Link[] = [
    ["TinyFloor", "/", text("landing.description")],
    [text("pricingPage.meta.title"), "/pricing", text("pricingPage.meta.description")],
    [text("metadata.lobbyTitle"), "/lobby", text("metadata.lobbyDescription")],
    [text("about.meta.title"), "/about", text("about.meta.description")],
  ];
  const features = [
    ...raw<string[]>("landing.features"),
    ...MORE_FEATURES.map((key) => text(`home.more.items.${key}.title`)),
  ];
  const faq = raw<Array<{ q: string; a: string }>>("faq.items");
  const guide = (key: string) => raw<GuideCopy>(`guides.pages.${key}`);
  const guides: Link[] = [
    [text("guides.hub.meta.title"), GUIDES_PATH, text("guides.hub.meta.description")],
    ...GUIDES.map((one): Link => [guide(one.key).meta.title, guidePath(one), guide(one.key).meta.description]),
  ];
  return { text, raw, page, hub, pagesOf, product, features, faq, guide, guides };
}

export async function llmsTxt(): Promise<string> {
  const { text, page, hub, pagesOf, product, features, faq, guides } = await common();
  return [
    "# TinyFloor",
    "",
    `> ${text("metadata.description")}`,
    "",
    text("pricingPage.meta.description"),
    `The words of every page below, with plans, comparison tables and answers, are in [llms-full.txt](${url("/llms-full.txt")}).`,
    "",
    "## Product",
    "",
    ...list(product),
    "",
    ...LANDING_GROUPS.flatMap((group) => [
      `## ${GROUP_TITLES[group]}`,
      "",
      ...list([hub(group), ...pagesOf(group).map(({ key, slug }): Link => [page(key).meta.title, `/${slug}`, page(key).meta.description])]),
      "",
    ]),
    "## Guides",
    "",
    ...list(guides),
    "",
    "## What's in every office",
    "",
    ...features.map((feature) => `- ${feature}`),
    "",
    "## FAQ",
    "",
    ...faq.flatMap(({ q, a }) => [`### ${q}`, "", a, ""]),
    "## Optional",
    "",
    ...locales.map(({ code, label }) => `- [TinyFloor in ${label}](${absoluteUrl(code, "/")})`),
    `- [Privacy policy](${url("/privacy")})`,
    `- [Terms of service](${url("/terms")})`,
    `- [Refund policy](${url("/refunds")})`,
    "",
  ].join("\n");
}

export async function llmsFullTxt(): Promise<string> {
  const { text, raw, page, pagesOf, features, faq, guide } = await common();

  const plans = () => {
    const name = (key: string) => key[0].toUpperCase() + key.slice(1);
    const notes = ["cancel", "refund", "change", "hours", "tax", "bigger"] as const;
    return [
      "## Plans",
      "",
      text("pricingPage.meta.description"),
      "",
      `| | ${PLANS.map((plan) => name(plan.key)).join(" | ")} |`,
      `|---|${PLANS.map(() => "---").join("|")}|`,
      `| Price | ${PLANS.map((plan) => (plan.price ? `$${plan.price} a month` : "Free")).join(" | ")} |`,
      `| ${text("pricingPage.table.people")} | ${PLANS.map((plan) => `Up to ${plan.people}`).join(" | ")} |`,
      `| ${text("pricingPage.table.hours")} (${text("pricingPage.table.hoursNote").toLowerCase()}) | ${PLANS.map((plan) => plan.hours).join(" | ")} |`,
      `| ${text("pricingPage.table.calls")} | ${PLANS.map(() => text("pricingPage.table.callsNote")).join(" | ")} |`,
      "",
      `${plain(text("pricingPage.table.title"))} ${plain(text("pricingPage.table.muted"))}`,
      "",
      ...notes.flatMap((note) => [`### ${text(`pricingPage.notes.${note}.title`)}`, "", text(`pricingPage.notes.${note}.body`, { email: SUPPORT_EMAIL }), ""]),
    ];
  };

  const month = (checked: string) =>
    new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${checked}-01T00:00:00Z`));

  /** The page's table, as the page shows it: TinyFloor against one product, or two. */
  const table = (landing: Landing, copy: PageCopy) => {
    const others = landing.versus
      ? landing.versus.map((key) => ({ name: landingByKey(key).competitor ?? "", them: page(key).them ?? {} }))
      : landing.competitor && copy.them
        ? [{ name: landing.competitor, them: copy.them }]
        : [];
    if (!others.length) return [];
    const rows = COMPARE_ROWS.filter((row) => others.every((other) => other.them[row]));
    const us = raw<Record<Row, string>>("landings.us");
    const date = landing.checked ? month(landing.checked) : "";
    const note =
      others.length === 2
        ? text("landings.checkedBothIn", { a: others[0].name, b: others[1].name, date })
        : date
          ? text("landings.checkedIn", { name: others[0].name, date })
          : text("landings.checked", { name: others[0].name });
    return [
      `| | TinyFloor | ${others.map((other) => other.name).join(" | ")} |`,
      `|---|---|${others.map(() => "---").join("|")}|`,
      ...rows.map((row) => `| ${text(`landings.rows.${row}`)} | ${us[row]} | ${others.map((other) => other.them[row]).join(" | ")} |`),
      "",
      note,
      "",
    ];
  };

  const landingPage = (landing: Landing) => {
    const copy = page(landing.key);
    return [
      `### ${copy.meta.title}`,
      "",
      url(`/${landing.slug}`),
      "",
      copy.subtitle,
      "",
      ...copy.points.map((point) => `- **${point.title}:** ${point.body}`),
      "",
      ...(copy.moments && copy.momentsTitle
        ? [`${plain(copy.momentsTitle)}`, "", ...copy.moments.map((one) => (/^\d+$/.test(one.label) ? `${one.label}. **${one.title}:** ${one.body}` : `- **${one.label}, ${one.title.toLowerCase()}:** ${one.body}`)), ""]
        : []),
      ...table(landing, copy),
      ...copy.faq.flatMap(({ q, a }) => [`**${q}** ${a}`, ""]),
    ];
  };

  /** A guide, section by section; numbered items count on through the guide, as on the page. */
  const guidePage = (key: string, path: string) => {
    const copy = guide(key);
    let number = 0;
    return [
      `### ${copy.meta.title}`,
      "",
      url(path),
      "",
      copy.intro,
      "",
      ...copy.sections.flatMap((section) => [
        `#### ${section.title}`,
        "",
        ...(section.body ?? []).flatMap((paragraph) => [paragraph, ""]),
        ...(section.items ?? []).map((item) =>
          item.detail ? `${++number}. **${item.title}** (${item.detail}): ${item.body}` : `- **${item.title}:** ${item.body}`,
        ),
        ...(section.items ? [""] : []),
      ]),
      `#### ${copy.fit.title}`,
      "",
      copy.fit.body,
      "",
      ...copy.faq.flatMap(({ q, a }) => [`**${q}** ${a}`, ""]),
    ];
  };

  return [
    "# TinyFloor, the full text",
    "",
    `> ${text("metadata.description")}`,
    "",
    `The words of tinyfloor.com's pages in English, for AI assistants. The map of the site is [llms.txt](${url("/llms.txt")}); every page is also in 17 more languages.`,
    "",
    `## About`,
    "",
    text("landing.description"),
    "",
    text("about.meta.description"),
    "",
    "What's in every office:",
    "",
    ...features.map((feature) => `- ${feature}`),
    "",
    ...plans(),
    "## FAQ",
    "",
    ...faq.flatMap(({ q, a }) => [`### ${q}`, "", a, ""]),
    ...LANDING_GROUPS.flatMap((group) => [
      `## ${GROUP_TITLES[group]}`,
      "",
      text(`landings.hubs.${group}.meta.description`),
      "",
      ...pagesOf(group).flatMap(landingPage),
    ]),
    "## Guides",
    "",
    text("guides.hub.meta.description"),
    "",
    ...GUIDES.flatMap((one) => guidePage(one.key, guidePath(one))),
  ].join("\n");
}

export const textResponse = (body: string) =>
  new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
