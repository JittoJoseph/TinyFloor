import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import { OUT_OF_OFFICE_PATH } from "@/lib/tools/catalog";
import { OUT_OF_OFFICE_UPDATED, type OooContent } from "@/lib/tools/out-of-office";
import { OutOfOfficeWriter } from "./OutOfOfficeWriter";
import { ToolPage } from "./ToolPage";

/** The out-of-office message generator (lib/tools/out-of-office): the writer, then examples and setup. */
export function OutOfOfficePage({ locale, content }: { locale: string; content: OooContent }) {
  return (
    <ToolPage
      locale={locale}
      path={OUT_OF_OFFICE_PATH}
      updated={OUT_OF_OFFICE_UPDATED}
      copy={content}
      tool={<OutOfOfficeWriter locale={locale} copy={content.writer} />}
    >
      <ArticleSections sections={numberItems(content.sections)} />
    </ToolPage>
  );
}
