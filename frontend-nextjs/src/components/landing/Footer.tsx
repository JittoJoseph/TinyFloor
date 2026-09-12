import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LANDINGS, LANDING_GROUPS } from "@/lib/landings";

const elsewhere = [
  { label: "GitHub", href: "https://github.com/JittoJoseph" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jittojoseph17/" },
  { label: "Portfolio", href: "https://www.jittojoseph.xyz" },
];

const linkClass =
  "cursor-pointer font-body text-sm text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:text-[var(--color-braun-orange)] transition-all";

const headingClass =
  "font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-35 mb-4";

export const Footer: React.FC = () => {
  const t = useTranslations("footer");
  const tc = useTranslations("common");
  const tl = useTranslations("landings");

  const columns = [
    {
      title: t("product"),
      links: [
        { label: tc("rooms"), href: "/rooms" },
        { label: tc("people"), href: "/people" },
        { label: tc("createRoom"), href: "/create-room" },
        { label: tc("dashboard"), href: "/dashboard" },
      ],
    },
    {
      title: t("learn"),
      links: [
        { label: t("tour"), href: "/#how-it-works" },
        { label: t("twoWays"), href: "/#start" },
        { label: tc("questions"), href: "/#faq" },
      ],
    },
    ...LANDING_GROUPS.map((group) => ({
      title: tl(group),
      links: LANDINGS.filter((page) => page.group === group).map((page) => ({
        label: tl(`pages.${page.key}.label`),
        href: `/${page.slug}`,
      })),
    })),
  ];

  return (
    <footer className="w-full bg-[var(--color-braun-bg)] border-t border-black/10 py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-10">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="font-body font-bold text-xl tracking-tight text-[var(--color-braun-text)]">
              SpatialMeet
            </div>
            <p className="font-body text-sm text-[var(--color-braun-text)] opacity-50 mt-3 max-w-xs leading-relaxed">
              {t("tagline")}
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className={headingClass}>{column.title}</h2>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <nav aria-label={t("elsewhere")}>
            <h2 className={headingClass}>{t("elsewhere")}</h2>
            <ul className="flex flex-col gap-2.5">
              {elsewhere.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-black/10 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4">
          <span className="font-body text-xs text-[var(--color-braun-text)] opacity-40">
            {t("rights", { year: new Date().getFullYear() })}
          </span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  );
};
