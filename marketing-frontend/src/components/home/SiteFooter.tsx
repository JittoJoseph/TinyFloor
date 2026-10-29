import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, ChevronDown, Globe } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { locales, type Locale } from "@/lib/i18n/routing";
import { GUIDES_PATH, guidePath } from "@/lib/guides";
import { guideCopies } from "@/lib/guide-copy";
import { TOOLS_PATH, hasPage } from "@/lib/tools/catalog";
import { FEW_TOOL_NAMES } from "@/lib/tools/hub-copy";
import { HUBS, LANDINGS, landingByKey, type Landing, type LandingGroup } from "@/lib/landings";
import { SOCIALS, SUPPORT_EMAIL } from "@/lib/site";
import { Logo } from "@/components/app/Logo";
import { TOP_ALTERNATIVES, TOP_TOOLS, topGuidesIn } from "./HomeNav";
import { ThemeSwitch } from "./ThemeSwitch";

const GITHUB_PATH =
  "M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58l-.01-2.04c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.6 4.6 0 0 1 1.23 3.22c0 4.61-2.81 5.62-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3";

/** GitHub's mark, for the home page's open-source card. */
export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d={GITHUB_PATH} />
    </svg>
  );
}

/** The company's own accounts and its source code, as their marks. */
const ELSEWHERE = [
  {
    label: "LinkedIn",
    href: SOCIALS.linkedin,
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z",
  },
  {
    label: "X",
    href: SOCIALS.x,
    path: "M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41z",
  },
  {
    label: "GitHub",
    href: SOCIALS.github,
    path: GITHUB_PATH,
  },
];

/**
 * Directories that list TinyFloor, as their own badges in a light and a dark
 * version. Set the same height and in grey, so two sites' colours sit
 * quietly together; each takes its colour back on hover.
 */
const FEATURED = [
  {
    name: "Fazier",
    href: "https://fazier.com/launches/tinyfloor",
    light: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=light",
    dark: "https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=launched&theme=dark",
    width: 75,
  },
  {
    name: "Twelve Tools",
    href: "https://twelve.tools",
    light: "https://twelve.tools/badge1-light.svg",
    dark: "https://twelve.tools/badge1-dark.svg",
    width: 119,
  },
];

type FooterLink = { label: string; href: string; all?: boolean };

/**
 * The footer, in three bands. The mark, the one line and the company's
 * accounts; then six columns (the product, teams, use cases, comparisons,
 * guides, free tools), each ending with its index so every page a crawler
 * should know is one hop away; then one quiet row for the company and the
 * fine print, the language and the theme.
 */
export async function SiteFooter({ path = "/" }: { path?: string }) {
  const t = await getTranslations("home.footer");
  const tn = await getTranslations("home.nav");
  const tl = await getTranslations("landings");
  const tg = await getTranslations("guides");
  const ts = await getTranslations("shell");
  const locale = await getLocale();
  const current = locales.find((one) => one.code === locale) ?? locales[0];
  const guides = await guideCopies(locale);

  const label = (page: Landing) => (page.competitor || page.product ? t("vs", { name: (page.competitor ?? page.product)! }) : tl(`pages.${page.key}.label`));
  const pagesOf = (group: LandingGroup): FooterLink[] => [
    ...LANDINGS.filter((page) => page.group === group).map((page) => ({ label: label(page), href: `/${page.slug}` })),
    { label: tl("all"), href: `/${HUBS[group]}`, all: true },
  ];
  const toolName = (tool: (typeof TOP_TOOLS)[number]) => (tool.name ? t(tool.name) : (FEW_TOOL_NAMES[locale as Locale]?.[tool.path] ?? ""));

  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t("product"),
      links: [
        ...pagesOf("features").filter((link) => !link.all),
        { label: tn("pricing"), href: "/pricing" },
        { label: t("lobby"), href: "/lobby" },
        { label: tl("all"), href: `/${HUBS.features}`, all: true },
      ],
    },
    { title: tl("teams"), links: pagesOf("teams") },
    { title: tl("useCases"), links: pagesOf("useCases") },
    {
      title: t("compare"),
      links: [
        ...TOP_ALTERNATIVES.map(landingByKey).map((page) => ({ label: label(page), href: `/${page.slug}` })),
        { label: tl("all"), href: `/${HUBS.compare}`, all: true },
      ],
    },
    {
      title: tg("label"),
      links: [
        ...topGuidesIn(locale).map((guide) => ({ label: guides[guide.key].label, href: guidePath(guide) })),
        { label: tg("all"), href: GUIDES_PATH, all: true },
      ],
    },
    {
      title: t("tools"),
      links: [
        ...TOP_TOOLS.filter((tool) => toolName(tool)).map((tool) => ({ label: toolName(tool), href: tool.path })),
        { label: tl("all"), href: TOOLS_PATH, all: true },
      ],
    },
  ];

  const company: FooterLink[] = [
    { label: t("about"), href: "/about" },
    { label: t("contact"), href: `mailto:${SUPPORT_EMAIL}` },
    { label: t("faq"), href: "/#faq" },
    { label: t("privacy"), href: "/privacy" },
    { label: t("terms"), href: "/terms" },
    { label: t("refunds"), href: "/refunds" },
    { label: t("credits"), href: "/credits.txt" },
  ];

  return (
    <footer className="pb-10 pt-16 sm:pt-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col gap-6 border-t border-border pt-12 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.02em]">
              <Logo size={28} />
              TinyFloor
            </Link>
            <p className="mt-3 max-w-[22rem] text-[14px] leading-[1.6] text-muted-foreground">{t("tagline")}</p>
            <ul className="mt-5 flex flex-wrap items-center gap-3">
              {FEATURED.map((badge) => (
                <li key={badge.href}>
                  <a
                    href={badge.href}
                    target="_blank"
                    rel="noopener"
                    className="block opacity-70 grayscale transition-[opacity,filter] duration-300 hover:opacity-100 hover:grayscale-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={badge.light} alt={`TinyFloor on ${badge.name}`} width={badge.width} height={32} loading="lazy" className="h-8 w-auto dark:hidden" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={badge.dark} alt={`TinyFloor on ${badge.name}`} width={badge.width} height={32} loading="lazy" className="hidden h-8 w-auto dark:block" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <span className="-ms-2 flex items-center text-muted-foreground sm:ms-0">
            {ELSEWHERE.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`TinyFloor on ${link.label}`}
                className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                  <path d={link.path} />
                </svg>
              </a>
            ))}
          </span>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={
                        link.all
                          ? "inline-flex items-center gap-1 text-[13.5px] font-medium text-foreground/80 transition-colors hover:text-foreground"
                          : "text-[13.5px] leading-snug text-muted-foreground transition-colors hover:text-foreground"
                      }
                    >
                      {link.label}
                      {link.all && <ArrowRight className="size-3 rtl:rotate-180" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-border pt-6 lg:flex-row lg:items-center lg:justify-between">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
            <li className="text-faint">{t("rights", { year: new Date().getFullYear() })}</li>
            {company.map((link) => (
              <li key={link.href}>
                {/* A mail address and a text file aren't pages: no locale in front of them. */}
                {link.href.startsWith("mailto:") || link.href.endsWith(".txt") ? (
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                ) : (
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <details className="group relative">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 text-[13px] text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
                <Globe className="size-3.5" aria-hidden />
                <span className="sr-only">{t("language")}: </span>
                {current.label}
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="absolute bottom-10 end-0 z-10 max-h-72 w-56 overflow-y-auto rounded-2xl bg-popover p-1.5 shadow-float">
                {locales.map((one) => (
                  <li key={one.code}>
                    {/* A page not written in that language (some free tools) leads to its home instead. */}
                    <Link
                      href={hasPage(path, one.code) ? path : "/"}
                      locale={one.code}
                      hrefLang={one.code}
                      aria-current={one.code === locale ? "true" : undefined}
                      className="flex h-8 items-center justify-between gap-2 rounded-[10px] px-2.5 text-[13px] text-foreground hover:bg-muted aria-[current]:font-semibold"
                    >
                      <span dir={one.dir}>{one.label}</span>
                      {one.label !== one.enName && <span className="text-[12px] text-faint">{one.enName}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
            <ThemeSwitch className="border-0 bg-foreground/[0.05]" label={t("theme")} names={{ system: ts("themes.system"), light: ts("themes.light"), dark: ts("themes.dark") }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
