import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import { STANDUP_PATH } from "@/lib/tools/catalog";
import { STANDUP_UPDATED, type StandupContent } from "@/lib/tools/standup";
import { StandupBuilder } from "./StandupBuilder";
import { ToolPage } from "./ToolPage";

/** The daily standup template (lib/tools/standup): the builder, then the guide to running one. */
export function StandupPage({ locale, content }: { locale: string; content: StandupContent }) {
  return (
    <ToolPage locale={locale} path={STANDUP_PATH} updated={STANDUP_UPDATED} copy={content} tool={<StandupBuilder copy={content.builder} />}>
      <ArticleSections sections={numberItems(content.sections)} />
    </ToolPage>
  );
}
