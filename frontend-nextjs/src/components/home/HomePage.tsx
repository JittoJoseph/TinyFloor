import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  AudioLines,
  Check,
  CircleDot,
  Languages,
  MonitorUp,
  Music2,
  PenLine,
  Smartphone,
  SunMoon,
  Clock3,
  Globe2,
  LockKeyhole,
  MonitorSmartphone,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { HeroPreview } from "./HeroPreview";
import { COLUMN, HomeNav } from "./HomeNav";
import { SiteFooter } from "./SiteFooter";
import { CAST, Frame, type PreviewView } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { MeetingPreview } from "./previews/MeetingPreview";
import { GuestPreview } from "./previews/GuestPreview";
import { NetworkGlobe } from "./previews/NetworkGlobe";


/** The two pills every ask on the page uses: ink for the main one, a quiet stone for the other. */
const PILL = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-[16px] transition-[background-color,transform] active:scale-[0.98]";
const INK = cn(PILL, "bg-foreground text-background hover:bg-foreground/85");
const STONE = cn(PILL, "bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.11]");

/** What's in TinyFloor, the ones the service runs on, named the way Cloudflare names them. */
const STACK = ["Workers", "Durable Objects", "D1", "Realtime SFU", "TURN"];

/**
 * The home page, in the app's own design system and theme, built around
 * previews of the real app. The page speaks in its own face (Nunito); the
 * previews keep the app's. Everything here is server-rendered markup; the
 * only scripts are the hero's tab switcher, the nav's signed-in check and the
 * footer's theme switch.
 */
export function HomePage({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  return (
    <div className="home min-h-dvh overflow-x-clip bg-background text-foreground">
      <HomeNav />
      <main>
        <Hero />
        <Days />
        <More />
        <Trust />
        <Plans />
        <Faq faqs={faqs} />
        <Final />
      </main>
      <SiteFooter />
    </div>
  );
}

/** The two ways in. */
function Actions({ className }: { className?: string }) {
  const t = useTranslations("home");
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2.5", className)}>
      <Link href="/create" className={INK}>
        {t("nav.start")}
      </Link>
      <Link href="/lobby" className={STONE}>
        {t("hero.secondary")}
      </Link>
    </div>
  );
}

const CJK_HEADLINE = "[:lang(ja)_&]:tracking-normal [:lang(ko)_&]:tracking-normal [:lang(zh)_&]:tracking-normal";

function Hero() {
  const t = useTranslations("home");
  const points = t.raw("hero.points") as string[];
  return (
    <section className={cn(COLUMN, "relative pt-16 sm:pt-24")}>
      {/* One soft wash of the faces' colours behind the words. */}
      <div aria-hidden className="home-glow pointer-events-none absolute -inset-x-48 -top-20 h-[560px]" />

      <div className="relative mx-auto flex max-w-[48rem] flex-col items-center text-center">
        <Link
          href="/lobby"
          className="group inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card/80 pe-3.5 ps-1 text-[13.5px] text-foreground/80 shadow-[0_1px_2px_rgb(0_0_0/0.04)] backdrop-blur transition-colors hover:text-foreground [--face-ring:var(--ui-card)]"
        >
          <FaceStack seeds={CAST.slice(0, 3).map((one) => one.id)} size={26} max={3} />
          <span className="ms-0.5 size-1.5 rounded-full bg-ok" />
          {t("nav.lobbyTitle")}
          <ArrowRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
        </Link>
        <h1
          className={cn(
            "mt-8 text-balance hyphens-auto text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-[62px] lg:text-[72px]",
            CJK_HEADLINE,
          )}
        >
          {t("hero.title")}
        </h1>
        <p className="mt-6 max-w-[36rem] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">{t("hero.body")}</p>
        <Actions className="mt-10" />
        <p className="mt-5 text-[13.5px] text-faint">{points.join(" · ")}</p>
      </div>

      <div className="relative mt-16 sm:mt-20">
        <HeroPreview
          label={t("hero.previewLabel")}
          labels={{ floor: t("hero.tabs.floor"), chat: t("hero.tabs.chat"), people: t("hero.tabs.people"), meeting: t("hero.tabs.meeting") }}
          panels={{
            floor: <HeroFrame view="floor"><FloorPreview /></HeroFrame>,
            chat: <HeroFrame view="chat"><ChatPreview /></HeroFrame>,
            people: <HeroFrame view="people"><PeoplePreview /></HeroFrame>,
            meeting: <HeroFrame view="meeting"><MeetingPreview /></HeroFrame>,
          }}
        />
      </div>
    </section>
  );
}

function HeroFrame({ view, children }: { view: PreviewView; children: ReactNode }) {
  return (
    <Frame active={view} className="aspect-[4/5] sm:aspect-[16/9]">
      {children}
    </Frame>
  );
}

/** A headline in two tones: the claim in ink, its second half quieter. */
function Heading({
  title,
  muted,
  className,
  as: Tag = "h2",
  size = "lg",
  block = false,
}: {
  title: string;
  muted?: string;
  className?: string;
  as?: "h2" | "h3";
  size?: "lg" | "md";
  /** Puts the quieter half on its own line. */
  block?: boolean;
}) {
  return (
    <Tag
      className={cn(
        "text-balance hyphens-auto font-semibold tracking-[-0.025em]",
        size === "lg" ? "text-[32px] leading-[1.1] sm:text-[46px]" : "text-[27px] leading-[1.15] sm:text-[34px]",
        CJK_HEADLINE,
        className,
      )}
    >
      {title}
      {muted && (
        <>
          {" "}
          <span className={cn("text-muted-foreground/80", block && "block")}>{muted}</span>
        </>
      )}
    </Tag>
  );
}

/**
 * The rest of the product as one set of cards, the way a day on the floor
 * goes: two wide ones (walking over, sitting down), then three smaller ones
 * (chat, who's around, guests). Each card is its words, then the app doing
 * it, running off the card's bottom edge.
 */
function Days() {
  const t = useTranslations("home");
  const card = (key: "proximity" | "meetings" | "chat" | "people" | "guests") => ({
    title: t(`features.${key}.title`),
    muted: t(`features.${key}.muted`),
    body: t(`features.${key}.body`),
  });
  return (
    <section id="features" className={cn(COLUMN, "scroll-mt-20 pt-24 sm:pt-32")}>
      <Heading title={t("days.title")} muted={t("days.muted")} block className="max-w-[26ch]" />
      <div className="mt-12 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DayCard id="floor" {...card("proximity")}>
          <Frame active="floor" rail={false} className="h-full">
            <FloorPreview near />
          </Frame>
        </DayCard>
        <DayCard id="meetings" {...card("meetings")}>
          <Frame active="meeting" rail={false} className="h-full">
            <MeetingPreview close />
          </Frame>
        </DayCard>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
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
    </section>
  );
}

/**
 * One card: its words, then the app doing it. The card is a subgrid of its
 * row, so headings and text line up with the cards beside it, and the preview
 * rests on the card's bottom edge, a little of it running off.
 */
function DayCard({
  id,
  title,
  muted,
  body,
  small,
  children,
}: {
  id: string;
  title: string;
  muted: string;
  body: string;
  small?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      id={id}
      className="grid min-w-0 scroll-mt-24 grid-cols-1 grid-rows-[auto_auto_1fr] overflow-hidden rounded-[28px] border border-border/60 bg-foreground/[0.035] lg:row-span-3 lg:grid-rows-subgrid"
    >
      <h3
        className={cn(
          "px-7 pt-7 text-balance font-semibold leading-[1.2] tracking-[-0.02em] sm:px-8 sm:pt-8",
          small ? "text-[19px]" : "text-[23px]",
          CJK_HEADLINE,
        )}
      >
        {title}
        <span className="block text-muted-foreground/80">{muted}</span>
      </h3>
      <p className={cn("px-7 pt-3 text-pretty leading-relaxed text-muted-foreground sm:px-8", small ? "text-[14.5px]" : "text-[15.5px]", !small && "max-w-[34rem]")}>
        {body}
      </p>
      <div className={cn("flex items-end px-5 pt-7 sm:px-8", small ? "h-[320px]" : "h-[360px] sm:h-[400px]")}>
        <div className="h-[calc(100%+18px)] w-full translate-y-[18px]">{children}</div>
      </div>
    </article>
  );
}

const MORE: Array<{ key: string; icon: ReactNode }> = [
  { key: "screen", icon: <MonitorUp /> },
  { key: "whiteboard", icon: <PenLine /> },
  { key: "music", icon: <Music2 /> },
  { key: "status", icon: <CircleDot /> },
  { key: "noise", icon: <AudioLines /> },
  { key: "mobile", icon: <Smartphone /> },
  { key: "themes", icon: <SunMoon /> },
  { key: "languages", icon: <Languages /> },
];

/** Everything else, as one ruled sheet: an icon, a name and a line each. */
function More() {
  const t = useTranslations("home.more");
  return (
    <section id="more" className={cn(COLUMN, "scroll-mt-20 py-24 sm:py-32")}>
      <Heading title={t("title")} muted={t("muted")} className="max-w-[22ch]" />
      <div className="relative mt-12">
        {["-start-[3px] -top-[3px]", "-end-[3px] -top-[3px]", "-start-[3px] -bottom-[3px]", "-end-[3px] -bottom-[3px]"].map((spot) => (
          <span key={spot} aria-hidden className={cn("absolute z-10 size-[7px] border border-border-strong bg-background", spot)} />
        ))}
        <ul className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {MORE.map((item) => (
            <li key={item.key} className="group bg-background p-6 transition-colors hover:bg-card sm:p-7">
              <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors group-hover:border-brand/40 group-hover:text-brand [&_svg]:size-[18px]">
                {item.icon}
              </span>
              <p className="mt-10 text-[17px] font-semibold tracking-tight">{t(`items.${item.key}.title` as "items.screen.title")}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{t(`items.${item.key}.body` as "items.screen.body")}</p>
            </li>
          ))}
        </ul>
      </div>
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
                <li
                  key={name}
                  dir="ltr"
                  className="flex h-8 items-center gap-2 rounded-full border border-border bg-background px-3 text-[13.5px]"
                >
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

/**
 * Questions as native disclosures: readable without scripts, and in the page
 * for search engines. They open and close smoothly where the browser can
 * animate to `auto` (see .home-faq), and instantly everywhere else.
 */
function Faq({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const t = useTranslations("home");
  return (
    <section id="faq" className={cn(COLUMN, "grid scroll-mt-20 gap-10 pb-20 sm:pb-28 lg:grid-cols-[1fr_1.6fr] lg:gap-20")}>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Heading title={t("faq.title")} muted={t("faq.muted")} />
        <p className="mt-5 max-w-[22rem] text-[16px] leading-relaxed text-muted-foreground">{t("faq.note")}</p>
        <Link href="/lobby" className={cn(STONE, "mt-7 h-11 text-[15px]")}>
          {t("hero.secondary")}
        </Link>
      </div>
      <div className="home-faq grid gap-2">
        {faqs.map((item, index) => (
          <details key={item.q} name="faq" className="group rounded-[20px] bg-foreground/[0.045] transition-colors open:bg-card open:shadow-[0_0_0_1px_var(--ui-border)]" open={index === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[16.5px] font-semibold [&::-webkit-details-marker]:hidden">
              {item.q}
              <span
                className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_0_0_1px_var(--ui-border)] transition-transform duration-300 group-open:rotate-45"
                aria-hidden
              >
                <span className="absolute h-[1.5px] w-3 rounded-full bg-current" />
                <span className="absolute h-3 w-[1.5px] rounded-full bg-current" />
              </span>
            </summary>
            <p className="px-6 pb-6 pe-14 text-[15.5px] leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Final() {
  const t = useTranslations("home.final");
  return (
    <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
      <div className="home-sky flex flex-col items-center rounded-[32px] px-6 py-16 text-center sm:py-24 [--face-ring:var(--ui-card)]">
        <FaceStack seeds={CAST.map((one) => one.id)} size={44} max={6} />
        <Heading title={t("title")} className="mt-8 max-w-[18ch]" />
        <p className="mt-5 max-w-[34rem] text-pretty text-[17px] leading-relaxed text-foreground/70">{t("body")}</p>
        <Actions className="mt-9" />
      </div>
    </section>
  );
}
