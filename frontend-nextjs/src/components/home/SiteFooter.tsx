import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, Globe } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { locales } from "@/lib/i18n/routing";
import { LANDINGS } from "@/lib/landings";
import { Logo } from "@/components/app/AppShell";
import { SOCIALS } from "@/lib/site";
import { ThemeSwitch } from "./ThemeSwitch";

/** The company's own accounts, as their marks. */
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
];

/**
 * The site's footer: every marketing page one click away, in columns, then the
 * theme and the language. The language list is plain links, so it works (and
 * is crawled) without a script; `path` is where each language should land.
 */
export function SiteFooter({ path = "/" }: { path?: string }) {
  const t = useTranslations("home.footer");
  const tl = useTranslations("landings");
  const ts = useTranslations("shell");
  const locale = useLocale();
  const current = locales.find((one) => one.code === locale) ?? locales[0];

  const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: t("product"),
      links: [
        { label: t("makeOffice"), href: "/create" },
        { label: t("lobby"), href: "/lobby" },
        { label: t("signIn"), href: "/auth" },
        { label: t("dashboard"), href: "/dashboard" },
      ],
    },
    {
      title: t("useCases"),
      links: LANDINGS.filter((page) => page.group === "useCases").map((page) => ({
        label: tl(`pages.${page.key}.label`),
        href: `/${page.slug}`,
      })),
    },
    {
      title: t("compare"),
      links: LANDINGS.filter((page) => page.group === "compare").map((page) => ({
        label: page.competitor ? t("vs", { name: page.competitor }) : tl(`pages.${page.key}.label`),
        href: `/${page.slug}`,
      })),
    },
    {
      title: t("resources"),
      links: [
        { label: t("about"), href: "/about" },
        { label: t("faq"), href: "/#faq" },
        { label: t("privacy"), href: "/privacy" },
        { label: t("terms"), href: "/terms" },
        { label: t("credits"), href: "/credits.txt" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-rail">
      <div className="mx-auto w-full max-w-[1200px] px-5 pb-10 pt-14 sm:px-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-[16px] font-semibold tracking-tight">
              <Logo size={28} />
              TinyFloor
            </Link>
            <p className="mt-3 max-w-[16rem] text-[13.5px] leading-relaxed text-muted-foreground">{t("tagline")}</p>
          </div>
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-[13px] font-semibold text-foreground">{column.title}</p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ThemeSwitch
              label={t("theme")}
              names={{ system: ts("themes.system"), light: ts("themes.light"), dark: ts("themes.dark") }}
            />
            <details className="group relative">
              <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] text-foreground [&::-webkit-details-marker]:hidden">
                <Globe className="size-3.5 text-muted-foreground" aria-hidden />
                <span className="sr-only">{t("language")}: </span>
                {current.label}
                <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="absolute bottom-10 start-0 z-10 max-h-72 w-56 overflow-y-auto rounded-2xl border border-border bg-popover p-1.5 shadow-[var(--ui-shadow)]">
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
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
            <span className="flex items-center gap-1">
              {ELSEWHERE.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`TinyFloor on ${link.label}`}
                  className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-muted hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="size-[15px] fill-current" aria-hidden>
                    <path d={link.path} />
                  </svg>
                </a>
              ))}
            </span>
            <span>{t("rights", { year: new Date().getFullYear() })}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
