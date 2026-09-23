import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, ChevronRight, Globe2, LockKeyhole, MonitorSmartphone } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { wholeWords } from "@/lib/words";
import { HeroPreview } from "./HeroPreview";
import { COLUMN, HomeNav } from "./HomeNav";
import { SiteFooter } from "./SiteFooter";
import { SiteTheme } from "./SiteTheme";
import { CAST, Frame, type PreviewView } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";
import { ChatPreview } from "./previews/ChatPreview";
import { PeoplePreview } from "./previews/PeoplePreview";
import { MeetingPreview } from "./previews/MeetingPreview";
import { NetworkGlobe } from "./previews/NetworkGlobe";
import { FloorScene } from "@/components/floor/FloorScene";
import { EVERYONE, LOBBY } from "@/components/floor/scenes";

/*
 * The pieces every marketing page is built from: the page shell, headings,
 * the two ways in, the product preview, the questions and the last ask.
 */

export { COLUMN };

/** What's in TinyFloor, the ones the service runs on, named the way Cloudflare names them. */
const STACK = ["Workers", "Durable Objects", "D1", "Realtime SFU", "TURN"];

/** The two pills every ask uses: ink for the main one, a quiet stone for the other. */
const PILL =
  "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-[16px] transition-[background-color,transform] active:scale-[0.98]";
export const INK = cn(PILL, "bg-foreground text-background hover:bg-foreground/85");
export const STONE = cn(PILL, "bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.11]");

export const CJK_HEADLINE = "[:lang(ja)_&]:tracking-normal [:lang(ko)_&]:tracking-normal [:lang(zh)_&]:tracking-normal";

/**
 * A marketing page: the site's own face (Nunito), the app's theme, the
 * floating nav, and the footer with its language links pointing at `path`.
 */
export function MarketingShell({ path = "/", children }: { path?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background font-(family-name:--font-body) text-foreground [font-feature-settings:normal]">
      <SiteTheme />
      <HomeNav />
      {/* Room for the fixed header. */}
      <div aria-hidden className="h-16" />
      <main>{children}</main>
      <SiteFooter path={path} />
    </div>
  );
}

/** The space between a headline's halves, except after Chinese or Japanese, which run on without one. */
const gap = (before: ReactNode) => (typeof before === "string" && /[　-ヿ㐀-鿿＀-￯]$/.test(before) ? "" : " ");

/** A headline in two tones: the claim in ink, its second half quieter. */
export function Heading({
  title,
  muted,
  className,
  as: Tag = "h2",
  size = "lg",
  block = false,
}: {
  title: ReactNode;
  muted?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
  size?: "lg" | "md";
  /** Puts the quieter half on its own line. */
  block?: boolean;
}) {
  const locale = useLocale();
  const words = (text: ReactNode) => (typeof text === "string" ? wholeWords(text, locale) : text);
  return (
    <Tag
      className={cn(
        "text-balance hyphens-auto font-semibold tracking-[-0.025em]",
        size === "lg" ? "text-[32px] leading-[1.1] sm:text-[46px]" : "text-[27px] leading-[1.15] sm:text-[34px]",
        CJK_HEADLINE,
        className,
      )}
    >
      {words(title)}
      {muted && (
        <>
          {gap(title)}
          <span className={cn("text-muted-foreground/80", block && "block")}>{words(muted)}</span>
        </>
      )}
    </Tag>
  );
}

/** Rich copy's <em> as the quieter half of a two-tone headline. */
export const quiet = (chunks: ReactNode) => <span className="text-muted-foreground/80">{chunks}</span>;

/** The two ways in: the lobby first, since it needs no account, then an office of your own. */
export function Actions({ className }: { className?: string }) {
  const t = useTranslations("home");
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2.5", className)}>
      <Link href="/lobby" className={INK}>
        {t("hero.secondary")}
      </Link>
      <Link href="/create" className={STONE}>
        {t("nav.start")}
      </Link>
    </div>
  );
}

/**
 * A hero's ask. On a wide screen, the two ways in as pills. On a phone, the
 * lobby itself: a live patch of floor you tap to walk into, with nothing to
 * sign up for, and making an office as a quieter link under it.
 */
export function HeroAsk() {
  const t = useTranslations("home");
  const points = t.raw("hero.points") as string[];
  return (
    <>
      <Actions className="mt-10 hidden sm:flex" />
      <Link href="/lobby" className="group mt-7 block w-full overflow-hidden rounded-[30px] bg-foreground/[0.06] p-1.5 text-start sm:hidden">
        <FloorScene
          {...LOBBY}
          priority
          className="h-64 rounded-[24px]"
          over={
            <span className="absolute start-3 top-3 flex h-7 items-center gap-1.5 rounded-full bg-card/95 pe-2.5 ps-2 font-(family-name:--font-app) text-[11.5px] font-medium text-foreground shadow-float">
              <span className="relative flex size-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-ok/60 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-ok" />
              </span>
              {t("nav.lobbyTitle")}
            </span>
          }
        />
        <span className="flex items-center gap-3 px-2.5 pb-1 pt-2.5 [--face-ring:var(--ui-muted)]">
          <FaceStack seeds={CAST.slice(0, 3).map((one) => one.id)} size={24} max={3} />
          <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-muted-foreground">{t("hero.noAccount")}</span>
          <span className="flex h-11 items-center gap-1.5 rounded-full bg-foreground pe-4 ps-5 text-[15px] font-medium text-background transition-transform group-active:scale-[0.97]">
            {t("hero.lobbyCta")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </span>
        </span>
      </Link>
      <Link href="/create" className="mt-6 flex items-center gap-1 self-center text-[15px] font-medium sm:hidden">
        {t("nav.start")}
        <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
      </Link>
      <p className="mt-3 self-center text-center text-[12.5px] text-faint sm:mt-5 sm:text-[13.5px]">{points.join(" · ")}</p>
    </>
  );
}

/**
 * The way into the public lobby, as a small pill: three faces that step apart
 * when it's hovered, as if making room for you, and an arrow that leads on.
 */
export function LobbyPill({ className }: { className?: string }) {
  const t = useTranslations("home.nav");
  return (
    <Link
      href="/lobby"
      className={cn(
        "group inline-flex h-9 items-center gap-2.5 rounded-full border border-border bg-card pe-3.5 ps-1 text-[13.5px] text-foreground/80 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,color,box-shadow] duration-300 hover:border-border-strong hover:text-foreground hover:shadow-[0_6px_18px_-8px_rgb(0_0_0/0.2)] [--face-ring:var(--ui-card)]",
        className,
      )}
    >
      <span className="flex *:transition-[margin] *:duration-300 *:ease-out [&>*+*]:-ms-2 group-hover:[&>*+*]:ms-0.5">
        {CAST.slice(0, 3).map((one) => (
          <Face key={one.id} seed={one.id} size={26} />
        ))}
      </span>
      {t("lobbyTitle")}
      <ArrowRight className="size-3.5 opacity-60 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

function PreviewFrame({ view, children }: { view: PreviewView; children: ReactNode }) {
  return (
    <Frame active={view} className="aspect-[4/5] sm:aspect-[16/9]">
      {children}
    </Frame>
  );
}

/** The app itself, in four tabs: the floor, chat, people and a meeting. */
export function ProductPreview({ className }: { className?: string }) {
  const t = useTranslations("home.hero");
  return (
    <div className={className}>
      <HeroPreview
        label={t("previewLabel")}
        labels={{ floor: t("tabs.floor"), chat: t("tabs.chat"), people: t("tabs.people"), meeting: t("tabs.meeting") }}
        panels={{
          floor: <PreviewFrame view="floor"><FloorPreview priority /></PreviewFrame>,
          chat: <PreviewFrame view="chat"><ChatPreview /></PreviewFrame>,
          people: <PreviewFrame view="people"><PeoplePreview /></PreviewFrame>,
          meeting: <PreviewFrame view="meeting"><MeetingPreview /></PreviewFrame>,
        }}
      />
    </div>
  );
}

/**
 * One card: its words, then the app doing it. The heading runs on into its
 * quieter half, the way the section headings do. The card is a subgrid of
 * its row, so headings and text line up with the cards beside it, and the
 * preview rests on the card's bottom edge, a little of it running off.
 */
export function DayCard({
  id,
  title,
  muted,
  body,
  children,
}: {
  id?: string;
  title: string;
  muted?: string;
  body: string;
  children: ReactNode;
}) {
  const locale = useLocale();
  return (
    <article
      id={id}
      className="grid min-w-0 scroll-mt-24 grid-cols-1 grid-rows-[auto_auto_1fr] overflow-hidden rounded-[28px] border border-border/60 bg-foreground/[0.035] lg:row-span-3 lg:grid-rows-subgrid lg:gap-y-0"
    >
      <h3 className={cn("px-7 pt-7 text-pretty text-[20px] font-semibold leading-[1.3] tracking-[-0.02em] sm:px-8 sm:pt-8", CJK_HEADLINE)}>
        {wholeWords(title, locale)}
        {muted && (
          <span className="text-muted-foreground/80">
            {gap(title)}
            {wholeWords(muted, locale)}
          </span>
        )}
      </h3>
      <p className="px-7 pt-3 text-pretty text-[14.5px] leading-relaxed text-muted-foreground sm:px-8">{body}</p>
      <div className="flex h-[320px] items-end px-5 pt-7 sm:px-8">
        <div className="h-[calc(100%+18px)] w-full translate-y-[18px]">{children}</div>
      </div>
    </article>
  );
}

/**
 * A list as one ruled sheet, the way a spec sheet is drawn: cells split by
 * hairlines, small marks at the corners, an icon, a name and a line each.
 */
export function RuledSheet({
  items,
  columns = 4,
  className,
}: {
  items: Array<{ icon: ReactNode; title: string; body: string }>;
  columns?: 3 | 4;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      {["-start-[3px] -top-[3px]", "-end-[3px] -top-[3px]", "-start-[3px] -bottom-[3px]", "-end-[3px] -bottom-[3px]"].map((spot) => (
        <span key={spot} aria-hidden className={cn("absolute z-10 size-[7px] border border-border-strong bg-background", spot)} />
      ))}
      <ul className={cn("grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2", columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
        {items.map((item) => (
          <li key={item.title} className="group bg-background p-6 transition-colors hover:bg-card sm:p-7">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors group-hover:border-brand/40 group-hover:text-brand [&_svg]:size-[18px]">
              {item.icon}
            </span>
            <p className="mt-10 text-[17px] font-semibold tracking-tight">{item.title}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Questions as native disclosures: readable without scripts, and in the page
 * for search engines. They slide open where the browser can animate to a
 * height of auto, and open instantly everywhere else.
 */
export function Faq({ title, items }: { title: ReactNode; items: Array<{ q: string; a: string }> }) {
  const t = useTranslations("home");
  return (
    <section id="faq" className={cn(COLUMN, "grid scroll-mt-24 gap-10 pb-20 sm:pb-28 lg:grid-cols-[1fr_1.6fr] lg:gap-20")}>
      <div className="lg:sticky lg:top-28 lg:self-start">
        <Heading title={title} />
        <p className="mt-5 max-w-[22rem] text-[16px] leading-relaxed text-muted-foreground">{t("faq.note")}</p>
        <Link href="/lobby" className={cn(STONE, "mt-7 h-11 text-[15px]")}>
          {t("hero.secondary")}
        </Link>
      </div>
      <div className="grid gap-2 [interpolate-size:allow-keywords]">
        {items.map((item, index) => (
          <details
            key={item.q}
            name="faq"
            open={index === 0}
            className="group rounded-[20px] bg-foreground/[0.045] transition-colors open:bg-card open:shadow-[0_0_0_1px_var(--ui-border)] details-content:h-0 details-content:overflow-hidden details-content:transition-[height,content-visibility] details-content:duration-300 details-content:ease-out details-content:[transition-behavior:allow-discrete] open:details-content:h-auto motion-reduce:details-content:transition-none"
          >
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

/** Why it can be trusted: the network it runs on, drawn as a globe, then privacy and nothing to install. */
export function Trust() {
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

/** The last ask, in ink, beside a window onto a floor with people already on it. */
export function Final() {
  const t = useTranslations("home");
  return (
    <section className={cn(COLUMN, "pb-20 sm:pb-28")}>
      <div className="grid overflow-hidden rounded-[32px] bg-foreground text-background lg:grid-cols-[1fr_1.1fr] [--face-ring:var(--ui-foreground)]">
        <div className="flex flex-col justify-center p-8 sm:p-14">
          <FaceStack seeds={CAST.map((one) => one.id)} size={36} max={5} />
          <Heading title={t("final.title")} className="mt-7 max-w-[15ch]" />
          <p className="mt-5 max-w-[30rem] text-pretty text-[17px] leading-relaxed text-background/70">{t("final.body")}</p>
          <div className="mt-9 flex flex-wrap gap-2.5">
            <Link href="/lobby" className={cn(PILL, "bg-background text-foreground hover:bg-background/85")}>
              {t("hero.secondary")}
            </Link>
            <Link href="/create" className={cn(PILL, "bg-background/10 text-background hover:bg-background/15")}>
              {t("nav.start")}
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
