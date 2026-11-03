import type { CSSProperties, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  DoorOpen,
  Gear,
  Hand,
  Hash,
  Headphones,
  ImagePlus,
  Link2,
  Mic,
  MonitorUp,
  Paperclip,
  PenLine,
  Plus,
  Search,
  Smile,
  SquarePen,
  AudioLines,
  UserPlus,
  Floor,
  Chats,
  Meetings,
  People,
  HelpCircle,
  SignOut,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { PEOPLE } from "@/components/floor/scenes";
import { NearbyBar } from "@/components/floor/NearbyBar";
import { Face, FaceStack, type Presence } from "@/components/ui/Face";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { ANCHOR, CJK_HEADLINE, COLUMN, OpenSource } from "./Blocks";
import { PriceSlider } from "./PriceSlider";
import { Clay, lit, type Tone } from "./ColorStage";
import { Laurel } from "./Laurel";
import { Muted, rise, split, Split } from "./Split";

/*
 * The home page between the hero and the questions. Each section is its own
 * kind of thing, the way Linear and Raycast build theirs, and what it shows
 * is the app's own interface, drawn small and exact: the people list, the
 * card beside someone you walk up to, a call's tiles and controls, the chat.
 * No map below the hero, no grey cards, no labels over the headings. All of
 * it is server-rendered markup and CSS; the only script is the price slider.
 */

/** A section heading, set smaller than the page's statements: the claim, in the regular weight. */
const TITLE = "text-balance text-[30px] font-normal leading-[1.1] tracking-[-0.035em] sm:text-[44px] sm:leading-[1.06]";

/** The sentence under a heading. */
const BODY = "text-pretty text-[16px] leading-[1.65] text-muted-foreground sm:text-[17px]";

/** A link that says more, with its arrow. */
function More({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 text-[14.5px] font-medium text-foreground hover:text-foreground/80", className)}>
      {children}
      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
    </Link>
  );
}

/** A section's words: the heading, what it means, and where to read more. */
function Words({ title, body, more, href, className }: { title: string; body: string; more?: string; href?: string; className?: string }) {
  return (
    <div className={className}>
      <h2 data-reveal-words className={cn(TITLE, CJK_HEADLINE, "max-w-[15ch]")}>
        <Split text={title} />
      </h2>
      <p data-reveal className={cn(BODY, "mt-6 max-w-[29rem]")} style={rise(80)}>
        {body}
      </p>
      {more && href && (
        <div data-reveal className="mt-8" style={rise(140)}>
          <More href={href}>{more}</More>
        </div>
      )}
    </div>
  );
}

/** A panel's words, padded off its edges. */
const PANEL_WORDS = "px-5 py-10 sm:px-12 sm:py-14";

/** The space around a panel: its own rounding carries the break between sections, so they sit closer than plain ones. */
const PANEL_SECTION = "py-5 sm:py-8";

/**
 * A section as one panel, the way the big product sites set theirs: its
 * words on one side and, on the other, a block of its colour that the app
 * rises out of, standing on the block's foot. A clay object stands by the
 * thing it's about, laid by the caller over the block's wrapper.
 */
function Stage({
  tone,
  words,
  flip = false,
  block,
  card,
  clay,
  children,
}: {
  tone: Tone;
  words: ReactNode;
  /** The block on the start side and the words after it, on wide screens. */
  flip?: boolean;
  /** The block's own size and padding, past what every block has. */
  block?: string;
  card?: string;
  clay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid grid-cols-1 items-center gap-3 rounded-[44px] bg-muted p-3", flip ? "lg:grid-cols-[1.35fr_1fr]" : "lg:grid-cols-[1fr_1.15fr]")}>
      <div className={cn(PANEL_WORDS, flip && "lg:order-2")}>{words}</div>
      <div className={cn("relative", flip && "lg:order-1")}>
        <div className={cn("overflow-hidden rounded-[34px] px-5 pt-12 sm:px-12 sm:pt-16", block)} style={lit(tone)}>
          <div
            data-reveal
            style={rise(0, { y: 40 })}
            className={cn("rounded-t-[22px] bg-background font-(family-name:--font-app) shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] [--face-ring:var(--ui-background)]", card)}
          >
            {children}
          </div>
        </div>
        {clay}
      </div>
    </div>
  );
}

/**
 * Where offices were open in the last two months (PostHog, 28 October), each
 * country in its own language, so the strip reads the same on every page.
 * It stands where other sites put their customers' logos.
 */
const COUNTRIES = [
  "Ecuador",
  "Pilipinas",
  "भारत",
  "Honduras",
  "Brasil",
  "Canada",
  "Indonesia",
  "United States",
  "مصر",
  "Colombia",
  "Deutschland",
  "Panamá",
  "Portugal",
  "España",
  "México",
  "Türkiye",
  "Κύπρος",
  "대한민국",
  "Nederland",
];

/** A star, as rating marks are drawn: five points, softly rounded. */
function Star({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} style={style}>
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.86l-5.5 2.9 1.05-6.13L3.1 9.3l6.15-.9z"
      />
    </svg>
  );
}

/**
 * Trust, set the way an award is: five stars and a short line inside a
 * laurel, and under it, between two hairlines, who it is that trusts it.
 */
export function Trust() {
  const t = useTranslations("homepage.trust");
  return (
    <section data-reveal-laurel aria-label={t("line")} className={cn(COLUMN, "mt-20 flex flex-col items-center sm:mt-28")}>
      <Laurel>
        <span aria-hidden className="flex items-center gap-0.5 text-[#22c55e]">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="laurel-mark size-3.5 sm:size-[15px]" style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
        <span className="laurel-mark text-[12px] font-semibold tracking-[-0.01em] text-foreground sm:text-[13px]" style={{ "--i": 5 } as CSSProperties}>
          {t("title")}
        </span>
      </Laurel>
      <div className="mt-5 flex items-center justify-center gap-4">
        <span aria-hidden className="hidden h-px w-10 bg-border sm:block sm:w-16" />
        <p className="text-center text-[13px] text-muted-foreground sm:text-[14px]" style={{ "--d": "260ms" } as CSSProperties}>
          <Split text={t("line")} />
        </p>
        <span aria-hidden className="hidden h-px w-10 bg-border sm:block sm:w-16" />
      </div>
    </section>
  );
}

/** The countries, drifting past within the column, fading out at both ends. */
export function Countries() {
  const t = useTranslations("homepage.countries");
  const row = (hidden?: boolean) => (
    <ul aria-hidden={hidden} className="flex shrink-0 items-center gap-12 pe-12 sm:gap-14 sm:pe-14">
      {COUNTRIES.map((name) => (
        <li key={name} dir="auto" className="whitespace-nowrap text-[16px] font-medium tracking-[-0.01em] text-muted-foreground/70 sm:text-[18px]">
          {name}
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={t("label")} className={cn(COLUMN, "mt-16 sm:mt-20")}>
      <p data-reveal className="text-center text-[13.5px] text-faint" style={rise(0, { y: 8 })}>
        {t("label")}
      </p>
      <div
        data-reveal
        className="mx-auto mt-7 flex max-w-[860px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]"
        style={rise(80, { y: 0 })}
      >
        <div className="flex animate-[drift_70s_linear_infinite] will-change-transform motion-reduce:animate-none rtl:[animation-direction:reverse]">
          {row()}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

/**
 * One sentence, large, and under it the floor's three moments in a row, each
 * with the small piece of the app that is that moment: the faces of who's in,
 * the card with the call button, the meeting room in progress.
 */
export function Statement() {
  const t = useTranslations("homepage.statement");
  const p = useTranslations("home.preview");
  const { emma, jack, olivia, sam, noah, lily } = PEOPLE;
  const points: Array<{ key: "seen" | "talk" | "meet"; href: string; visual: ReactNode }> = [
    {
      key: "seen",
      href: "/team-presence",
      visual: (
        <span className="flex items-center gap-3 [--face-ring:var(--ui-background)]">
          <FaceStack seeds={[emma.id, jack.id, olivia.id, sam.id, noah.id, lily.id]} size={30} max={5} />
          <span className="text-[13px] font-medium text-muted-foreground">{t("here", { count: 6 })}</span>
        </span>
      ),
    },
    {
      key: "talk",
      href: "/proximity-chat",
      visual: <NearbyBar name={olivia.name} seed={olivia.id} labels={{ call: p("call"), message: p("message") }} />,
    },
    {
      key: "meet",
      href: "/virtual-meeting-room",
      visual: (
        <span className="flex h-[42px] items-center gap-2.5 rounded-full border border-border bg-card pe-3 ps-3.5 text-[13px] font-semibold shadow-float [--face-ring:var(--ui-card)]">
          <DoorOpen className="size-4 text-muted-foreground" />
          {t("room")}
          <FaceStack seeds={[jack.id, sam.id, noah.id]} size={22} max={3} />
        </span>
      ),
    },
  ];
  return (
    <section id="about" className={cn(COLUMN, ANCHOR, "py-28 sm:py-40")}>
      <h2
        data-reveal-words
        className={cn(
          "mx-auto max-w-[23ch] text-balance text-center text-[34px] font-normal leading-[1.12] tracking-[-0.04em] min-[400px]:text-[38px] sm:text-[60px] sm:leading-[1.06]",
          CJK_HEADLINE,
        )}
      >
        {split(
          t.rich("text", { muted: (chunks) => <Muted>{chunks}</Muted> }),
          (words) => <span className="text-muted-foreground/70">{words}</span>,
        )}
      </h2>
      <ul className="mx-auto mt-16 grid max-w-[960px] gap-10 sm:mt-20 md:grid-cols-3 md:gap-0">
        {points.map((point, i) => (
          <li key={point.key} data-reveal className={cn("md:px-6", i > 0 && "md:border-s md:border-border")} style={rise(60 + 60 * i)}>
            <Link href={point.href} className="group flex flex-col items-center gap-5 text-center">
              <span className="flex h-12 items-center font-(family-name:--font-app)">{point.visual}</span>
              <span className="text-[15.5px] font-medium tracking-[-0.01em] decoration-foreground/30 underline-offset-4 group-hover:underline">{t(`points.${point.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Someone talking: three small bars that rise and fall, as the app shows a voice. */
function Bars({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-3 items-center gap-[2px]", className)}>
      {[0, 160, 80].map((delay) => (
        <span key={delay} className="w-[3px] rounded-full bg-current motion-safe:animate-[voice_0.8s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

/** The people in the presence list: who, how they're doing, and what their note says. */
const ROSTER: Array<{ key: "emma" | "jack" | "olivia" | "sam" | "noah" | "lily"; presence: Presence }> = [
  { key: "emma", presence: "available" },
  { key: "jack", presence: "in_call" },
  { key: "olivia", presence: "busy" },
  { key: "sam", presence: "in_call" },
  { key: "noah", presence: "in_call" },
  { key: "lily", presence: "away" },
];

/**
 * Who's around: what it means on the left, and the floor's people as the
 * app lists them on the right, each with a status and a note, the ones away
 * under their own heading.
 */
export function PresenceSection() {
  const t = useTranslations("homepage.presence");
  const here = ROSTER.filter((one) => one.presence !== "away");
  const away = ROSTER.filter((one) => one.presence === "away");
  const row = (one: (typeof ROSTER)[number], i: number) => (
    <li key={one.key} data-reveal className="flex items-center gap-3.5 py-3" style={rise(40 + 40 * i, { y: 10 })}>
      <Face seed={PEOPLE[one.key].id} size={34} presence={one.presence} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium leading-tight">{PEOPLE[one.key].name}</span>
        <span className="mt-0.5 block truncate text-[13px] leading-tight text-muted-foreground">{t(`notes.${one.key}`)}</span>
      </span>
      {one.presence === "in_call" && <Bars className="text-[#a78bfa]" />}
      {one.key === "emma" && (
        <span className="flex h-7 items-center gap-1.5 rounded-full border border-border px-2.5 text-[12px] font-medium text-foreground">
          <Hand className="size-3.5" />
          {t("wave")}
        </span>
      )}
    </li>
  );
  return (
    <section id="people" className={cn(COLUMN, ANCHOR, PANEL_SECTION, "pt-0 sm:pt-0")}>
      <Stage
        tone="blurple"
        words={<Words title={t("title")} body={t("body")} more={t("more")} href="/team-presence" />}
        block="h-[440px] sm:h-[500px] sm:px-14 sm:pt-14"
        card="px-5 pb-6 pt-4 sm:px-6"
        clay={<Clay name="object-wave" className="-end-3 top-6 w-24 rotate-[8deg] sm:-end-6 sm:top-10 sm:w-36 xl:-end-12" />}
      >
        <p data-reveal className="flex items-center justify-between border-b border-border pb-3 text-[12.5px] font-medium text-faint" style={rise(0, { y: 6 })}>
          {t("here")}
          <span className="tabular-nums">{here.length}</span>
        </p>
        <ul className="divide-y divide-border/60">{here.map((one, i) => row(one, i))}</ul>
        <p data-reveal className="mt-6 flex items-center justify-between border-b border-border pb-3 text-[12.5px] font-medium text-faint" style={rise(40 + 40 * here.length, { y: 6 })}>
          {t("away")}
          <span className="tabular-nums">{away.length}</span>
        </p>
        <ul className="opacity-70">{away.map((one, i) => row(one, here.length + i))}</ul>
      </Stage>
    </section>
  );
}


/**
 * The meeting room as it is on the floor: Campus's room at the front, three
 * at its table in a meeting and you in its doorway, a still of the floor
 * (public/home/meeting-room, AVIF with WebP for older browsers). It fills its
 * block to the foot, as tall as the people list's, a clay object hanging off
 * the panel's edge, and the words on the right.
 */
export function MeetSection() {
  const t = useTranslations("homepage.meet");
  return (
    <section id="meetings" className={cn(COLUMN, ANCHOR, PANEL_SECTION)}>
      <Stage
        tone="sun"
        flip
        words={<Words title={t("title")} body={t("body")} more={t("more")} href="/virtual-meeting-room" />}
        block="flex h-[460px] flex-col pt-10 sm:h-[500px] sm:px-10 sm:pt-12"
        card="relative flex min-h-0 flex-1 overflow-hidden"
        clay={<Clay name="object-sticky" className="-start-4 -top-7 w-28 -rotate-[6deg] sm:-start-10 sm:-top-12 sm:w-40 xl:-start-16" />}
      >
        <picture>
          <source srcSet="/home/meeting-room.avif" type="image/avif" />
          <img
            src="/home/meeting-room.webp"
            alt=""
            width={1040}
            height={898}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </picture>
      </Stage>
    </section>
  );
}

/** One message in the chat, as the app lays it out. */
function Message({
  who,
  time,
  children,
  extra,
  turn = 0,
}: {
  who: { id: string; name: string };
  time: string;
  children?: ReactNode;
  extra?: ReactNode;
  /** Its place in the morning: the messages arrive in order as the window comes in. */
  turn?: number;
}) {
  return (
    <li data-reveal className="shrink-0" style={rise(120 + 80 * turn, { y: 8 })}>
      <div className="loop-line flex items-start gap-3" style={{ "--i": turn } as CSSProperties}>
        <Face seed={who.id} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-[14px] font-semibold">
            {who.name}
            <span className="text-[11.5px] font-normal tabular-nums text-faint">{time}</span>
          </p>
          {children && <p className="mt-0.5 text-[14.5px] leading-[1.5] text-foreground/85">{children}</p>}
          {extra}
        </div>
      </div>
    </li>
  );
}

/** A reaction under a message: the emoji and how many; your own is outlined. */
function Reaction({ emoji, count, mine = false }: { emoji: string; count: number; mine?: boolean }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] tabular-nums", mine ? "border-foreground/30 bg-foreground/[0.06] text-foreground" : "border-border text-muted-foreground")}>
      <span className="text-[13px]">{emoji}</span>
      {count}
    </span>
  );
}

/** What Jack shares: the launch's poster, a clay rocket off a laptop, the way the site's own pictures are made. */
function Poster() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/home/chat-launch.webp"
      alt=""
      width={960}
      height={540}
      loading="lazy"
      decoding="async"
      className="mt-2 aspect-video w-full max-w-[220px] rounded-[12px] object-cover ring-1 ring-border"
    />
  );
}

/** A voice message's waveform: how loud it was along the way, as the app keeps it. */
const VOICE_PEAKS = [22, 38, 64, 80, 55, 30, 48, 72, 90, 68, 40, 26, 52, 78, 60, 34, 20, 44, 70, 86, 74, 50, 28, 36, 62, 82, 58, 32, 46, 76, 66, 38, 24, 40, 64, 52, 30, 18, 34, 56, 70, 48, 26, 20, 30, 42, 28, 16];

/** A voice message as the app shows it: play, its waveform part heard, the time, and how fast. */
function VoiceNote() {
  const heard = 0.38;
  return (
    <span aria-hidden className="mt-1.5 flex w-[19rem] max-w-full items-center gap-3 rounded-[20px] border border-border bg-card py-2 pe-3.5 ps-2">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <svg viewBox="0 0 16 16" className="size-4 fill-current">
          <rect x="3.5" y="2.5" width="3.2" height="11" rx="1.1" />
          <rect x="9.3" y="2.5" width="3.2" height="11" rx="1.1" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex h-7 items-center justify-between gap-[2px]">
          {VOICE_PEAKS.map((peak, index) => (
            <span
              key={index}
              className={cn("w-[3px] shrink rounded-full", (index + 0.5) / VOICE_PEAKS.length <= heard ? "bg-foreground" : "bg-foreground/[0.18]")}
              style={{ height: `${3 + Math.pow(peak / 100, 1.8) * 23}px` }}
            />
          ))}
        </span>
        <span className="mt-1 flex h-[18px] items-center justify-between text-[11.5px] font-medium tabular-nums">
          <span>
            <span className="text-foreground">0:04</span>
            <span className="text-faint"> / 0:11</span>
          </span>
          <span className="rounded-full bg-foreground px-1.5 text-[10.5px] font-semibold leading-[18px] text-background">1.5×</span>
        </span>
      </span>
    </span>
  );
}

/**
 * The app's rail, as AppShell draws it: the office's square, the places with
 * Chat open, and the quiet things at its foot. You aren't in it: the chat's
 * column holds you at its foot, as it does in the app. In the section's loop
 * (globals.css) the floor is open first and a click hands the open look,
 * its bar and its raised square, to Chat, which loses the message count.
 */
function Rail() {
  const s = useTranslations("shell");
  const places = [
    { key: "floor", icon: Floor },
    { key: "chat", icon: Chats },
    { key: "meetings", icon: Meetings },
    { key: "people", icon: People },
  ] as const;
  return (
    <div aria-hidden className="relative hidden w-[72px] shrink-0 flex-col items-center py-3 sm:flex">
      <Face seed="office-northwind" size={40} square />
      <span className="my-2 h-px w-8 bg-border" />
      <div className="flex w-full flex-col items-center gap-1.5">
        {places.map(({ key, icon: Icon }) => {
          const active = key === "chat";
          // The two the loop moves between; shown still, Chat is open.
          const loop = key === "floor" ? "loop-on-floor" : key === "chat" ? "loop-on-chat" : null;
          const ink = loop ? `${loop}-ink` : undefined;
          return (
            <span key={key} className="relative flex w-full flex-col items-center gap-1">
              {loop && <span className={cn("absolute start-0 top-1.5 h-7 w-[3px] rounded-e-full bg-foreground", loop, !active && "opacity-0")} />}
              <span className="relative flex size-10 items-center justify-center rounded-[12px]">
                {loop && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-[12px] bg-card shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--ui-border)] dark:bg-muted",
                      loop,
                      !active && "opacity-0",
                    )}
                  />
                )}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} className={cn("relative", ink, active ? "text-foreground" : "text-muted-foreground")} />
                {key === "chat" && (
                  <span className="loop-badge absolute -end-1.5 -top-1.5 hidden min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-[18px] text-brand-foreground ring-2 ring-rail">
                    2
                  </span>
                )}
              </span>
              <span className={cn("max-w-full truncate px-1 text-[10.5px] leading-none tracking-tight", ink, active ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {s(key)}
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-auto flex w-full flex-col items-center gap-2 pt-6 text-muted-foreground">
        {[HelpCircle, SignOut, Gear].map((Icon, i) => (
          <span key={i} className="flex size-10 items-center justify-center">
            <Icon size={22} strokeWidth={1.8} className={Icon === SignOut ? "rtl:-scale-x-100" : undefined} />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The chat: what it's for across the top, then the app's chat window: the
 * channels down the side, and a morning in #general: a line of news, a
 * screenshot shared with reactions, a voice message, and someone typing.
 */
export function ChatSection() {
  const t = useTranslations("homepage.chat");
  const p = useTranslations("home.preview");
  const s = useTranslations("shell");
  const { emma, jack, olivia, noah, lily } = PEOPLE;
  const channels = [p("general"), p("design"), p("random")];
  const side = "flex h-8 items-center gap-2 rounded-[9px] px-2.5 text-[13px]";
  return (
    <section id="chat" className={cn(COLUMN, ANCHOR, PANEL_SECTION)}>
      <div className="rounded-[44px] bg-muted p-3">
        <div className={cn(PANEL_WORDS, "grid gap-6 pb-8 sm:pb-10 lg:grid-cols-2 lg:gap-16")}>
          <h2 data-reveal-words className={cn(TITLE, CJK_HEADLINE, "max-w-[16ch]")}>
            <Split text={t("title")} />
          </h2>
          <div data-reveal style={rise(80)}>
            <p className={cn(BODY, "max-w-[30rem]")}>{t("body")}</p>
            <More href="/team-chat" className="mt-6">
              {t("more")}
            </More>
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[34px] px-3 pt-10 sm:px-14 sm:pt-14" style={lit("mint")}>
            <div
              data-reveal
              style={rise(0, { y: 40 })}
              className="relative flex h-[550px] overflow-hidden rounded-t-[22px] bg-rail font-(family-name:--font-app) sm:h-[530px] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] [--face-ring:var(--ui-rail)]"
            >
              <Rail />
              <div className="relative flex min-w-0 flex-1 overflow-hidden bg-card [--face-ring:var(--ui-card)] sm:mt-2 sm:me-2 sm:rounded-t-[16px] sm:border sm:border-b-0 sm:border-border">
                {/* The floor, where the loop starts: a still of Campus, its people at their desks. */}
                <div aria-hidden className="loop-floor absolute inset-0 z-10 hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/home/floor-still.webp" alt="" width={1600} height={1000} loading="lazy" decoding="async" className="size-full object-cover object-[50%_40%]" />
                </div>
                {/* The side, as the app draws it: the office and a way to start a conversation, search, the channels and people, and you at the foot. */}
                <div className="loop-chat hidden w-[236px] shrink-0 flex-col border-e border-border bg-background p-2.5 [--face-ring:var(--ui-background)] lg:flex">
                  <div className="flex h-10 items-center justify-between px-2">
                    <span className="text-[14.5px] font-semibold tracking-[-0.01em]">{p("office")}</span>
                    <SquarePen className="size-4 text-muted-foreground" />
                  </div>
                  <div className="mt-1 flex h-9 items-center gap-2 rounded-[10px] border border-border bg-background px-2.5 text-[12.5px] text-faint">
                    <Search className="size-3.5" />
                    <span className="flex-1 truncate">{p("search")}</span>
                    <kbd className="rounded-[5px] border border-border px-1 font-sans text-[10px]">⌘K</kbd>
                  </div>
                  <p className="mt-4 flex items-center gap-1 px-2 pb-1 text-[12px] font-medium text-muted-foreground">
                    <ChevronDown className="size-3" />
                    {p("channels")}
                  </p>
                  {channels.map((name, i) => (
                    <span key={name} className={cn(side, i === 0 ? "bg-foreground/[0.06] font-medium text-foreground" : "text-muted-foreground")}>
                      <Hash className="size-3.5 text-faint" />
                      <span className="flex-1">{name}</span>
                      {i === 1 && <span className="rounded-full bg-foreground px-1.5 text-[10.5px] font-semibold leading-[1.5] text-background">3</span>}
                    </span>
                  ))}
                  <span className={cn(side, "text-muted-foreground")}>
                    <span className="flex size-5 items-center justify-center rounded-[6px] bg-foreground/[0.06]">
                      <Plus className="size-3" />
                    </span>
                    {p("addChannel")}
                  </span>
                  <p className="mt-3 flex items-center gap-1 px-2 pb-1 text-[12px] font-medium text-muted-foreground">
                    <ChevronDown className="size-3" />
                    {p("directMessages")}
                  </p>
                  {[olivia, noah, lily].map((one, i) => (
                    <span key={one.id} className={cn(side, "text-muted-foreground")}>
                      <Face seed={one.id} size={20} presence={i === 2 ? "away" : "available"} />
                      {one.name}
                    </span>
                  ))}
                  <span className={cn(side, "text-muted-foreground")}>
                    <UserPlus className="size-3.5" />
                    {s("invitePeople")}
                  </span>

                  <div className="mt-auto flex items-center gap-2.5 rounded-[12px] bg-foreground/[0.04] p-2">
                    <Face seed={emma.id} size={30} presence="available" />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-semibold">{emma.name}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{p("available")}</span>
                    </span>
                    {[Mic, Headphones, Gear].map((Icon, i) => (
                      <Icon key={i} className="size-[15px] text-muted-foreground" />
                    ))}
                  </div>
                </div>

                <div className="loop-chat flex min-w-0 flex-1 flex-col">
                  <div className="flex h-12 items-center gap-2 border-b border-border px-5 text-[14px] font-semibold sm:px-6">
                    <span className="text-faint">#</span>
                    {channels[0]}
                    <span className="ms-auto flex items-center gap-1.5 rounded-full border border-border py-0.5 pe-2 ps-0.5 text-[11.5px] font-medium text-muted-foreground [--face-ring:var(--ui-background)]">
                      <FaceStack seeds={[olivia.id, jack.id, noah.id]} size={18} max={3} />6
                    </span>
                  </div>
                  <ol className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden px-5 pb-3 pt-4 [mask-image:linear-gradient(to_bottom,transparent,black_18px)] sm:px-6">
                    <li className="flex shrink-0 items-center gap-3 text-[11.5px] font-medium text-faint">
                      <span className="h-px flex-1 bg-border" />
                      {p("today")}
                      <span className="h-px flex-1 bg-border" />
                    </li>
                    <Message who={olivia} time="09:32">
                      {t("lines.morning")}
                    </Message>
                    <Message who={noah} time="09:38" turn={1} extra={<VoiceNote />} />
                    <Message
                      who={jack}
                      time="09:46"
                      turn={2}
                      extra={
                        <>
                          <Poster />
                          <span className="mt-2 flex gap-1.5">
                            <Reaction emoji="🚀" count={3} mine />
                            <Reaction emoji="🔥" count={2} />
                          </span>
                        </>
                      }
                    >
                      {t("lines.poster")}
                    </Message>
                  </ol>
                  <p data-reveal style={rise(120 + 80 * 3, { y: 6 })} className="px-5 pb-2 text-[12px] text-faint sm:px-6">
                    <span className="loop-line inline-block" style={{ "--i": 4 } as CSSProperties}>
                      {p("typing", { name: lily.name })}
                    </span>
                  </p>
                  {/* The box, as the app draws it: what you write, then emoji, a picture and a file, and the microphone with nothing written yet. */}
                  <div className="mx-5 mb-5 rounded-2xl border border-border bg-card sm:mx-6">
                    <p className="px-4 pb-1 pt-3 text-[13.5px] text-faint">{p("composer")}</p>
                    <div className="flex items-center gap-0.5 px-2 pb-2 text-muted-foreground">
                      {[Smile, ImagePlus, Paperclip].map((Icon, i) => (
                        <span key={i} className="flex size-8 items-center justify-center">
                          <Icon className="size-[18px]" />
                        </span>
                      ))}
                      <span className="me-1 ms-auto hidden items-center gap-1 text-[11px] text-faint sm:flex">
                        <kbd className="flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1 font-sans text-[11px]">⇧</kbd>
                        <kbd className="flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1 font-sans text-[11px]">↵</kbd>
                        <span className="ms-0.5">{p("newLine")}</span>
                      </span>
                      <span className="flex size-8 items-center justify-center max-sm:ms-auto">
                        <Mic className="size-[18px]" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <span aria-hidden className="loop-click pointer-events-none absolute start-0 top-0 z-30 hidden size-0">
                <span className="absolute -start-5 -top-5 size-10 rounded-full border-2 border-foreground" />
              </span>
              <span aria-hidden className="loop-click pointer-events-none absolute start-0 top-0 z-30 hidden size-0">
                <span className="absolute -start-5 -top-5 size-10 rounded-full border-2 border-foreground" />
              </span>
              <span aria-hidden className="loop-cursor pointer-events-none absolute start-0 top-0 z-30 hidden size-0">
                <svg viewBox="0 0 24 24" className="absolute start-0 top-0 size-6 drop-shadow-[0_2px_3px_rgb(0_0_0/0.3)] rtl:-scale-x-100">
                  <path d="M3 2.5 19.5 10l-7 1.8L9 19z" fill="#111113" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </div>
          <Clay name="object-bubbles" className="-end-3 -top-10 w-24 rotate-[-6deg] sm:-end-10 sm:-top-14 sm:w-36" />
        </div>
      </div>
    </section>
  );
}

/** "Hello" in some of the floor's languages, for the languages cell. */
const HELLOS = ["Hello", "Hola", "Olá", "Bonjour", "Hallo", "Ciao", "Hej", "Cześć", "Hei", "Привет", "こんにちは", "안녕하세요", "你好", "שלום", "مرحبا"];

/** One moment from the app, as its floating pills are drawn: something round on the left, then words. */
function Moment({ lead, children }: { lead: ReactNode; children: ReactNode }) {
  return (
    <li className="flex h-12 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-border bg-card py-1 pe-4 ps-1.5 text-[13.5px] shadow-float">
      {lead}
      {children}
    </li>
  );
}

/** A round mark for a moment that has no face: the app's icon on a tint. */
function Mark({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full [&_svg]:size-4", className)}>{children}</span>;
}

/** The clay desk beside the features' words: each object's place in its corner of the section, its size and tilt. */
const DESK = [
  { name: "object-plant", at: "end-[150px] top-0 w-[190px]", turn: -4 },
  { name: "object-headset", at: "end-0 top-[70px] w-[170px]", turn: 10 },
  { name: "object-mug", at: "end-[230px] top-[150px] w-[140px]", turn: -8 },
];

/**
 * Everything else: the heading and the features in one sentence, and the
 * moments they make on the floor, rows of the app's own pills drifting past
 * and fading out at the sides. Under them, the invite link and the languages.
 */
export function Extras() {
  const t = useTranslations("homepage.extras");
  const s = useTranslations("homepage.statement");
  // The rows drift the same way in every language; each pill reads in its own.
  const rtl = ["ar", "he"].includes(useLocale());
  const notes = useTranslations("homepage.presence.notes");
  const { emma, jack, olivia, sam, noah, lily } = PEOPLE;
  const name = (who: { name: string }) => <span className="font-semibold">{who.name}</span>;
  const note = (who: { id: string; name: string; key: "emma" | "jack" | "olivia" | "sam" | "noah" | "lily" }, presence: Presence) => (
    <Moment key={who.key} lead={<Face seed={who.id} size={36} presence={presence} />}>
      {name(who)}
      <span className="text-muted-foreground">{notes(who.key)}</span>
    </Moment>
  );
  const rows: ReactNode[][] = [
    [
      note({ ...sam, key: "sam" }, "in_call"),
      <Moment key="music" lead={<Face seed={olivia.id} size={36} presence="available" />}>
        <span className="font-medium">Late Night Focus</span>
        <Bars className="h-2.5 text-[#1ed760]" />
      </Moment>,
      <Moment key="screen" lead={<Mark className="bg-ok text-white"><MonitorUp /></Mark>}>
        <span className="font-medium">{t("moments.screen", { name: emma.name })}</span>
      </Moment>,
      note({ ...emma, key: "emma" }, "available"),
    ],
    [
      <Moment key="board" lead={<Mark className="bg-foreground/[0.08]"><PenLine /></Mark>}>
        <span className="font-medium">{t("moments.whiteboard")}</span>
        <span className="flex gap-1">
          {["#f4f4f5", "#ef4444", "#3b82f6", "#22c55e"].map((color) => (
            <span key={color} className="size-2.5 rounded-full" style={{ background: color }} />
          ))}
        </span>
      </Moment>,
      <Moment key="wave" lead={<Face seed={emma.id} size={36} />}>
        <span className="font-medium">{t("moments.waved", { name: emma.name })}</span>
        <span className="origin-[70%_80%] text-[16px] motion-safe:animate-[wave_2.4s_ease-in-out_infinite]">👋</span>
      </Moment>,
      note({ ...olivia, key: "olivia" }, "busy"),
      <Moment key="room" lead={<Mark className="bg-foreground/[0.08]"><DoorOpen /></Mark>}>
        <span className="font-medium">{s("room")}</span>
        <FaceStack seeds={[jack.id, noah.id]} size={20} max={2} />
      </Moment>,
    ],
    [
      note({ ...lily, key: "lily" }, "away"),
      <Moment key="noise" lead={<Mark className="bg-foreground/[0.08]"><AudioLines /></Mark>}>
        <span className="font-medium">{t("moments.noise")}</span>
        <span className="flex h-5 w-9 items-center rounded-full bg-foreground p-0.5">
          <span className="ms-auto size-4 rounded-full bg-background" />
        </span>
      </Moment>,
      note({ ...jack, key: "jack" }, "in_call"),
      note({ ...noah, key: "noah" }, "in_call"),
    ],
  ];
  const cell = "flex min-w-0 flex-col p-6 sm:p-8";
  return (
    <section id="features" className={cn(COLUMN, ANCHOR, "relative py-24 sm:py-32")}>
      {/* A desk of your own, beside the words on a wide screen: the plant, the headset and the mug, in clay. */}
      <div aria-hidden className="pointer-events-none absolute end-0 top-24 hidden h-[320px] w-[380px] sm:top-32 xl:block 2xl:-end-6">
        {DESK.map((one, i) => (
          <span key={one.name} data-reveal className={cn("absolute block", one.at)} style={rise(60 * i, { y: 24 })}>
            <Clay name={one.name} className="relative w-full" style={{ transform: `rotate(${one.turn}deg)` }} />
          </span>
        ))}
      </div>
      <h2 data-reveal-words className={cn(TITLE, CJK_HEADLINE, "max-w-[18ch]")}>
        <Split text={t("title")} />
      </h2>
      <p data-reveal style={rise(80)} className={cn("mt-8 max-w-[38ch] text-pretty text-[22px] leading-[1.4] tracking-[-0.02em] text-muted-foreground/80 sm:text-[28px] sm:leading-[1.35]", CJK_HEADLINE)}>
        {t.rich("text", { b: (chunks) => <span className="text-foreground">{chunks}</span> })}
      </p>

      {/* The floor's moments, drifting past in rows that take turns going each way. */}
      <div aria-hidden data-reveal style={rise(100, { y: 0 })} dir="ltr" className="mt-16 flex flex-col gap-3.5 overflow-hidden py-4 font-(family-name:--font-app) [--face-ring:var(--ui-card)] [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] sm:mt-20">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn("flex w-max will-change-transform motion-safe:animate-[drift_linear_infinite]", i === 1 && "-ms-40 [animation-direction:reverse]")}
            style={{ animationDuration: `${60 + i * 12}s` }}
          >
            {[0, 1].map((copy) => (
              <ul key={copy} dir={rtl ? "rtl" : "ltr"} className="flex shrink-0 gap-3.5 pe-3.5">
                {row}
              </ul>
            ))}
          </div>
        ))}
      </div>

      <ul className="mt-16 grid grid-cols-[minmax(0,1fr)] border-y border-border sm:mt-20 md:grid-cols-2">
        <li data-reveal style={rise(0)} className={cn(cell, "border-border max-md:border-b md:border-e")}>
          <div className="flex h-36 items-center justify-center font-(family-name:--font-app)">
            <span className="flex w-full max-w-[340px] items-center gap-2 rounded-[14px] border border-border p-1.5 ps-4 text-[13px]">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-muted-foreground">
                tinyfloor.com/i/northwind
              </span>
              <span className="flex h-8 items-center gap-1.5 rounded-[10px] bg-foreground px-3 text-[12.5px] font-semibold text-background">
                <Copy className="size-3.5" />
                {t("copy")}
              </span>
            </span>
          </div>
          <h3 className="mt-6 text-[15.5px] font-medium tracking-[-0.01em]">{t("items.invite.title")}</h3>
          <p className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">{t("items.invite.body")}</p>
        </li>
        <li data-reveal style={rise(70)} className={cn(cell, "overflow-hidden")}>
          <div className="flex h-36 flex-col justify-center gap-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            {[HELLOS, [...HELLOS].reverse()].map((words, row) => (
              <span key={row} className={cn("flex w-max animate-[drift_40s_linear_infinite] will-change-transform motion-reduce:animate-none", row === 1 && "[animation-direction:reverse]")}>
                {[0, 1].map((copy) => (
                  <span key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-6 pe-6 text-[17px] font-medium">
                    {words.map((word, i) => (
                      <span key={word} dir="auto" className={(i + row) % 3 === 0 ? "text-foreground" : "text-muted-foreground/60"}>
                        {word}
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            ))}
          </div>
          <h3 className="mt-6 text-[15.5px] font-medium tracking-[-0.01em]">{t("items.languages.title")}</h3>
          <p className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">{t("items.languages.body")}</p>
        </li>
      </ul>
    </section>
  );
}

/**
 * The price, as something to try: what it means on the left, and on the
 * right a slider for the team's size, TinyFloor's one price set large beside
 * what tools priced per person would come to. It carries the nav's #plans.
 */
export function PriceSection() {
  const t = useTranslations("homepage.price");
  const locale = useLocale();
  const [free, pro] = PLANS;
  return (
    <section id="plans" className={cn(COLUMN, ANCHOR, PANEL_SECTION)}>
      <Stage
        tone="coral"
        words={<Words title={t("title")} body={t("body")} more={t("more")} href="/pricing" />}
        block="pt-20 sm:px-14 sm:pt-24"
        card="p-6 pb-8 sm:p-8 sm:pb-10"
        clay={<Clay name="object-coins" className="end-[16%] top-1 w-24 sm:top-0 sm:w-28" />}
      >
        <PriceSlider
          locale={locale}
          price={pro.price}
          free={free.people}
          most={pro.people}
          low={8}
          high={16}
          labels={{ team: t("team"), people: t.raw("people") as string, ours: t("ours"), theirs: t.raw("theirs") as string, month: t("month"), freeNote: t("freeNote") }}
        />
      </Stage>
    </section>
  );
}

/**
 * The open code: the claim and what it means, centred, the code's chips on
 * their line, and under them what it means for a team, three plain facts in
 * a row. It carries the nav's #source.
 */
export function OpenSection() {
  const t = useTranslations("homepage.open");
  const facts = ["members", "calls", "code"] as const;
  return (
    <section id="source" className={cn(COLUMN, ANCHOR, "py-24 text-center sm:py-32")}>
      <h2 data-reveal-words className={cn(TITLE, CJK_HEADLINE, "mx-auto max-w-[18ch]")}>
        <Split text={t("title")} />
      </h2>
      <p data-reveal style={rise(80)} className={cn(BODY, "mx-auto mt-6 max-w-[34rem]")}>
        {t("body")}
      </p>
      <div data-reveal style={rise(140, { y: 8 })}>
        <OpenSource className="mx-auto mt-10 max-w-[720px]" />
      </div>
      <ul className="mx-auto mt-16 grid max-w-[880px] gap-10 sm:mt-20 sm:grid-cols-3 sm:gap-0">
        {facts.map((key, i) => (
          <li key={key} data-reveal style={rise(60 * i)} className={cn("sm:px-8", i > 0 && "sm:border-s sm:border-border")}>
            <h3 className="text-[16px] font-medium tracking-[-0.01em]">{t(`facts.${key}.title`)}</h3>
            <p className="mx-auto mt-2 max-w-[16rem] text-[14px] leading-[1.55] text-muted-foreground">{t(`facts.${key}.body`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
