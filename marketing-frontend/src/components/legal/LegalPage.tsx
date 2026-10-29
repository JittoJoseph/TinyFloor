import type { ReactNode } from "react";
import { COLUMN, MarketingShell } from "@/components/home/Blocks";
import { cn } from "@/lib/utils";
import { SUPPORT_EMAIL } from "@/lib/site";

export { SUPPORT_EMAIL };

/** Sections of a legal page, each with a heading and an anchor to link to. */
export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * A legal page, set like a letter: one column of reading width on the left of
 * the page, the title and its date, a sentence on what the page is, and the
 * sections in large, quiet type. Paragraphs open with their point in bold
 * where a section lists several things. Written in English, and marked as
 * English, whichever language the site is in; `note` says so in the reader's
 * language.
 */
export function LegalPage({
  path,
  title,
  updated,
  intro,
  sections,
  note,
}: {
  path: string;
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
  note?: string;
}) {
  return (
    <MarketingShell path={path}>
      <article lang="en" dir="ltr" className={cn(COLUMN, "pb-24 pt-32 sm:pb-32 sm:pt-40")}>
        <div className="max-w-[760px]">
          {note && <p className="mb-6 inline-flex rounded-full bg-muted px-3 py-1 text-[13px] text-muted-foreground">{note}</p>}
          <h1 className="text-[30px] font-normal leading-[1.2] tracking-[-0.012em] sm:text-[34px]">{title}</h1>
          <p className="mt-3 text-[15px] text-faint sm:text-[16px]">Last updated {updated}</p>
          <div className="mt-5 text-[17px] leading-[1.6] text-muted-foreground sm:text-[19px]">{intro}</div>
        </div>

        <div
          className={cn(
            "mt-14 max-w-[760px] text-[17px] leading-[1.6] text-muted-foreground sm:mt-16 sm:text-[19px]",
            "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-foreground/30 [&_a]:underline-offset-4 hover:[&_a]:decoration-foreground",
            "[&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-medium [&_strong]:text-foreground/90",
            "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:ps-5 [&_ul]:marker:text-faint",
          )}
        >
          {sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 [&+&]:mt-12">
              <h2 className="text-[21px] font-normal leading-[1.3] tracking-[-0.012em] text-foreground sm:text-[23px]">{section.title}</h2>
              <div className="[&>*:first-child]:mt-3">{section.body}</div>
            </section>
          ))}
        </div>
      </article>
    </MarketingShell>
  );
}

export const Mail = () => <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>;
