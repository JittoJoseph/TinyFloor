import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  Clock3,
  Globe2,
  LockKeyhole,
  MonitorSmartphone,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/app/AppShell";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { HeroPreview } from "./HeroPreview";
import { MoreGrid } from "./MoreGrid";
import { HomeNavActions } from "./HomeNavActions";
import { SiteFooter } from "./SiteFooter";
import { CAST, Frame, type PreviewView } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { MeetingPreview } from "./previews/MeetingPreview";
import { GuestPreview } from "./previews/GuestPreview";
import { NetworkGlobe } from "./previews/NetworkGlobe";

/** The page's column. */
const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

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
  const t = useTranslations("home");

  return (
    <div className="home min-h-dvh bg-background text-foreground">
      <HomeNav />
      <main>
        <Hero />

        <section id="features" aria-label={t("nav.features")} className="scroll-mt-20 pt-10 sm:pt-16">
          <FeatureRow
            title={t("features.proximity.title")}
            muted={t("features.proximity.muted")}
            body={t("features.proximity.body")}
            preview={
              <Frame active="floor" rail={false} className="aspect-[4/3]">
                <FloorPreview near />
              </Frame>
            }
          />
          <FeatureRow
            flip
            stone
            title={t("features.meetings.title")}
            muted={t("features.meetings.muted")}
            body={t("features.meetings.body")}
            preview={
              <Frame active="meeting" rail={false} className="aspect-[4/3]">
                <MeetingPreview close />
              </Frame>
            }
          />
          <FeatureRow
            title={t("features.chat.title")}
            muted={t("features.chat.muted")}
            body={t("features.chat.body")}
            preview={
              <Frame active="chat" rail={false} className="aspect-[4/3]">
                <ChatPreview compact />
              </Frame>
            }
          />
          <FeatureRow
            flip
            stone
            title={t("features.people.title")}
            muted={t("features.people.muted")}
            body={t("features.people.body")}
            preview={
              <Frame active="people" rail={false} className="aspect-[4/3]">
                <PeoplePreview count={3} narrow />
              </Frame>
            }
          />
          <FeatureRow
            title={t("features.guests.title")}
            muted={t("features.guests.muted")}
            body={t("features.guests.body")}
            preview={<GuestPreview />}
          />
        </section>

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

function HomeNav() {
  const t = useTranslations("home.nav");
  const quiet = "text-[15px] text-foreground/75 transition-colors hover:text-foreground";
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <nav aria-label={t("main")} className={cn(COLUMN, "grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4")}>
        <Link href="/" className="flex w-fit items-center gap-2 text-[18px] font-bold tracking-tight">
          <Logo size={28} />
          TinyFloor
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          <a href="#features" className={quiet}>{t("features")}</a>
          <a href="#plans" className={quiet}>{t("pricing")}</a>
          <a href="#faq" className={quiet}>{t("faq")}</a>
          <Link href="/lobby" className={quiet}>{t("lobby")}</Link>
        </div>
        <div className="col-start-3">
          <HomeNavActions signIn={t("signIn")} start={t("start")} open={t("open")} />
        </div>
      </nav>
    </header>
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
  const t = useTranslations("home.hero");
  const points = t.raw("points") as string[];
  return (
    <section className={cn(COLUMN, "pt-14 sm:pt-24")}>
      <div className="mx-auto flex max-w-[52rem] flex-col items-center text-center">
        <h1
          className={cn(
            "text-balance hyphens-auto text-[40px] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[60px] lg:text-[68px]",
            CJK_HEADLINE,
          )}
        >
          {t("title")}
        </h1>
        <p className="mt-6 max-w-[38rem] text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]">{t("body")}</p>
        <Actions className="mt-9" />
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[14px] text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <Check className="size-3.5 text-ok" strokeWidth={2.5} />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-12 sm:mt-16">
        <HeroPreview
          label={t("previewLabel")}
          labels={{ floor: t("tabs.floor"), chat: t("tabs.chat"), people: t("tabs.people"), meeting: t("tabs.meeting") }}
          panels={{
            floor: <HeroFrame view="floor"><FloorPreview /></HeroFrame>,
            chat: <HeroFrame view="chat"><ChatPreview /></HeroFrame>,
            people: <HeroFrame view="people"><PeoplePreview /></HeroFrame>,
            meeting: <HeroFrame view="meeting"><MeetingPreview /></HeroFrame>,
          }}
        />
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center text-[15px] text-foreground/80">
          <span className="flex items-center gap-2.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-ok/60 motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-ok" />
            </span>
            {t("lobbyLine")}
          </span>
          <Link href="/lobby" className="inline-flex h-9 items-center rounded-full bg-foreground/[0.07] px-4 text-[14px] transition-colors hover:bg-foreground/[0.11]">
            {t("lobbyCta")}
          </Link>
        </p>
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

/** One feature: the words on one side, the app doing it on the other. */
function FeatureRow({
  title,
  muted,
  body,
  preview,
  flip,
  stone,
}: {
  title: string;
  muted: string;
  body: string;
  preview: ReactNode;
  flip?: boolean;
  stone?: boolean;
}) {
  return (
    <div
      className={cn(
        COLUMN,
        "grid items-center gap-8 py-10 sm:py-14 lg:gap-20",
        flip ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
      )}
    >
      <div className={cn("max-w-[28rem]", flip && "lg:order-2")}>
        <Heading as="h3" size="md" block title={title} muted={muted} />
        <p className="mt-5 text-pretty text-[16.5px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div
        className={cn(
          "rounded-[28px] p-3 sm:p-10",
          stone ? "bg-foreground/[0.045]" : "home-sky",
          flip && "lg:order-1",
        )}
      >
        <div className="mx-auto max-w-[540px]">{preview}</div>
      </div>
    </div>
  );
}

function More() {
  const t = useTranslations("home.more");
  return (
    <section className={cn(COLUMN, "py-20 sm:py-28")}>
      <Heading title={t("title")} muted={t("muted")} className="max-w-[22ch]" />
      <MoreGrid />
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
          <ul className="mt-7 divide-y divide-border border-t border-border">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-3 py-3 text-[15px]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-ok/12 text-ok">
                  <Check className="size-3" strokeWidth={3} />
                </span>
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
          <ul className="mt-6 divide-y divide-border border-t border-border">
            {(t.raw("soon.items") as string[]).map((item) => (
              <li key={item} className="flex items-center gap-3 py-3 text-[15px] text-foreground/80">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.07] text-muted-foreground">
                  <Clock3 className="size-3" strokeWidth={2.5} />
                </span>
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
