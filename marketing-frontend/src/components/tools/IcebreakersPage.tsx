import { ICEBREAKERS_PATH, ICEBREAKERS_UPDATED, type IcebreakersContent } from "@/lib/tools/icebreakers";
import { QuestionListPage } from "./QuestionListPage";

/** The icebreaker questions tool (lib/tools/icebreakers). */
export function IcebreakersPage({ locale, content }: { locale: string; content: IcebreakersContent }) {
  return <QuestionListPage locale={locale} path={ICEBREAKERS_PATH} updated={ICEBREAKERS_UPDATED} content={content} />;
}
