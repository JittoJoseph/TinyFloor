import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  AudioLines,
  Check,
  Clock3,
  Languages,
  Music2,
  PenLine,
  CircleDot,
  MonitorUp,
  SunMoon,
  Smartphone,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Logo } from "@/components/app/AppShell";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { HeroPreview } from "./HeroPreview";
import { HomeNavActions } from "./HomeNavActions";
import { SiteFooter } from "./SiteFooter";
import { CAST, Frame, type PreviewView } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { MeetingPreview } from "./previews/MeetingPreview";
import { GuestPreview } from "./previews/GuestPreview";

/** The page's column. The hairlines at its edges frame every section on a wide screen. */
const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

/**
 * The home page, in the app's own design system and theme, built around
 * previews of the real app. Everything here is server-rendered markup; the
 * only scripts are the hero's tab switcher, the nav's signed-in check and the
 * footer's theme switch.
 */
export function HomePage({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const t = useTranslations("home");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <HomeNav />
      <main>
        <Hero />
        <Facts />

        <section id="features" aria-label={t("nav.features")} className="scroll-mt-20">
          <FeatureRow
            id="proximity"
            eyebrow={t("features.proximity.eyebrow")}
            title={t("features.proximity.title")}
            muted={t("features.proximity.muted")}
            body={t("features.proximity.body")}
            preview={
              <Frame active="floor" rail={false} className="aspect-[4/3]">
                <FloorPreview zoom />
              </Frame>
            }
          />
          <FeatureRow
            id="meetings"
            flip
            eyebrow={t("features.meetings.eyebrow")}
            title={t("features.meetings.title")}
            muted={t("features.meetings.muted")}
            body={t("features.meetings.body")}
            preview={
              <Frame active="meeting" rail={false} className="aspect-[4/3]">
                <MeetingPreview />
              </Frame>
            }
          />
          <FeatureRow
            id="chat"
            eyebrow={t("features.chat.eyebrow")}
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
            id="people"
            flip
            eyebrow={t("features.people.eyebrow")}
            title={t("features.people.title")}
            muted={t("features.people.muted")}
            body={t("features.people.body")}
            preview={
              <Frame active="people" rail={false} className="aspect-[4/3]">
                <PeoplePreview count={4} narrow />
              </Frame>
            }
          />
          <FeatureRow
            id="guests"
            eyebrow={t("features.guests.eyebrow")}
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
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <nav aria-label={t("main")} className={cn(COLUMN, "flex h-16 items-center gap-6")}>
        <Link href="/" className="flex items-center gap-2 text-[16px] font-semibold tracking-tight">
          <Logo size={28} />
          TinyFloor
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {[
            { href: "#features", label: t("features") },
            { href: "#plans", label: t("pricing") },
            { href: "#faq", label: t("faq") },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/lobby"
            className="rounded-full px-3 py-1.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("lobby")}
          </Link>
        </div>
        <HomeNavActions signIn={t("signIn")} start={t("start")} open={t("open")} />
      </nav>
    </header>
  );
}

/** The two ways in, as the app's pill buttons. */
function Actions({ className, center }: { className?: string; center?: boolean }) {
  const t = useTranslations("home.hero");
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", center && "justify-center", className)}>
      <Link
        href="/create"
        className="group inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/90 active:scale-[0.98]"
      >
        {t("primary")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </Link>
      <Link
        href="/lobby"
        className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-colors hover:border-border-strong hover:bg-muted"
      >
        {t("secondary")}
      </Link>
    </div>
  );
}

function Hero() {
  const t = useTranslations("home.hero");
  return (
    <section className={cn(COLUMN, "pb-16 pt-14 sm:pb-24 sm:pt-20")}>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16">
        <div>
          <p className="text-[13px] font-medium text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="mt-4 max-w-[14ch] text-balance hyphens-auto text-[38px] font-medium leading-[1.04] tracking-[-0.035em] sm:text-[56px] lg:text-[64px] [:lang(ja)_&]:max-w-[10em] [:lang(ko)_&]:max-w-[10em] [:lang(zh)_&]:max-w-[10em] [:lang(ja)_&]:tracking-normal [:lang(zh)_&]:tracking-normal [:lang(ko)_&]:tracking-normal">
            {t("title")}
          </h1>
        </div>
        <div className="lg:pb-2">
          <p className="max-w-[32rem] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">{t("body")}</p>
          <Actions className="mt-6" />
          <p className="mt-3.5 text-[12.5px] text-faint">{t("note")}</p>
        </div>
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

function Facts() {
  const t = useTranslations("home.facts");
  const items = t.raw("items") as string[];
  return (
    <section aria-label={t("label")} className="border-y border-border bg-muted/40">
      <ul className={cn(COLUMN, "flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-5")}>
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Check className="size-3.5 text-ok" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** A headline in two tones: the claim in ink, its second half quieter. */
function Heading({ title, muted, className }: { title: string; muted?: string; className?: string }) {
  return (
    <h2 className={cn("text-balance hyphens-auto text-[28px] font-medium leading-[1.1] tracking-[-0.03em] sm:text-[40px]", className)}>
      {title}
      {muted && (
        <>
          {" "}
          <span className="text-muted-foreground">{muted}</span>
        </>
      )}
    </h2>
  );
}

/** One feature: the words on one side, the app doing it on the other, over a soft wash. */
function FeatureRow({
  id,
  eyebrow,
  title,
  muted,
  body,
  preview,
  flip,
}: {
  id: string;
  eyebrow: string;
  title: string;
  muted: string;
  body: string;
  preview: ReactNode;
  flip?: boolean;
}) {
  return (
    <div id={id} className={cn(COLUMN, "grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16")}>
      <div className={cn("max-w-[30rem]", flip && "lg:order-2")}>
        <p className="text-[13px] font-medium text-brand">{eyebrow}</p>
        <Heading title={title} muted={muted} className="mt-3" />
        <p className="mt-4 text-[15.5px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className={cn("home-wash rounded-[26px] p-4 sm:p-8", flip && "lg:order-1")}>
        <div className="mx-auto max-w-[520px]">{preview}</div>
      </div>
    </div>
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

function More() {
  const t = useTranslations("home.more");
  return (
    <section className="border-t border-border">
      <div className={cn(COLUMN, "py-16 sm:py-24")}>
        <Heading title={t("title")} muted={t("muted")} className="max-w-[22ch]" />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MORE.map((item) => (
            <li key={item.key} className="rounded-[20px] bg-muted/70 p-5 dark:bg-muted/50">
              <span className="flex size-9 items-center justify-center rounded-xl bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)] [&_svg]:size-4">
                {item.icon}
              </span>
              <p className="mt-6 text-[14.5px] font-semibold tracking-tight">{t(`items.${item.key}.title` as "items.screen.title")}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{t(`items.${item.key}.body` as "items.screen.body")}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Line drawings for the three promises, in the page's ink. */
const ART: Record<string, ReactNode> = {
  private: (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="50" y="18" width="60" height="84" rx="6" />
        <rect x="58" y="26" width="44" height="68" rx="3" strokeDasharray="2 4" />
        <circle cx="96" cy="62" r="3.5" />
        <path d="M30 102h100" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${18 + i * 4} ${30 + i * 18}h14`} strokeDasharray="1 3" />
        ))}
      </g>
    </svg>
  ),
  network: (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="80" cy="60" r="44" />
        <ellipse cx="80" cy="60" rx="18" ry="44" />
        <ellipse cx="80" cy="60" rx="34" ry="44" strokeDasharray="2 4" />
        <path d="M36 60h88M42 38h76M42 82h76" strokeDasharray="2 4" />
      </g>
      {[
        [58, 34],
        [104, 48],
        [70, 86],
        [96, 76],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="var(--ui-brand)" />
      ))}
    </svg>
  ),
  install: (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="22" y="22" width="116" height="78" rx="8" />
        <path d="M22 38h116" />
        <circle cx="32" cy="30" r="2" />
        <circle cx="40" cy="30" r="2" />
        <circle cx="48" cy="30" r="2" />
        <rect x="36" y="50" width="40" height="36" rx="4" strokeDasharray="2 4" />
        <path d="M86 54h38M86 64h30M86 74h34" />
      </g>
    </svg>
  ),
};

function Trust() {
  const t = useTranslations("home.trust");
  return (
    <section className="border-t border-border">
      <div className={cn(COLUMN, "py-16 sm:py-24")}>
        <Heading title={t("title")} />
        <ul className="mt-10 grid gap-3 md:grid-cols-3">
          {(["private", "network", "install"] as const).map((key) => (
            <li key={key} className="flex flex-col rounded-[20px] bg-muted/70 p-5 dark:bg-muted/50">
              <div className="flex h-44 items-center justify-center text-foreground/70">{ART[key]}</div>
              <p className="text-[14.5px] font-semibold tracking-tight">{t(`items.${key}.title`)}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{t(`items.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Plans() {
  const t = useTranslations("home.plans");
  const items = t.raw("free.items") as string[];
  return (
    <section id="plans" className="scroll-mt-20 border-t border-border">
      <div className={cn(COLUMN, "py-16 sm:py-24")}>
        <Heading title={t("title")} muted={t("muted")} />
        <div className="mt-10 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-[24px] border border-border bg-card p-6 sm:p-8">
            <p className="text-[15px] font-semibold">{t("free.name")}</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-[44px] font-medium leading-none tracking-[-0.04em]">{t("free.price")}</span>
              <span className="text-[14px] text-muted-foreground">{t("free.per")}</span>
            </p>
            <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[14px] text-foreground/90">
                  <Check className="mt-0.5 size-4 shrink-0 text-ok" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/create"
              className="group mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/90"
            >
              {t("free.cta")}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </Link>
          </div>
          <div className="home-wash flex flex-col rounded-[24px] p-6 sm:p-8">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              {t("soon.name")}
              <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-brand shadow-[0_0_0_1px_var(--ui-border)]">
                {t("soon.badge")}
              </span>
            </p>
            <p className="mt-3 max-w-[26rem] text-[14.5px] leading-relaxed text-muted-foreground">{t("soon.body")}</p>
            <ul className="mt-6 grid gap-2.5">
              {(t.raw("soon.items") as string[]).map((item) => (
                <li key={item} className="flex items-start gap-2 text-[14px] text-foreground/80">
                  <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/lobby"
              className="mt-8 inline-flex h-11 w-fit items-center rounded-full border border-border bg-card px-5 text-[14px] font-medium transition-colors hover:bg-muted lg:mt-auto"
            >
              {t("soon.cta")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Questions as native disclosures: readable without scripts, and in the page for search engines. */
function Faq({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const t = useTranslations("home.faq");
  return (
    <section id="faq" className="scroll-mt-20 border-t border-border">
      <div className={cn(COLUMN, "grid gap-8 py-16 sm:py-24 lg:grid-cols-[1fr_2fr] lg:gap-16")}>
        <Heading title={t("title")} muted={t("muted")} />
        <div className="divide-y divide-border border-y border-border">
          {faqs.map((item, index) => (
            <details key={item.q} className="group" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="relative size-4 shrink-0 text-muted-foreground" aria-hidden>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-current" />
                  <span className="absolute inset-y-0 start-1/2 w-px bg-current transition-transform group-open:scale-y-0" />
                </span>
              </summary>
              <p className="pb-5 pe-8 text-[14.5px] leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Final() {
  const t = useTranslations("home.final");
  return (
    <section className="border-t border-border">
      <div className={cn(COLUMN, "flex flex-col items-center py-20 text-center sm:py-28 [--face-ring:var(--ui-background)]")}>
        <FaceStack seeds={CAST.map((one) => one.id)} size={40} max={6} />
        <Heading title={t("title")} className="mt-7 max-w-[18ch]" />
        <p className="mt-4 max-w-[34rem] text-[16px] leading-relaxed text-muted-foreground">{t("body")}</p>
        <Actions className="mt-8" center />
      </div>
    </section>
  );
}

