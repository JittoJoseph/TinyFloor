import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AudioLines, Hash, MonitorUp, Music2, PenLine, Plus, Smartphone } from "lucide-react";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { FloorScene } from "@/components/floor/FloorScene";
import { HALL, MEETING } from "@/components/floor/scenes";
import { Face } from "@/components/ui/Face";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";
import { HomeNav } from "./HomeNav";
import { HeroFilm } from "./HeroFilm";
import { SiteFooter } from "./SiteFooter";
import { SiteTheme } from "./SiteTheme";

/*
 * The pieces every marketing page is built from: the shell, the hero, the two ways in, the floor's moments, the
 * smaller things, the plans, the questions and the last ask. No borders:
 * surfaces are told apart by their fill, the way the app's door does it.
 * Headlines are set in the regular weight. Server-rendered throughout; the
 * only scripts are the nav's, the theme switch and the hero's film.
 */

/** The page's one column: 1120px of content, with a gutter that grows with the screen. */
export const COLUMN = "mx-auto w-full max-w-[1120px] px-5 sm:px-8";

/** Where a link to part of a page lands: clear of the fixed nav. */
export const ANCHOR = "scroll-mt-24";

const PILL =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-[15px] font-medium transition-[background-color,transform] active:scale-[0.98] sm:h-12 sm:px-6";

/** The main ask: ink on the canvas. */
export const INK = cn(PILL, "bg-foreground text-background hover:bg-foreground/85");

/** The other way in: a quiet fill. */
export const STONE = cn(PILL, "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]");

/** The small label over a heading. */
export const EYEBROW = "text-[12px] font-medium uppercase tracking-[0.16em] text-faint";

/** A section heading: the claim, then its quieter second half. */
export const H2 = "text-balance text-[32px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[34px] sm:text-[52px] sm:leading-[1.04]";

/** The sentence under a heading. */
export const LEAD = "text-pretty text-[16.5px] leading-[1.6] text-muted-foreground sm:text-[18px]";

/** Chinese, Japanese and Korean headlines keep their own spacing. */
export const CJK_HEADLINE = "[:lang(ja)_&]:tracking-normal [:lang(ko)_&]:tracking-normal [:lang(zh)_&]:tracking-normal";

/**
 * The black of the app's bezel; what sits on it wears the dark theme. In the
 * dark theme the page is nearly black too, so the panel lifts a step instead
 * of drawing an edge.
 */
export const STAGE = "dark bg-[#09090a] text-foreground [--face-ring:#09090a] [:root.dark_&]:bg-[#18181a] [:root.dark_&]:[--face-ring:#18181a]";

/** The quieter half of a rich heading (`<em>` in the copy). */
export const quiet = (chunks: ReactNode) => <span className="text-muted-foreground/75">{chunks}</span>;

/**
 * A marketing page: the app's face (Geist) and theme, the site's nav, and the
 * footer with its language links pointing at `path`. The nav floats without
 * a fade behind it, since pages have dark panels it passes over.
 */
export function MarketingShell({ path = "/", children }: { path?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh overflow-x-clip bg-background font-sans text-foreground antialiased">
      <SiteTheme />
      <HomeNav fade={false} />
      <main>{children}</main>
      <SiteFooter path={path} />
    </div>
  );
}

/**
 * The top of a page: one statement set large in the regular weight, centred,
 * what it means, the two ways in as one control, and the app running under
 * it, its own dark shell for a frame.
 */
export function Hero({
  eyebrow,
  title,
  body,
  size = "home",
}: {
  eyebrow?: string;
  title: ReactNode;
  body: string;
  /** The home page's headline is the largest; a page written for a search has a longer one. */
  size?: "home" | "page";
}) {
  const t = useTranslations("homepage.hero");
  return (
    <section className={size === "home" ? "pt-36 sm:pt-48" : "pt-32 sm:pt-44"}>
      <div className={cn(COLUMN, "flex flex-col items-center text-center")}>
        {eyebrow && <p className={cn(EYEBROW, "mb-6")}>{eyebrow}</p>}
        <h1
          className={cn(
            "text-balance font-normal tracking-[-0.045em]",
            size === "home"
              ? "text-[44px] leading-[1.02] min-[400px]:text-[48px] sm:text-[76px] lg:text-[92px]"
              : "max-w-[18ch] text-[40px] leading-[1.04] min-[400px]:text-[44px] sm:text-[64px] lg:text-[72px]",
            CJK_HEADLINE,
          )}
        >
          {title}
        </h1>
        <p className={cn(LEAD, "mt-7 max-w-[36rem] text-balance")}>{body}</p>
        <Joined className="mt-10" />
        <p className="mt-5 text-[13px] text-faint">{t("note")}</p>
      </div>

      <div className={cn(COLUMN, "mt-16 sm:mt-24")}>
        {/*
          The app, whole: its dark shell is the window's own frame, so nothing
          goes around it but a shadow (and, on the dark page, the faintest edge
          so the shell doesn't sink into it). On a phone the frame is squarer
          and centred on the floor, so the people stay readable.
        */}
        <HeroFilm
          label={t("film")}
          className="aspect-[4/3] rounded-[18px] object-[40%_50%] shadow-[0_1px_2px_rgb(0_0_0/0.1),0_30px_80px_-24px_rgb(0_0_0/0.45)] sm:aspect-[16/9] sm:rounded-[22px] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_30px_80px_-24px_rgb(0_0_0/0.9)]"
        />
      </div>
    </section>
  );
}

/** The two ways in as one control: ink for making an office, a quiet stone for looking around first. */
export function Joined({ className }: { className?: string }) {
  const t = useTranslations("homepage.hero");
  const half = "inline-flex h-12 items-center gap-2 px-4 text-[15px] font-medium transition-colors min-[400px]:px-6";
  return (
    <div className={cn("inline-flex", className)}>
      <Link href="/create" className={cn(half, "rounded-s-full bg-foreground text-background hover:bg-foreground/85")}>
        {t("cta")}
      </Link>
      <Link href="/lobby" className={cn(half, "rounded-e-full bg-foreground/[0.09] text-foreground hover:bg-foreground/[0.14]")}>
        {t("lobby")}
      </Link>
    </div>
  );
}

/** A section's centred heading: the small label, the two-tone claim, and an optional sentence. */
export function Heading({ eyebrow, title, muted, body, className }: { eyebrow?: string; title: ReactNode; muted?: ReactNode; body?: string; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[40rem] text-center", className)}>
      {eyebrow && <p className={cn(EYEBROW, "mb-5")}>{eyebrow}</p>}
      <h2 className={cn(H2, CJK_HEADLINE)}>
        {title}
        {muted && <span className="block text-muted-foreground/75">{muted}</span>}
      </h2>
      {body && <p className={cn(LEAD, "mx-auto mt-6 max-w-[32rem]")}>{body}</p>}
    </div>
  );
}

/**
 * The floor's three moments, on the bezel's black: who is in, walking over,
 * sitting down together. It carries the anchors the nav's Product menu links
 * to (#floor, #people, #meetings).
 */
export function FloorMoments({ className }: { className?: string }) {
  const t = useTranslations("homepage.floor");
  const moments: Array<{ key: "seen" | "walk" | "sit"; id?: string; scene: ReactNode }> = [
    { key: "seen", id: "people", scene: <FloorScene {...HALL} view={[17, 5, 13, 9]} className="aspect-[4/3] w-full" /> },
    { key: "walk", scene: <FloorScene {...HALL} view={[32, 6, 10, 7]} className="aspect-[4/3] w-full" /> },
    { key: "sit", id: "meetings", scene: <FloorScene {...MEETING} view={[1, 5, 12, 8]} className="aspect-[4/3] w-full" /> },
  ];

  return (
    <section id="floor" className={cn(ANCHOR, "px-3 sm:px-4", className)}>
      <div className={cn(STAGE, "rounded-[28px] py-20 sm:rounded-[44px] sm:py-28")}>
        <div className={COLUMN}>
          <Heading eyebrow={t("eyebrow")} title={t("title")} muted={t("muted")} body={t("body")} />
          <div className="mt-14 grid gap-3 sm:mt-20 lg:grid-cols-3">
            {moments.map((one, i) => (
              <article
                key={one.key}
                id={one.id}
                className={cn(ANCHOR, "rounded-[26px] bg-white/[0.05] p-1.5 sm:grid sm:grid-cols-[1.15fr_1fr] sm:items-center sm:gap-2 lg:block")}
              >
                <div className="overflow-hidden rounded-[20px]">{one.scene}</div>
                <div className="px-4 pb-5 pt-5 sm:px-5 sm:py-4 lg:pb-5 lg:pt-5">
                  <p className="text-[12px] tabular-nums text-faint">0{i + 1}</p>
                  <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.01em]">{t(`${one.key}.title`)}</h3>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-muted-foreground">{t(`${one.key}.body`)}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A quiet list of short notes: a mark in a small squircle, a name, one line. No boxes. */
export function Notes({ items, className }: { items: Array<{ icon: ReactNode; title: string; body: string; id?: string }>; className?: string }) {
  return (
    <div className={cn("mx-auto grid max-w-[960px] gap-x-12 gap-y-10 sm:grid-cols-2 sm:gap-y-12 lg:grid-cols-3", className)}>
      {items.map((one) => (
        <div key={one.title} id={one.id} className={cn(ANCHOR, "flex items-start gap-4")}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[30%] bg-foreground/[0.06] text-foreground [&_svg]:size-[18px]">
            {one.icon}
          </span>
          <div className="pt-0.5">
            <h3 className="text-[16px] font-medium tracking-[-0.01em]">{one.title}</h3>
            <p className="mt-1 text-[14.5px] leading-[1.55] text-muted-foreground">{one.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Everything else on every floor, as notes. The chat carries the nav's #chat anchor. */
export function Everything() {
  const t = useTranslations("homepage.more");
  const items: Array<{ key: "chat" | "screen" | "whiteboard" | "music" | "noise" | "devices"; icon: ReactNode }> = [
    { key: "chat", icon: <Hash /> },
    { key: "screen", icon: <MonitorUp /> },
    { key: "whiteboard", icon: <PenLine /> },
    { key: "music", icon: <Music2 /> },
    { key: "noise", icon: <AudioLines /> },
    { key: "devices", icon: <Smartphone /> },
  ];
  return (
    <section id="features" className={cn(COLUMN, ANCHOR, "py-28 sm:py-40")}>
      <Heading eyebrow={t("eyebrow")} title={t("title")} muted={t("muted")} />
      <Notes
        className="mt-14 sm:mt-20"
        items={items.map((one) => ({
          id: one.key === "chat" ? "chat" : undefined,
          icon: one.icon,
          title: t(`items.${one.key}.title`),
          body: t(`items.${one.key}.body`),
        }))}
      />
    </section>
  );
}

/**
 * Three plans, priced by how many people the office holds and how many meeting
 * hours it has (docs/14), with everything on each. The one in the middle stands on the bezel's black.
 */
export function Plans() {
  const t = useTranslations("homepage.pricing");
  const th = useTranslations("homepage.hero");
  const plans: Array<{
    key: "free" | "team" | "business";
    price: string;
    per: string;
    people: number;
    hours: number;
    soon?: boolean;
    featured?: boolean;
  }> = [
    { key: "free", price: "$0", per: t("forever"), people: 3, hours: 5 },
    { key: "team", price: "$19", per: t("month"), people: 10, hours: 30, soon: true, featured: true },
    { key: "business", price: "$49", per: t("month"), people: 25, hours: 60, soon: true },
  ];

  return (
    <section id="plans" className={cn(COLUMN, ANCHOR, "pb-28 sm:pb-40")}>
      <Heading eyebrow={t("eyebrow")} title={t("title")} muted={t("muted")} body={t("body")} />
      <div className="mx-auto mt-14 grid max-w-[460px] items-stretch gap-3 sm:mt-20 lg:max-w-none lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={cn("flex flex-col rounded-[28px] p-7 sm:p-8", plan.featured ? cn(STAGE, "lg:-my-3 lg:py-11") : "bg-muted/80")}
          >
            <div className="flex h-7 items-center justify-between gap-3">
              <p className="text-[15px] font-semibold">{t(`${plan.key}.name`)}</p>
              {plan.soon && (
                <span className="rounded-full bg-foreground/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">{t("soon")}</span>
              )}
            </div>
            <p className="mt-8 flex items-baseline gap-2">
              <span className="text-[48px] font-semibold leading-none tracking-[-0.04em]">{plan.price}</span>
              <span className="text-[14.5px] text-muted-foreground">{plan.per}</span>
            </p>
            <p className="mt-3 text-[13.5px] font-medium text-foreground/80">{t("people", { count: plan.people })}</p>
            <p className="mt-1 text-[13.5px] text-muted-foreground">{t("hours", { count: plan.hours })}</p>
            <p className="mt-5 text-[14.5px] leading-[1.6] text-muted-foreground">{t(`${plan.key}.body`)}</p>
            <ul className="mt-8 flex flex-col gap-3 text-[14.5px]">
              {(t.raw(`${plan.key}.items`) as string[]).map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <span className="size-1.5 shrink-0 rounded-full bg-foreground/25" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-9">
              {plan.soon ? (
                <span className={cn(STONE, "pointer-events-none w-full text-muted-foreground")}>{t("soon")}</span>
              ) : (
                <Link href="/create" className={cn(INK, "w-full")}>
                  {th("cta")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[13px] text-muted-foreground">{t("tax")}</p>
    </section>
  );
}

/**
 * The questions people ask, as a plain list that opens without a script, and
 * a way to go and look. The page puts the same questions in its FAQPage schema.
 */
export function Questions({ items, title }: { items: Array<{ q: string; a: string }>; title?: ReactNode }) {
  const t = useTranslations("homepage.faq");
  return (
    <section id="faq" className={cn(COLUMN, ANCHOR, "pb-28 sm:pb-40")}>
      <div className="mx-auto max-w-[44rem]">
        <h2 className={cn(H2, CJK_HEADLINE, "text-center")}>
          {title ?? (
            <>
              {t("title")}
              <span className="text-muted-foreground/75"> {t("muted")}</span>
            </>
          )}
        </h2>
        <div className="mt-12 sm:mt-16">
          {items.map((one) => (
            <details key={one.q} className="group">
              <summary className="-mx-4 flex cursor-pointer list-none items-center justify-between gap-6 rounded-[16px] px-4 py-4 text-[16.5px] font-medium tracking-[-0.01em] transition-colors hover:bg-foreground/[0.035] sm:text-[17px] [&::-webkit-details-marker]:hidden">
                {one.q}
                <Plus className="size-4 shrink-0 text-faint transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="max-w-[40rem] pb-5 pt-1 text-[15.5px] leading-[1.65] text-muted-foreground">{one.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-10 text-center text-[15px] text-muted-foreground">
          {t.rich("more", {
            lobby: (chunks) => (
              <Link href="/lobby" className="font-medium text-foreground hover:underline hover:underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </section>
  );
}

/** The marks over the last ask: offices, drawn the way the app draws them, beside our own. */
const MARKS: Array<{ seed?: string; turn: number; lift: number; size: number }> = [
  { turn: -10, lift: 22, size: 60 },
  { seed: "office-kiln", turn: 7, lift: 0, size: 64 },
  { seed: "office-northwind", turn: -3, lift: 14, size: 60 },
  { seed: "office-ember", turn: -6, lift: -2, size: 64 },
  { seed: "office-harbour", turn: 9, lift: 24, size: 58 },
];

/**
 * The last ask, on the plain canvas: a loose arc of offices, one statement in
 * the regular weight, and the same joined control as the hero. It carries the
 * nav's #invites anchor.
 */
export function Closing() {
  const t = useTranslations("homepage.closing");
  return (
    <section id="invites" className={cn(COLUMN, ANCHOR, "flex flex-col items-center pb-32 pt-8 text-center sm:pb-44 sm:pt-12")}>
      <div aria-hidden className="flex origin-bottom scale-[0.78] items-start justify-center gap-3 sm:scale-100 sm:gap-5">
        {MARKS.map((one, i) => (
          <span
            key={i}
            className="block drop-shadow-[0_12px_18px_rgb(0_0_0/0.16)]"
            style={{ transform: `translateY(${one.lift}px) rotate(${one.turn}deg)` }}
          >
            {one.seed ? <Face seed={one.seed} square size={one.size} /> : <Logo size={one.size} />}
          </span>
        ))}
      </div>
      <h2 className={cn("mt-16 text-balance text-[40px] font-normal leading-[1.04] tracking-[-0.045em] min-[400px]:text-[44px] sm:text-[68px] lg:text-[80px]", CJK_HEADLINE)}>
        {t("title")}
        <span className="block">{t("muted")}</span>
      </h2>
      <Joined className="mt-10" />
      <p className="mt-6 text-[13px] text-faint">{t("note")}</p>
    </section>
  );
}
