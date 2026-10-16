import { ArticleSections, numberItems } from "@/components/guides/ArticleSections";
import { TIME_ZONES_PATH, TIME_ZONES_UPDATED, type TimeZonesContent } from "@/lib/tools/time-zones";
import { TimeZonePlanner } from "./TimeZonePlanner";
import { ToolPage } from "./ToolPage";

/**
 * The time zone meeting planner (lib/tools/time-zones): the planner up top,
 * then how much overlap a team needs, finding a fair time, what to do with
 * none, and summer time.
 */
export function TimeZonesPage({ locale, content: copy }: { locale: string; content: TimeZonesContent }) {
  return (
    <ToolPage
      locale={locale}
      path={TIME_ZONES_PATH}
      updated={TIME_ZONES_UPDATED}
      copy={copy}
      tool={<TimeZonePlanner locale={locale} labels={copy.planner} />}
    >
      <ArticleSections sections={numberItems(copy.sections)} />
    </ToolPage>
  );
}
