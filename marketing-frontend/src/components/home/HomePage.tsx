import { useTranslations } from "next-intl";
import { Closing, Hero, MarketingShell, Questions } from "./Blocks";
import { ChatSection, Countries, Extras, MeetSection, OpenSection, PresenceSection, PriceSection, Statement } from "./HomeSections";

/**
 * The home page: one statement over the app running, then where teams work,
 * what TinyFloor is in one sentence, the floor's parts as the app draws them,
 * the plans, the open code, the questions and the last ask.
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
      <Countries />
      <Statement />
      <PresenceSection />
      <MeetSection />
      <ChatSection />
      <Extras />
      <PriceSection />
      <OpenSection />
      <Questions items={faqs} />
      <Closing />
    </MarketingShell>
  );
}
