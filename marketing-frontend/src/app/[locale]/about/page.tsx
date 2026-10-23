import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Mail } from "@/components/ui/icons";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { ORG_ID, pageGraph } from "@/lib/structured-data";
import { AUTHOR, SOCIALS } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { COLUMN, CJK_HEADLINE, Closing, EYEBROW, LEAD, MarketingShell } from "@/components/home/Blocks";
import { GitHubMark } from "@/components/home/SiteFooter";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE } from "@/components/floor/scenes";
import { SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "about.meta" });
  return pageMetadata({ locale, path: "/about", title: t("title"), description: t("description") });
}

const BELIEFS = ["presence", "price", "browser"] as const;

/** A link out: a quiet outlined pill. */
const PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-[13.5px] font-medium text-foreground transition-colors hover:bg-foreground/[0.05]";
/** A card in the team row. */
const CARD = "flex flex-col rounded-[22px] border border-border p-6 sm:p-7";
const H2 = "text-[22px] font-normal tracking-[-0.025em] text-foreground sm:text-[26px]";

function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={PILL}>
      {children}
      <ArrowUpRight className="size-3.5 text-muted-foreground" />
    </a>
  );
}

/** One part of the page: a hairline, its heading, then what it says. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn(COLUMN, "mt-16 sm:mt-20")}>
      <div className="border-t border-border pt-10 sm:pt-12">
        <h2 className={H2}>{title}</h2>
        <div className="mt-6 sm:mt-8">{children}</div>
      </div>
    </section>
  );
}

/**
 * Who we are, as a company's About page: what TinyFloor is, why it exists,
 * what it holds to, who's behind it and where its code lives, and how to
 * reach us. Short on purpose: every part fits a screen, read top to bottom.
 */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("about");
  const initials = AUTHOR.name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <MarketingShell path="/about">
      <JsonLd
        schema={pageGraph({
          locale,
          path: "/about",
          type: "AboutPage",
          name: t("meta.title"),
          description: t("meta.description"),
          mainEntity: ORG_ID,
        })}
      />

      <header className={cn(COLUMN, "pt-32 sm:pt-40")}>
        <p className={EYEBROW}>{t("eyebrow")}</p>
        <h1
          className={cn(
            "mt-5 max-w-[17ch] text-balance text-[38px] font-normal leading-[1.05] tracking-[-0.045em] min-[400px]:text-[42px] sm:text-[60px]",
            CJK_HEADLINE,
          )}
        >
          {t("title")}
        </h1>
        <p className={cn(LEAD, "mt-6 max-w-[36rem]")}>{t("intro")}</p>
      </header>

      <div className={cn(COLUMN, "mt-12 sm:mt-16")}>
        <FloorScene {...EVERYONE} view={[6, 3, 35, 14]} className="aspect-[5/2] w-full rounded-[22px] sm:rounded-[28px]" />
      </div>

      <Section title={t("why.title")}>
        <p className="max-w-[44rem] text-pretty text-[17px] leading-[1.65] text-foreground/80 sm:text-[18.5px]">{t("why.body")}</p>
      </Section>

      <Section title={t("beliefs.title")}>
        <ul className="grid gap-8 sm:grid-cols-3 sm:gap-10">
          {BELIEFS.map((key) => (
            <li key={key}>
              <h3 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">{t(`beliefs.${key}.title`)}</h3>
              <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground">{t(`beliefs.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t("team.title")}>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <div className={CARD}>
            <div className="flex items-center gap-4">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-foreground text-[17px] text-background">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="text-[17px] font-medium tracking-[-0.01em] text-foreground">{AUTHOR.name}</p>
                <p className="text-[14px] text-muted-foreground">{t("team.role")}</p>
              </div>
            </div>
            <p className="mt-5 flex-1 text-pretty text-[15px] leading-relaxed text-muted-foreground">{t("team.body")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Out href={AUTHOR.linkedin}>LinkedIn</Out>
              <Out href={AUTHOR.url}>{t("team.website")}</Out>
            </div>
          </div>

          <div className={CARD}>
            <div className="flex items-center gap-4">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-foreground text-background">
                <GitHubMark className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-[17px] font-medium tracking-[-0.01em] text-foreground">{t("source.title")}</p>
                <p className="text-[14px] text-muted-foreground">AGPL-3.0</p>
              </div>
            </div>
            <p className="mt-5 flex-1 text-pretty text-[15px] leading-relaxed text-muted-foreground">{t("source.body")}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={SOCIALS.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 text-[13.5px] font-medium text-background transition-colors hover:bg-foreground/85"
              >
                <GitHubMark className="size-4" />
                {t("source.star")}
              </a>
            </div>
          </div>
        </div>
      </Section>

      <Section title={t("contact.title")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-[30rem] text-pretty text-[15.5px] leading-relaxed text-muted-foreground">{t("contact.body")}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${SUPPORT_EMAIL}`} className={PILL}>
              <Mail className="size-4 text-muted-foreground" />
              {SUPPORT_EMAIL}
            </a>
            <Out href={SOCIALS.linkedin}>LinkedIn</Out>
            <Out href={SOCIALS.x}>X</Out>
          </div>
        </div>
      </Section>

      <div className="mt-24 sm:mt-32">
        <Closing />
      </div>
    </MarketingShell>
  );
}
