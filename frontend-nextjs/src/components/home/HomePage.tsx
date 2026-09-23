import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Clock3, Globe2, LockKeyhole, MonitorSmartphone } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE } from "@/components/floor/scenes";
import { CJK_HEADLINE, COLUMN, Actions, DayCard, Faq, Heading, INK, LobbyPill, MarketingShell, ProductPreview, STONE } from "./Blocks";
import { Moments, Steps } from "./Moments";
import { CAST, Frame } from "./previews/Frame";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { GuestPreview } from "./previews/GuestPreview";
import { NetworkGlobe } from "./previews/NetworkGlobe";
import {
  LanguagesVignette,
  MusicVignette,
  NoiseVignette,
  PhoneVignette,
  ScreenVignette,
  StatusVignette,
  ThemeVignette,
  VignetteStyles,
  WhiteboardVignette,
} from "./Vignettes";

/** What's in TinyFloor, the ones the service runs on, named the way Cloudflare names them. */
const STACK = ["Workers", "Durable Objects", "D1", "Realtime SFU", "TURN"];

/**
 * The home page, in the app's own design system and theme, built on the real
 * floor: the map the app loads, with people on it. The hero's floor is yours
 * to walk; the tour walks the rooms; everything else is a card with the app
 * doing it. The page speaks in its own face (Nunito); the app's pieces keep
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
      <Trust />
      <Plans />
      <Faq title={<>{t("faq.title")} <span className="text-muted-foreground/80">{t("faq.muted")}</span></>} items={faqs} />
      <Final />
    </MarketingShell>
  );
}

function Hero() {
  const t = useTranslations("home");
  const points = t.raw("hero.points") as string[];
  return (
    <section className={cn(COLUMN, "pt-14 sm:pt-24")}>
      <div className="mx-auto flex max-w-[52rem] flex-col items-center text-center">
        <LobbyPill />
        <h1
          className={cn(
            "mt-8 text-balance hyphens-auto text-[42px] font-semibold leading-[1.03] tracking-[-0.038em] sm:text-[64px] sm:leading-[1.02] lg:text-[76px]",
            CJK_HEADLINE,
          )}
        >
          {t("hero.title")}
        </h1>
        <p className="mt-6 max-w-[38rem] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">{t("hero.body")}</p>
        <Actions className="mt-10" />
        <p className="mt-5 text-[13.5px] text-faint">{points.join(" · ")}</p>
      </div>
      <ProductPreview className="mt-14 sm:mt-20" />
    </section>
  );
}

/** The rest of the app: three cards with the app doing it, then a moving picture for each smaller thing. */
function Everything() {
  const t = useTranslations("home");
  const card = (key: "chat" | "people" | "guests") => ({
    title: t(`features.${key}.title`),
    muted: t(`features.${key}.muted`),
    body: t(`features.${key}.body`),
  });
  const small: Array<{ key: "screen" | "whiteboard" | "music" | "status" | "noise" | "mobile" | "themes" | "languages"; art: ReactNode }> = [
    { key: "screen", art: <ScreenVignette /> },
    { key: "whiteboard", art: <WhiteboardVignette /> },
    { key: "music", art: <MusicVignette /> },
    { key: "status", art: <StatusVignette /> },
    { key: "noise", art: <NoiseVignette /> },
    { key: "mobile", art: <PhoneVignette /> },
    { key: "themes", art: <ThemeVignette /> },
    { key: "languages", art: <LanguagesVignette /> },
  ];
  return (
    <section id="features" className={cn(COLUMN, "scroll-mt-20 py-24 sm:py-32")}>
      <VignetteStyles />
      <Heading title={t("more.title")} muted={t("more.muted")} className="max-w-[22ch]" />
      <div className="mt-12 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <DayCard id="chat" small {...card("chat")}>
          <Frame active="chat" rail={false} className="h-full">
            <ChatPreview compact />
          </Frame>
        </DayCard>
        <DayCard id="people" small {...card("people")}>
          <Frame active="people" rail={false} className="h-full">
            <PeoplePreview mini />
          </Frame>
        </DayCard>
        <DayCard id="guests" small {...card("guests")}>
          <Frame active="people" rail={false} className="h-full">
            <GuestPreview />
          </Frame>
        </DayCard>
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {small.map(({ key, art }) => (
          <li key={key} className="rounded-[24px] border border-border/60 bg-foreground/[0.035] p-2">
            {art}
            <div className="px-4 pb-4 pt-4">
              <p className="text-[16px] font-semibold tracking-tight">{t(`more.items.${key}.title`)}</p>
              <p className="mt-1 text-[14.5px] leading-relaxed text-muted-foreground">{t(`more.items.${key}.body`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Trust() {
  const t = useTranslations("home.trust");
  const small: Array<{ key: "private" | "install"; icon: ReactNode }> = [
    { key: "private", icon: <LockKeyhole /> },
    { key: "install", icon: <MonitorSmartphone /> },
  ];
  return (
    <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
      <Heading title={t("title")} muted={t("muted")} className="max-w-[30ch]" />
      <div className="mt-12 grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
        <div className="grid items-center gap-6 overflow-hidden rounded-[24px] border border-border bg-card p-6 sm:p-9 lg:col-span-2 lg:row-span-2 lg:grid-cols-[1fr_1fr]">
          <div>
            <span className="flex size-10 items-center justify-center rounded-full bg-brand/10 text-brand [&_svg]:size-[18px]">
              <Globe2 />
            </span>
            <p className="mt-6 text-[22px] font-semibold tracking-tight sm:text-[26px]">{t("items.network.title")}</p>
            <p className="mt-2 text-[15.5px] leading-relaxed text-muted-foreground">{t("items.network.body")}</p>
            <p className="mt-8 text-[13px] text-muted-foreground">{t("stack")}</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {STACK.map((name) => (
                <li key={name} dir="ltr" className="flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-[13.5px]">
                  <span className="size-1.5 rounded-full bg-brand" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <NetworkGlobe className="pointer-events-none mx-auto w-full max-w-[360px] text-foreground/70" />
        </div>
        {small.map(({ key, icon }) => (
          <div key={key} className="flex flex-col rounded-[24px] bg-foreground/[0.045] p-6 sm:p-8">
            <span className="flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)] [&_svg]:size-[18px]">
              {icon}
            </span>
            <p className="mt-auto pt-6 text-[19px] font-semibold tracking-tight lg:pt-10">{t(`items.${key}.title`)}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(`items.${key}.body`)}</p>
          </div>
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
      <div className="flex flex-col items-center text-center">
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

const PILL = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-[16px] transition-[background-color,transform] active:scale-[0.98]";

/** The last ask, in ink, beside a window onto a floor with people already on it. */
function Final() {
  const t = useTranslations("home");
  return (
    <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
      <div className="grid overflow-hidden rounded-[32px] bg-foreground text-background lg:grid-cols-[1fr_1.1fr] [--face-ring:var(--ui-foreground)]">
        <div className="flex flex-col justify-center p-8 sm:p-14">
          <FaceStack seeds={CAST.map((one) => one.id)} size={36} max={5} />
          <Heading title={t("final.title")} className="mt-7 max-w-[15ch]" />
          <p className="mt-5 max-w-[30rem] text-pretty text-[17px] leading-relaxed text-background/70">{t("final.body")}</p>
          <div className="mt-9 flex flex-wrap gap-2.5">
            <Link href="/create" className={cn(PILL, "bg-background text-foreground hover:bg-background/85")}>
              {t("nav.start")}
            </Link>
            <Link href="/lobby" className={cn(PILL, "bg-background/10 text-background hover:bg-background/15")}>
              {t("hero.secondary")}
            </Link>
          </div>
        </div>
        <div className="relative min-h-[320px] p-3 lg:ps-0">
          <FloorScene {...EVERYONE} view={[15, 1, 24, 18]} className="absolute inset-3 rounded-[22px] lg:start-0" />
        </div>
      </div>
    </section>
  );
}
