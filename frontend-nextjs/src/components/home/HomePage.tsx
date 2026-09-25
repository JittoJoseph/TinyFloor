import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AudioLines, Check, Clock3, Languages, MonitorUp, Music2, PenLine, Smartphone } from "lucide-react";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { wholeWords } from "@/lib/words";
import { CJK_HEADLINE, COLUMN, DayCard, Faq, Final, Heading, HeroAsk, INK, LobbyPill, MarketingShell, ProductPreview, STONE, SWIPE, SWIPE_ITEM, Trust } from "./Blocks";
import { Moments, Steps, UseCases } from "./Moments";
import { CAST, Frame } from "./previews/Frame";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { InvitePreview } from "./previews/InvitePreview";

/**
 * The home page, in the app's own design system and theme, built on the real
 * floor: the map the app loads, with people on it. The hero's floor is yours
 * to walk; what the floor is like is set in type with the people in it; the
 * rest is the app doing it, how to start, and who it's for. The page speaks in its own face (Nunito); the app's pieces keep
 * the app's.
 */
export function HomePage({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const t = useTranslations("home");
  return (
    <MarketingShell>
      <Hero />
      <Moments />
      <Everything />
      <Steps />
      <UseCases />
      <Trust />
      <Plans />
      <Faq title={<>{t("faq.title")} <span className="text-muted-foreground/80">{t("faq.muted")}</span></>} items={faqs} />
      <Final />
    </MarketingShell>
  );
}

function Hero() {
  const t = useTranslations("home");
  const locale = useLocale();
  return (
    <section className={cn(COLUMN, "pt-9 sm:pt-24")}>
      <div className="mx-auto flex max-w-[52rem] flex-col items-start text-start sm:items-center sm:text-center">
        <LobbyPill className="hidden sm:inline-flex" />
        <h1
          className={cn(
            "text-balance hyphens-auto text-[40px] font-semibold leading-[1.02] tracking-[-0.038em] sm:mt-8 sm:text-[64px] lg:text-[76px]",
            CJK_HEADLINE,
          )}
        >
          {wholeWords(t("hero.title"), locale)}
        </h1>
        <p className="mt-4 max-w-[38rem] text-pretty text-[15.5px] leading-relaxed text-muted-foreground sm:mt-6 sm:text-[19px]">{t("hero.body")}</p>
        <HeroAsk />
      </div>
      <ProductPreview className="mt-14 sm:mt-20" />
    </section>
  );
}

/** The rest of the app: three cards with the app doing it, then the smaller things in one quiet line. */
function Everything() {
  const t = useTranslations("home");
  const card = (key: "chat" | "people" | "invites") => ({
    title: t(`features.${key}.title`),
    muted: t(`features.${key}.muted`),
    body: t(`features.${key}.body`),
  });
  const extras: Array<{ key: "screen" | "whiteboard" | "music" | "noise" | "mobile" | "languages"; icon: ReactNode }> = [
    { key: "screen", icon: <MonitorUp /> },
    { key: "whiteboard", icon: <PenLine /> },
    { key: "music", icon: <Music2 /> },
    { key: "noise", icon: <AudioLines /> },
    { key: "mobile", icon: <Smartphone /> },
    { key: "languages", icon: <Languages /> },
  ];
  return (
    <section id="features" className={cn(COLUMN, "scroll-mt-20 py-24 sm:py-32")}>
      <Heading title={t("more.title")} muted={t("more.muted")} className="max-w-[22ch]" />
      <div className={cn(SWIPE, "mt-10 sm:mt-12")}>
        <DayCard id="chat" className={SWIPE_ITEM} {...card("chat")}>
          <Frame active="chat" rail={false} className="h-full">
            <ChatPreview compact />
          </Frame>
        </DayCard>
        <DayCard id="people" className={SWIPE_ITEM} {...card("people")}>
          <Frame active="people" rail={false} className="h-full">
            <PeoplePreview mini />
          </Frame>
        </DayCard>
        <DayCard id="invites" className={SWIPE_ITEM} {...card("invites")}>
          <Frame active="people" rail={false} className="h-full">
            <InvitePreview />
          </Frame>
        </DayCard>
      </div>
      <div className="mt-3 grid grid-cols-2 items-center gap-2 rounded-[24px] border border-border/60 p-4 sm:flex sm:flex-wrap sm:px-5">
        <span className="col-span-2 mb-1 ms-1 text-[14px] text-muted-foreground sm:mb-0 sm:me-2">{t("more.also")}</span>
        {extras.map(({ key, icon }) => (
          <span key={key} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground/[0.05] px-3 text-[13.5px] [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
            {icon}
            {t(`more.items.${key}.title`)}
          </span>
        ))}
      </div>
    </section>
  );
}

function Plans() {
  const t = useTranslations("home.plans");
  const items = t.raw("free.items") as string[];
  return (
    <section id="plans" className={cn(COLUMN, "scroll-mt-20 pb-20 sm:pb-28")}>
      <div className="flex flex-col items-start sm:items-center sm:text-center">
        <Heading title={t("title")} muted={t("muted")} />
        <p className="mt-4 text-[16px] text-muted-foreground">{t("note")}</p>
      </div>
      <div className="mx-auto mt-12 grid max-w-[980px] gap-2 rounded-[30px] bg-foreground/[0.045] p-2 lg:grid-cols-[1.25fr_1fr]">
        <div className="rounded-[24px] border border-border bg-card p-6 sm:p-9 [--face-ring:var(--ui-card)]">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[19px] font-semibold">{t("free.name")}</p>
            <FaceStack seeds={CAST.slice(0, 3).map((one) => one.id)} size={30} max={3} />
          </div>
          <p className="mt-5 flex items-baseline gap-2.5">
            <span className="text-[56px] font-semibold leading-none tracking-[-0.04em]">{t("free.price")}</span>
            <span className="text-[16px] text-muted-foreground">{t("free.per")}</span>
          </p>
          <Link href="/create" className={cn(INK, "mt-8 w-full")}>
            {t("free.cta")}
          </Link>
          <ul className="mt-7 flex flex-wrap gap-1.5 border-t border-border pt-6">
            {items.map((item) => (
              <li key={item} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground/[0.05] pe-3 ps-2.5 text-[13.5px]">
                <Check className="size-3.5 shrink-0 text-ok" strokeWidth={2.75} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col p-6 sm:p-9">
          <p className="flex flex-wrap items-center gap-2.5 text-[19px] font-semibold">
            {t("soon.name")}
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[12.5px] font-semibold text-brand">{t("soon.badge")}</span>
          </p>
          <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">{t("soon.body")}</p>
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {(t.raw("soon.items") as string[]).map((item) => (
              <li
                key={item}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-border-strong pe-3 ps-2.5 text-[13.5px] text-foreground/75"
              >
                <Clock3 className="size-3.5 shrink-0 text-muted-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/lobby" className={cn(STONE, "mt-9 w-full lg:mt-auto")}>
            {t("soon.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
