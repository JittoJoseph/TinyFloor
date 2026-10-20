import { cn } from "@/lib/utils";
import { CJK_HEADLINE } from "@/components/home/Blocks";
import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import type { IcebreakersContent } from "@/lib/tools/icebreakers";
import { IcebreakerPicker } from "./IcebreakerPicker";
import { ToolPage } from "./ToolPage";

/**
 * A free tool that is a list to draw from (icebreakers, would-you-rather
 * questions, two-truths-and-a-lie ideas): the picker up top, then how to run
 * it, every entry by group, and what makes a good one.
 */
export function QuestionListPage({
  locale,
  path,
  updated,
  content: copy,
}: {
  locale: string;
  path: string;
  updated: string;
  content: IcebreakersContent;
}) {
  const groups = copy.groups;
  // The how-to's steps are numbered; the lists carry their own numbers.
  const howTo = numberItems(copy.howTo);
  const rules = numberItems(copy.rules);
  const listed = howTo.length + 1;

  return (
    <ToolPage
      locale={locale}
      path={path}
      updated={updated}
      copy={copy}
      tool={
        <IcebreakerPicker
          groups={groups}
          labels={{ all: copy.picker.all, another: copy.picker.another, copy: copy.picker.copy, copied: copy.picker.copied }}
        />
      }
    >
      <ArticleSections sections={howTo} />

      {groups.map((group, index) => (
        <section key={group.key} id={`section-${listed + index}`} className="scroll-mt-24 pt-16 sm:pt-20">
          <h2 className={cn("text-balance text-[27px] font-normal leading-[1.12] tracking-[-0.035em] sm:text-[34px]", CJK_HEADLINE)}>
            {group.title}
          </h2>
          <p className="mt-5 text-pretty text-[17px] leading-[1.75] text-foreground/80">{group.when}</p>
          <ol className="mt-6 grid gap-x-8 gap-y-3 rounded-[20px] bg-muted/80 p-5 sm:p-6">
            {group.questions.map((question, number) => (
              <li key={question} className="flex gap-3 text-[16px] leading-[1.6] text-foreground/85">
                <span className="w-6 shrink-0 text-end tabular-nums text-faint">{number + 1}</span>
                {question}
              </li>
            ))}
          </ol>
        </section>
      ))}

      <ArticleSections sections={rules} first={listed + groups.length} />
    </ToolPage>
  );
}
