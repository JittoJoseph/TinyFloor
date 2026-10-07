import { useTranslations } from "next-intl";
import { Closing, Everything, FloorMoments, Hero, MarketingShell, OpenSource, Plans, Questions } from "./Blocks";

/**
 * The home page: one statement over the app running, the floor's three
 * moments, everything else, the plans, the open code, the questions and the
 * last ask. Every section carries an anchor (#floor, #people, #meetings,
 * #chat, #invites, #plans, #source, #faq).
 */
export function HomePage({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const t = useTranslations("homepage.hero");
  return (
    <MarketingShell oneTap>
      <Hero
        title={
          <>
            {t("title")}
            <span className="block text-foreground/55">{t("muted")}</span>
          </>
        }
        body={t("body")}
      />
      <FloorMoments className="mt-20 sm:mt-40" />
      <Everything />
      <Plans />
      <OpenSource />
      <Questions items={faqs} />
      <Closing />
    </MarketingShell>
  );
}
