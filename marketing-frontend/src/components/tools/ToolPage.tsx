import type { ReactNode } from "react";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { absoluteUrl, articleNode, faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { cn } from "@/lib/utils";
import { emphasised } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, Closing, EYEBROW, INK, LEAD, MarketingShell, Questions } from "@/components/home/Blocks";
import { READ } from "@/components/guides/ArticleSections";
import { RelatedTools } from "./RelatedTools";

/** What every free tool's page says around the tool itself (lib/tools). */
export interface ToolCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  /** The word before the date the page was last updated. */
  updated: string;
  title: string;
  intro: string;
  fit: { title: string; body: string; cta: string };
  faqTitle: string;
  faq: Array<{ q: string; a: string }>;
}

/**
 * A free tool's page: the headline, the tool, then its article in the guides'
 * column, where TinyFloor fits, and the FAQ. Written in the page's own language.
 */
export function ToolPage({
  locale,
  path,
  updated,
  copy,
  tool,
  children,
}: {
  locale: string;
  path: string;
  /** YYYY-MM-DD. */
  updated: string;
  copy: ToolCopy;
  tool: ReactNode;
  children: ReactNode;
}) {
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${updated}T00:00:00Z`),
  );

  return (
    <MarketingShell path={path} oneTap>
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          name: copy.meta.title,
          description: copy.meta.description,
          mainEntity: `${absoluteUrl(locale, path)}#article`,
          nodes: [
            articleNode({ locale, path, headline: copy.meta.title, description: copy.meta.description, published: updated, updated }),
            faqNode(locale, path, copy.faq),
          ],
        })}
      />

      <article lang={locale}>
        <header className={cn(COLUMN, "pt-32 sm:pt-44")}>
          <div className={READ}>
            <p className={EYEBROW}>{copy.eyebrow}</p>
            <h1
              className={cn(
                "mt-6 text-balance text-[36px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[56px]",
                CJK_HEADLINE,
              )}
            >
              {emphasised(copy.title, locale, "text-muted-foreground/75")}
            </h1>
            <p className={cn(LEAD, "mt-7")}>{copy.intro}</p>
            <p className="mt-7 text-[14px] text-muted-foreground">
              {copy.updated} <time dateTime={updated}>{date}</time>
            </p>
          </div>
        </header>

        <div className={cn(COLUMN, "mt-12 sm:mt-14")}>
          <div className={READ}>{tool}</div>
        </div>

        <div className={cn(COLUMN, "pb-20 sm:pb-28")}>
          <div className={READ}>
            {children}

            <aside className="mt-16 rounded-[24px] bg-brand/[0.07] p-6 sm:mt-20 sm:p-8">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{copy.fit.title}</h2>
              <p className="mt-3 text-[16px] leading-[1.7] text-foreground/80">{copy.fit.body}</p>
              <div className="mt-6">
                <Link href="/lobby" data-cta="tool" className={INK}>
                  {copy.fit.cta}
                </Link>
              </div>
            </aside>

            <RelatedTools locale={locale} path={path} />
          </div>
        </div>
      </article>

      <Questions items={copy.faq} title={emphasised(copy.faqTitle, locale, "text-muted-foreground/75")} />

      <Closing />
    </MarketingShell>
  );
}
