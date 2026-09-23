import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowUpRight, Mail } from "lucide-react";
import type { Locale } from "@/lib/i18n/routing";
import { pageMetadata } from "@/lib/seo";
import { ORG_ID, pageGraph } from "@/lib/structured-data";
import { SOCIALS } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { COLUMN, Final, MarketingShell } from "@/components/home/Blocks";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE } from "@/components/floor/scenes";
import { Face } from "@/components/ui/Face";
import { SUPPORT_EMAIL } from "@/components/legal/LegalPage";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

const FOUNDER = [
  { label: "jittojoseph.xyz", href: "https://www.jittojoseph.xyz" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/jittojoseph17/" },
  { label: "GitHub", href: "https://github.com/JittoJoseph" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: "about.meta" });
  return pageMetadata({ locale, path: "/about", title: t("title"), description: t("description") });
}

const LINK =
  "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[14px] font-medium transition-colors hover:border-border-strong hover:bg-foreground/[0.03]";

/** Why TinyFloor exists and who makes it, with the ways to reach both. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("about");
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
      <section className={cn(COLUMN, "pb-20 pt-12 sm:pb-28 sm:pt-20")}>
        <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-brand">{t("eyebrow")}</p>
        <h1 className="mt-4 max-w-[18ch] text-balance text-[38px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[58px]">{t("title")}</h1>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
          <div className="grid content-start gap-5 text-pretty text-[17px] leading-relaxed text-foreground/80 sm:text-[18px]">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
            <p>{t("p3")}</p>
          </div>
          <FloorScene {...EVERYONE} view={[17, 2, 22, 16]} className="aspect-[4/3] w-full self-start rounded-[28px] border border-border" />
        </div>

        <div className="mt-16 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-5 rounded-[28px] border border-border bg-card p-6 sm:flex-row sm:p-8 [--face-ring:var(--ui-card)]">
            <Face seed="jitto-joseph" size={72} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[22px] font-semibold tracking-tight">{t("founderTitle")}</h2>
              <p className="mt-2 text-pretty text-[15.5px] leading-relaxed text-muted-foreground">{t("founderBody")}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {FOUNDER.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className={LINK}>
                    {link.label}
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col rounded-[28px] bg-foreground/[0.045] p-6 sm:p-8">
            <h2 className="text-[17px] font-semibold tracking-tight">{t("elsewhere")}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" className={LINK}>
                LinkedIn
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </a>
              <a href={SOCIALS.x} target="_blank" rel="noopener noreferrer" className={LINK}>
                X
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </a>
            </div>
            <h2 className="mt-8 text-[17px] font-semibold tracking-tight">{t("contact")}</h2>
            <a href={`mailto:${SUPPORT_EMAIL}`} className={cn(LINK, "mt-4 w-fit")}>
              <Mail className="size-4 text-muted-foreground" />
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </section>
      <Final />
    </MarketingShell>
  );
}
