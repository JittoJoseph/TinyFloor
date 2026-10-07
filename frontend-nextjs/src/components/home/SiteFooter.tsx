import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, Globe } from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { locales } from "@/lib/i18n/routing";
import { GUIDES_PATH } from "@/lib/guides";
import { HUBS, LANDINGS, type LandingGroup } from "@/lib/landings";
import { SOCIALS, SUPPORT_EMAIL } from "@/lib/site";
import { Logo } from "@/components/app/Logo";
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

/** How many comparisons the footer lists before leading to the rest. */
const COMPARE_IN_FOOTER = 8;

/**
 * The footer: the mark and one line, then five columns (the product and its
 * features, teams, use cases, comparisons, the company), then one quiet row
 * for the theme, the language and the fine print. Every column but the last
 * ends with its index, so each page a crawler should know is one hop away.
 */
export function SiteFooter({ path = "/" }: { path?: string }) {
  const t = useTranslations("home.footer");
  const tn = useTranslations("home.nav");
  const tl = useTranslations("landings");
  const tg = useTranslations("guides");
  const ts = useTranslations("shell");
  const locale = useLocale();
  const current = locales.find((one) => one.code === locale) ?? locales[0];

  const pagesOf = (group: LandingGroup, limit = Infinity): Array<{ label: string; href: string; all?: boolean }> => [
    ...LANDINGS.filter((page) => page.group === group)
      .slice(0, limit)
      .map((page) => ({
        label: page.competitor || page.product ? t("vs", { name: (page.competitor ?? page.product)! }) : tl(`pages.${page.key}.label`),
        href: `/${page.slug}`,
      })),
    { label: tl("all"), href: `/${HUBS[group]}`, all: true },
  ];

  const columns: Array<{ title: string; links: Array<{ label: string; href: string; all?: boolean }> }> = [
    {
      title: t("product"),
      links: [
        ...pagesOf("features").filter((link) => !link.all),
        { label: tn("pricing"), href: "/pricing" },
        { label: t("lobby"), href: "/lobby" },
        { label: t("signIn"), href: "/auth" },
      ],
    },
    { title: tl("teams"), links: pagesOf("teams") },
    { title: tl("useCases"), links: pagesOf("useCases") },
    { title: t("compare"), links: pagesOf("compare", COMPARE_IN_FOOTER) },
    {
      title: t("resources"),
      links: [
        { label: tl("features"), href: `/${HUBS.features}` },
        { label: tg("label"), href: GUIDES_PATH },
        { label: t("about"), href: "/about" },
        { label: t("contact"), href: `mailto:${SUPPORT_EMAIL}` },
        { label: t("faq"), href: "/#faq" },
        { label: t("privacy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
        { label: t("refunds"), href: "/refunds" },
        { label: t("credits"), href: "/credits.txt" },
      ],
    },
  ];

  const linkClass = "text-[14px] text-muted-foreground transition-colors hover:text-foreground";
  return (
    <footer className="pb-10 pt-16 sm:pt-24">
      <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8">
        <div className="flex flex-col gap-4 border-t border-border pt-12 sm:flex-row sm:items-end sm:justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.02em]">
            <Logo size={28} />
            TinyFloor
          </Link>
          <p className="max-w-[22rem] text-[14px] leading-[1.6] text-muted-foreground sm:text-end">{t("tagline")}</p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[13px] font-medium text-foreground">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {/* A mail address isn't a page: no locale in front of it. */}
                    {link.href.startsWith("mailto:") ? (
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={link.all ? "inline-flex items-center gap-1 text-[13.5px] font-medium text-foreground/80 hover:text-foreground" : linkClass}>
                        {link.label}
                        {link.all && <ArrowRight className="size-3 rtl:rotate-180" />}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-16 flex flex-col-reverse gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <p className="text-[13px] text-faint">{t("rights", { year: new Date().getFullYear() })}</p>
            <span className="flex items-center text-muted-foreground">
              {ELSEWHERE.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`TinyFloor on ${link.label}`}
                  className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="size-[15px] fill-current" aria-hidden>
                    <path d={link.path} />
                  </svg>
                </a>
              ))}
            </span>
          </div>
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
                    <Link
                      href={path}
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
