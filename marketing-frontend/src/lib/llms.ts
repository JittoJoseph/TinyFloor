import { getTranslations } from "next-intl/server";
import { locales } from "@/lib/i18n/routing";
import {
  COMPARE_ROWS,
  HUBS,
  LANDINGS,
  LANDING_GROUPS,
  landingByKey,
  type Landing,
  type LandingGroup,
  type LandingKey,
} from "@/lib/landings";
import { GUIDES, GUIDES_PATH, guidePath, type GuideKey, type GuideSection } from "@/lib/guides";
import { landingArticle } from "@/lib/landing-articles";
import { guideCopies } from "@/lib/guide-copy";
import { BLOG_DESCRIPTION, BLOG_PATH, BLOG_TITLE, postPath } from "@/lib/blog";
import { postsWithCopy } from "@/lib/blog-copy";
import { PLANS } from "@/lib/plans";
import { FOUNDING, foundingOpen } from "@/lib/founding";
import { CHANGELOG, CHANGELOG_PATH, RELEASES } from "@/lib/changelog";
import { HOW_IT_WORKS, HOW_IT_WORKS_DESCRIPTION, HOW_IT_WORKS_INTRO, HOW_IT_WORKS_PATH, HOW_IT_WORKS_TITLE } from "@/lib/how-it-works";
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
  points?: Array<{ title: string; body: string }>;
  them?: Partial<Record<Row, string>>;
  faq: Array<{ q: string; a: string }>;
}

type Link = [title: string, path: string, note: string];

async function translator() {
  const t = await getTranslations({ locale: "en" });
  return {
    text: (key: string, values?: Record<string, string>) => t(key as Parameters<typeof t>[0], values as never),
    raw: <T>(key: string) => t.raw(key as Parameters<typeof t.raw>[0]) as T,
  };
}

/** Rich text as plain text: `<em>` only marks emphasis on the page. */
const plain = (value: string) => value.replace(/<\/?em>/g, "");
const url = (path: string) => absoluteUrl("en", path);
const list = (links: Link[]) => links.map(([title, path, note]) => `- [${title}](${url(path)}): ${note}`);

const GROUP_TITLES: Record<LandingGroup, string> = { features: "Features", teams: "Teams", useCases: "Use cases", compare: "Compare" };

/** Links to the site's own pages in text kept in lib/, written `[words](/path)`, made whole. */
const linked = (value: string) => value.replace(/\]\((\/[^)]*)\)/g, (_, to: string) => `](${url(to)})`);

/**
 * What an assistant needs to answer a buyer's situation, stated plainly: the
 * price as a team pays it, the trial, who it fits and who it doesn't, how it
 * runs, and how often it changes. Buyers ask in situations ("a team of 8, not
 * per person"), and a page that states the constraint is the page that's
 * cited (docs/search.md).
 */
function keyFacts(): string[] {
  const [, pro] = PLANS;
  const [, ...earlier] = RELEASES;
  return [
    "## Key facts",
    "",
    `- **For a remote team that works together every day** and wants to see who's around and talk without scheduling a meeting: software teams, agencies, studios and startups, often ones that keep a Discord voice channel open all day or juggle Slack huddles and meeting links.`,
    `- **One price for the whole team, not per person:** Pro is $${pro.price} a month for the office${
      foundingOpen() ? ` (a founding price kept for as long as you stay subscribed, for subscriptions started before ${new Date(FOUNDING.until).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}; $${FOUNDING.laterPrice} after that)` : ""
    }. Monthly, cancel any time. Every new office starts with 14 days of Pro for the whole team, no card needed.`,
    "- **Not for** a company that needs call recordings, AI meeting notes or single sign-on, or for events with hundreds of people. A bigger company gives each team an office of its own.",
    "- **Runs in the browser** on desktop and phones, nothing to install. Calls go through Cloudflare's relay and meetings through Cloudflare's media servers; screen sharing is up to 720p at 10 to 15 frames a second, tuned for sharp text.",
    `- **Ships to production almost every day:** ${earlier.map((one) => `${one.count} releases in ${one.month}`).join(", ")}; the [changelog](${url(CHANGELOG_PATH)}) lists what changed by date.`,
    "- **Open source** under AGPL-3.0: https://github.com/JittoJoseph/TinyFloor",
    `- **How it works,** with the numbers and what it doesn't do yet: [${HOW_IT_WORKS_TITLE}](${url(HOW_IT_WORKS_PATH)}).`,
    "",
  ];
}

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
  const features = [...raw<string[]>("landing.features"), ...MORE_FEATURES.map((key) => text(`home.more.items.${key}.title`))];
  const faq = raw<Array<{ q: string; a: string }>>("faq.items");
  const english = await guideCopies("en");
  const guide = (key: GuideKey) => english[key];
  const guides: Link[] = [
    [text("guides.hub.meta.title"), GUIDES_PATH, text("guides.hub.meta.description")],
    ...GUIDES.map((one): Link => [guide(one.key).meta.title, guidePath(one), guide(one.key).meta.description]),
  ];
  const posts = await postsWithCopy();
  return { text, raw, page, hub, pagesOf, product, features, faq, guide, guides, posts };
}

export async function llmsTxt(): Promise<string> {
  const { text, page, hub, pagesOf, product, features, faq, guides, posts } = await common();
  return [
    "# TinyFloor",
    "",
    `> ${text("metadata.description")}`,
    "",
    `The words of every page below, with plans, comparison tables and answers, are in [llms-full.txt](${url("/llms-full.txt")}).`,
    "",
    ...keyFacts(),
    "## Product",
    "",
    ...list([
      ...product,
      [HOW_IT_WORKS_TITLE, HOW_IT_WORKS_PATH, HOW_IT_WORKS_DESCRIPTION],
      ["Changelog", CHANGELOG_PATH, "What changed in TinyFloor, by the day it went live."],
    ]),
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
    `## ${BLOG_TITLE}`,
    "",
    ...list([[BLOG_TITLE, BLOG_PATH, BLOG_DESCRIPTION], ...posts.map(({ post, copy }): Link => [copy.meta.title, postPath(post), copy.meta.description])]),
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
  const { text, raw, page, pagesOf, features, faq, guide, posts } = await common();
  const articles = Object.fromEntries(
    await Promise.all(LANDINGS.map(async (landing) => [landing.key, await landingArticle("en", landing.key)] as const)),
  );

  const plans = () => {
    const name = (key: string) => key[0].toUpperCase() + key.slice(1);
    const notes = ["cancel", "refund", "change", ...(foundingOpen() ? (["founding"] as const) : []), "size", "tax"] as const;
    return [
      "## Plans",
      "",
      text("pricingPage.meta.description"),
      "",
      `| | ${PLANS.map((plan) => name(plan.key)).join(" | ")} |`,
      `|---|${PLANS.map(() => "---").join("|")}|`,
      `| Price | ${PLANS.map((plan) => (plan.price ? `$${plan.price} a month` : "Free")).join(" | ")} |`,
      `| ${text("pricingPage.table.people")} | ${PLANS.map((plan) => (plan.price ? `${text("pricingPage.table.wholeTeam")} (up to ${plan.people})` : `Up to ${plan.people}`)).join(" | ")} |`,
      `| ${text("pricingPage.table.meetings")} | ${PLANS.map(() => "Yes").join(" | ")} |`,
      `| ${text("pricingPage.table.support")} | ${PLANS.map((plan) => (plan.price ? "Yes" : "No")).join(" | ")} |`,
      `| ${text("pricingPage.table.calls")} | ${PLANS.map(() => text("pricingPage.table.callsNote")).join(" | ")} |`,
      "",
      `${plain(text("pricingPage.table.title"))} ${plain(text("pricingPage.table.muted"))}`,
      "",
      ...notes.flatMap((note) => [
        `### ${text(`pricingPage.notes.${note}.title`)}`,
        "",
        text(`pricingPage.notes.${note}.body`, { email: SUPPORT_EMAIL }),
        "",
      ]),
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

  /** Long text in sections, as a guide or a page's article reads; numbered items count on through the text, as on the page. */
  const sections = (list: GuideSection[]) => {
    let number = 0;
    return list.flatMap((section) => [
      `#### ${section.title}`,
      "",
      ...(section.body ?? []).flatMap((paragraph) => [linked(paragraph), ""]),
      ...(section.items ?? []).map((item) =>
        item.detail
          ? `${++number}. **${item.title}** (${item.detail}): ${linked(item.body)}`
          : section.numbered
            ? `${++number}. **${item.title}** ${linked(item.body)}`
            : `- **${item.title}:** ${linked(item.body)}`,
      ),
      ...(section.items ? [""] : []),
      ...(section.table
        ? [
            `| ${section.table.head.join(" | ")} |`,
            `|${section.table.head.map(() => "---").join("|")}|`,
            ...section.table.rows.map((row) => `| ${row.join(" | ")} |`),
            "",
            ...(section.table.note ? [section.table.note, ""] : []),
          ]
        : []),
    ]);
  };

  /** A page: its own article where it has one, as the page shows it; otherwise its short points. */
  const landingPage = (landing: Landing) => {
    const copy = page(landing.key);
    const article = articles[landing.key];
    return [
      `### ${copy.meta.title}`,
      "",
      url(`/${landing.slug}`),
      "",
      copy.subtitle,
      "",
      ...(article ? sections(article) : [...(copy.points ?? []).map((point) => `- **${point.title}:** ${point.body}`), ""]),
      ...table(landing, copy),
      ...copy.faq.flatMap(({ q, a }) => [`**${q}** ${a}`, ""]),
    ];
  };

  /** A guide, section by section. */
  const guidePage = (key: GuideKey, path: string) => {
    const copy = guide(key);
    return [
      `### ${copy.meta.title}`,
      "",
      url(path),
      "",
      copy.intro,
      "",
      ...sections(copy.sections),
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
    ...keyFacts(),
    ...plans(),
    `## ${HOW_IT_WORKS_TITLE}`,
    "",
    url(HOW_IT_WORKS_PATH),
    "",
    HOW_IT_WORKS_INTRO,
    "",
    ...HOW_IT_WORKS.flatMap((section) => [
      `### ${section.title}`,
      "",
      ...(section.paragraphs ?? []).flatMap((paragraph) => [linked(paragraph), ""]),
      ...(section.items ?? []).map((item) => `- ${linked(item)}`),
      ...(section.items ? [""] : []),
      ...(section.faq ?? []).flatMap(({ q, a }) => [`**${q}** ${linked(a)}`, ""]),
    ]),
    "## Changelog",
    "",
    url(CHANGELOG_PATH),
    "",
    ...CHANGELOG.flatMap((entry) => [`### ${entry.date}: ${entry.title}`, "", ...entry.items.map((item) => `- ${linked(item)}`), ""]),
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
    `## ${BLOG_TITLE}`,
    "",
    BLOG_DESCRIPTION,
    "",
    // A post as it reads: what to take away, its sections, and the sources its [1] markers cite.
    ...posts.flatMap(({ post, copy }) => [
      `### ${copy.meta.title}`,
      "",
      `${url(postPath(post))} (updated ${post.updated})`,
      "",
      copy.intro,
      "",
      ...copy.takeaways.map((point) => `- ${point}`),
      "",
      ...sections(copy.sections),
      `#### ${copy.fit.title}`,
      "",
      copy.fit.body,
      "",
      ...copy.faq.flatMap(({ q, a }) => [`**${q}** ${a}`, ""]),
      "#### Sources",
      "",
      ...copy.sources.map((source, index) => `${index + 1}. [${source.title}](${source.url})${source.note ? `: ${source.note}` : ""}`),
      "",
    ]),
  ].join("\n");
}

export const textResponse = (body: string) =>
  new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
