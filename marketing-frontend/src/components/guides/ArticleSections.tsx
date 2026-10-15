import type { GuideSection } from "@/lib/guides";
import { cn } from "@/lib/utils";
import { CJK_HEADLINE } from "@/components/home/Blocks";

/** The column long text is read in: narrow enough for its lines to stay easy. */
export const READ = "mx-auto w-full max-w-[44rem]";

type Numbered = Omit<GuideSection, "items"> & { items?: Array<NonNullable<GuideSection["items"]>[number] & { number: number }> };

/** Items with a detail line (an activity, a product reviewed) are numbered on through the whole text. */
export function numberItems(sections: GuideSection[]): Numbered[] {
  let number = 0;
  return sections.map((section) => ({
    ...section,
    items: section.items?.map((item) => ({ ...item, number: item.detail ? ++number : 0 })),
  }));
}

/** A list of the sections, each linking to its place below. */
export function ArticleContents({ sections, label }: { sections: GuideSection[]; label: string }) {
  return (
    <div className={cn(READ, "rounded-[22px] bg-muted/80 p-6 sm:p-7")}>
      <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-faint">{label}</p>
      <ol className="mt-4 grid gap-2.5 text-[15px]">
        {sections.map((section, index) => (
          <li key={section.title} className="flex gap-3">
            <span className="w-5 shrink-0 tabular-nums text-faint">{index + 1}</span>
            <a href={`#section-${index + 1}`} className="text-foreground/85 transition-colors hover:text-foreground hover:underline hover:underline-offset-4">
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Long text in sections, as the guides and the pages written for a search
 * read: paragraphs, numbered cards or a bulleted list, and tables that scroll
 * inside their card on a phone.
 */
export function ArticleSections({ sections }: { sections: Numbered[] }) {
  return sections.map((section, index) => (
    <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-24 pt-16 sm:pt-20">
      <h2 className={cn("text-balance text-[27px] font-normal leading-[1.12] tracking-[-0.035em] sm:text-[34px]", CJK_HEADLINE)}>{section.title}</h2>
      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mt-5 text-pretty text-[17px] leading-[1.75] text-foreground/80">
          {paragraph}
        </p>
      ))}
      {section.items && section.items.some((item) => item.number) ? (
        <ol className="mt-8 grid gap-3">
          {section.items.map((item) => (
            <li key={item.title} className="rounded-[20px] bg-muted/80 p-5 sm:p-6">
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-brand">{item.number}.</span>
                <div className="min-w-0">
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em]">{item.title}</h3>
                  {item.detail && <p className="mt-1 text-[13px] text-faint">{item.detail}</p>}
                  <p className="mt-2.5 text-[15.5px] leading-[1.65] text-muted-foreground">{item.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        section.items && (
          <ul className="mt-6 grid gap-4">
            {section.items.map((item) => (
              <li key={item.title} className="relative ps-6 text-[17px] leading-[1.7] text-foreground/80">
                <span aria-hidden className="absolute start-0 top-[0.7em] size-1.5 rounded-full bg-brand" />
                <strong className="font-semibold text-foreground">{item.title}.</strong> {item.body}
              </li>
            ))}
          </ul>
        )
      )}
      {section.table && (
        <figure className="mt-8">
          {/* Wide on a phone: the table scrolls inside its card rather than the page. */}
          <div className="overflow-x-auto rounded-[20px] bg-muted/80">
            <table className="w-full min-w-[34rem] border-collapse text-start text-[14.5px] leading-[1.5]">
              <thead>
                <tr>
                  {section.table.head.map((cell) => (
                    <th key={cell} scope="col" className="px-4 pb-2.5 pt-4 text-start text-[12.5px] font-medium text-muted-foreground first:ps-5 last:pe-5">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-foreground/[0.06]">
                    {row.map((cell, column) =>
                      column === 0 ? (
                        <th key={column} scope="row" className="whitespace-nowrap px-4 py-3 text-start font-semibold text-foreground first:ps-5">
                          {cell}
                        </th>
                      ) : (
                        <td key={column} className="px-4 py-3 text-foreground/80 last:pe-5">
                          {cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {section.table.note && <figcaption className="mt-3 text-[13px] leading-[1.55] text-faint">{section.table.note}</figcaption>}
        </figure>
      )}
    </section>
  ));
}
