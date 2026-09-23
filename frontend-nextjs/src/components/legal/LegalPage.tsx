import type { ReactNode } from "react";
import { COLUMN, MarketingShell } from "@/components/home/Blocks";
import { cn } from "@/lib/utils";

/** The contact address for anything about privacy, data or these terms. */
export const SUPPORT_EMAIL = "support@tinyfloor.com";

/** Sections of a legal page, each with a heading and an anchor for the contents list. */
export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * A legal page: its title and date, a short summary, the contents on the side
 * on a wide screen, and the sections in plain, readable type. Written in
 * English, and marked as English, whichever language the site is in; `note`
 * says so in the reader's language.
 */
export function LegalPage({
  path,
  title,
  updated,
  summary,
  sections,
  note,
}: {
  path: string;
  title: string;
  updated: string;
  summary: ReactNode;
  sections: LegalSection[];
  note?: string;
}) {
  return (
    <MarketingShell path={path}>
      <article lang="en" dir="ltr" className={cn(COLUMN, "pb-24 pt-12 sm:pt-20")}>
        {note && <p className="mb-6 inline-flex rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">{note}</p>}
        <h1 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[52px]">{title}</h1>
        <p className="mt-3 text-[14px] text-muted-foreground">Last updated {updated}</p>
        <div className="mt-8 max-w-[44rem] rounded-2xl border border-border bg-card p-5 text-[15.5px] leading-relaxed sm:p-6">{summary}</div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[14rem_minmax(0,44rem)] lg:gap-16">
          <nav aria-label="Contents" className="hidden lg:block">
            <ol className="sticky top-28 grid gap-1.5 text-[13.5px]">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="flex gap-2 text-muted-foreground transition-colors hover:text-foreground">
                    <span className="w-5 shrink-0 tabular-nums text-faint">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="min-w-0">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 border-t border-border py-8 first:border-t-0 first:pt-0">
                <h2 className="text-[21px] font-semibold tracking-tight">
                  <span className="me-2 tabular-nums text-faint">{index + 1}.</span>
                  {section.title}
                </h2>
                <div className="mt-4 grid gap-4 text-[15.5px] leading-relaxed text-foreground/85 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_h3]:mt-2 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:ps-1 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:ps-5">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </MarketingShell>
  );
}

export const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
