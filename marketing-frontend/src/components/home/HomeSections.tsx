import type { CSSProperties, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Copy,
  DoorOpen,
  Hand,
  Link2,
  Mic,
  MicOff,
  MonitorUp,
  PenLine,
  PhoneOff,
  AudioLines,
  Video,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { PEOPLE } from "@/components/floor/scenes";
import { NearbyBar } from "@/components/floor/NearbyBar";
import { Face, FaceStack, faceBackground, type Presence } from "@/components/ui/Face";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { ANCHOR, CJK_HEADLINE, COLUMN, OpenSource } from "./Blocks";
import { PriceSlider } from "./PriceSlider";
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
    <section id="people" className={cn(COLUMN, ANCHOR, "grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-[1fr_400px] lg:gap-24")}>
      <Words title={t("title")} body={t("body")} more={t("more")} href="/team-presence" />
      <div className="font-(family-name:--font-app) [--face-ring:var(--ui-background)]">
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
      </div>
    </section>
  );
}

/**
 * Someone in a call, as the app draws them with their camera off: their
 * circle on a plain tile, the name in the corner, moving bars while they
 * talk, a quiet badge when their mic is off (MeetingTile).
 */
function Tile({
  seed,
  name,
  talking = false,
  muted = false,
  reveal,
  className,
}: {
  seed: string;
  name: string;
  talking?: boolean;
  muted?: boolean;
  /** Its turn, when the tiles arrive one after another. */
  reveal?: number;
  className?: string;
}) {
  return (
    <div
      data-reveal={reveal === undefined ? undefined : true}
      style={reveal === undefined ? undefined : rise(50 * reveal, { y: 12, scale: 0.97 })}
      className={cn("relative overflow-hidden rounded-2xl bg-[color-mix(in_oklab,var(--ui-muted)_85%,var(--ui-background))] [container-type:size]", className)}>
      <span aria-hidden className="absolute left-1/2 top-1/2 aspect-square h-[34cqh] max-h-28 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ backgroundImage: faceBackground(seed) }} />
      <span className="absolute bottom-2.5 start-3 truncate text-[12.5px] font-medium text-foreground/90">{name}</span>
      {(talking || muted) && (
        <span className={cn("absolute end-2 top-2 flex size-6 items-center justify-center rounded-full", talking ? "bg-brand text-brand-foreground" : "bg-black/45 text-white")}>
          {talking ? <Bars /> : <MicOff className="size-3" />}
        </span>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-foreground/[0.06]" />
    </div>
  );
}

/** A call's controls on the app's black bezel: the mic, the camera, the screen, and leaving. */
function Controls({ className }: { className?: string }) {
  const soft = "flex size-10 items-center justify-center rounded-full bg-muted text-foreground [&_svg]:size-[18px]";
  return (
    <div className={cn("dark flex w-fit items-center gap-1.5 rounded-full bg-[#09090a] p-1.5 text-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.07),0_24px_60px_-30px_rgb(0_0_0/0.8)]", className)}>
      <span className={soft}>
        <Mic />
      </span>
      <span className={soft}>
        <Video />
      </span>
      <span className={soft}>
        <MonitorUp />
      </span>
      <span className="ms-1 flex h-10 items-center rounded-full bg-destructive px-4 text-white [&_svg]:size-[18px]">
        <PhoneOff />
      </span>
    </div>
  );
}

/**
 * A meeting as the app shows it, in small: the one talking large, the rest
 * in a column beside them, and under them the time, the meeting's name and
 * the controls. It sits on the left, with what it means on the right.
 */
export function MeetSection() {
  const t = useTranslations("homepage.meet");
  const { emma, jack, olivia, sam } = PEOPLE;
  return (
    <section id="meetings" className={cn(COLUMN, ANCHOR, "grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-[1.25fr_1fr] lg:gap-20")}>
      <div className="order-2 font-(family-name:--font-app) lg:order-1">
        <div className="grid gap-2 sm:grid-cols-[1fr_150px]">
          <Tile seed={emma.id} name={emma.name} talking reveal={0} className="aspect-[16/10]" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            <Tile seed={jack.id} name={jack.name} reveal={1} className="aspect-[4/3] sm:aspect-auto" />
            <Tile seed={olivia.id} name={olivia.name} muted reveal={2} className="aspect-[4/3] sm:aspect-auto" />
            <Tile seed={sam.id} name={sam.name} reveal={3} className="aspect-[4/3] sm:aspect-auto" />
          </div>
        </div>
        <div data-reveal className="mt-4 flex items-center justify-between gap-4" style={rise(180, { y: 8 })}>
          <p className="flex items-center gap-3 text-[13px]">
            <span className="font-medium tabular-nums">12:04</span>
            <span aria-hidden className="h-3.5 w-px bg-border" />
            <span className="text-muted-foreground">{t("meeting")}</span>
          </p>
          <Controls />
        </div>
      </div>
      <Words title={t("title")} body={t("body")} more={t("more")} href="/virtual-meeting-room" className="order-1 lg:order-2" />
    </section>
  );
}

/** One message in the chat, as the app lays it out; a reply carries the line it answers above it. */
function Message({
  who,
  time,
  children,
  reply,
  extra,
  turn = 0,
}: {
  who: { id: string; name: string };
  time: string;
  children: ReactNode;
  reply?: { who: { id: string; name: string }; text: string };
  extra?: ReactNode;
  /** Its place in the morning: the messages arrive in order as the window comes in. */
  turn?: number;
}) {
  return (
    <li data-reveal style={rise(120 + 80 * turn, { y: 8 })}>
      {reply && (
        <div className="relative mb-1 flex h-5 items-center ps-12 text-[13px] leading-5">
          {/* The app's curl from over the face below into the quoted line (Conversation's Quote). */}
          <span aria-hidden className="absolute start-[17px] top-[9px] h-[12px] w-[27px] rounded-ss-[6px] border-s-2 border-t-2 border-border" />
          <span className="flex min-w-0 items-center gap-1.5">
            <Face seed={reply.who.id} size={14} />
            <span className="shrink-0 font-medium text-foreground/70">{reply.who.name}</span>
            <span className="truncate text-muted-foreground">{reply.text}</span>
          </span>
        </div>
      )}
      <div className="flex items-start gap-3">
        <Face seed={who.id} size={36} />
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-[14px] font-semibold">
            {who.name}
            <span className="text-[11.5px] font-normal tabular-nums text-faint">{time}</span>
          </p>
          <p className="mt-0.5 text-[14.5px] leading-[1.5] text-foreground/85">{children}</p>
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

/**
 * The picture Jack shares with his message about the new onboarding: a
 * screenshot of its profile step, where you pick your colour, on a soft
 * gradient. Drawn, not a photo, so it's light and crisp at any size.
 */
function Shot() {
  const swatches = ["#f472b6", "#fb923c", "#facc15", "#34d399", "#38bdf8", "#a78bfa"];
  return (
    <div aria-hidden className="mt-2 flex aspect-video w-full max-w-[320px] items-center justify-center overflow-hidden rounded-[12px] bg-[linear-gradient(135deg,#c7d2fe,#fbcfe8_55%,#fed7aa)] ring-1 ring-border">
      <div className="flex w-[66%] flex-col items-center rounded-[12px] bg-white px-4 pb-4 pt-2.5 shadow-[0_14px_34px_-14px_rgb(76_29_149/0.5)]">
        <span className="flex gap-1 self-start">
          {["#fca5a5", "#fcd34d", "#86efac"].map((dot) => (
            <span key={dot} className="size-[5px] rounded-full" style={{ background: dot }} />
          ))}
        </span>
        <span className="relative mt-1.5 size-12 rounded-full bg-[radial-gradient(circle_at_32%_28%,#ddd6fe,#a78bfa_45%,#7c3aed)] shadow-[inset_0_-4px_10px_rgb(76_29_149/0.35)]">
          <span className="absolute -bottom-0.5 -end-0.5 flex size-[18px] items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm">
            <PenLine className="size-2.5" />
          </span>
        </span>
        <span className="mt-2.5 flex h-[18px] w-[78%] items-center rounded-[6px] border border-zinc-200 px-1.5">
          <span className="h-[4px] w-[38%] rounded-full bg-zinc-300" />
          <span className="ms-0.5 h-[9px] w-px bg-violet-500 motion-safe:animate-pulse" />
        </span>
        <span className="mt-2.5 flex gap-1.5">
          {swatches.map((color, i) => (
            <span key={color} className={cn("size-[11px] rounded-full", i === 5 && "ring-[1.5px] ring-violet-500 ring-offset-[1.5px] ring-offset-white")} style={{ background: color }} />
          ))}
        </span>
      </div>
    </div>
  );
}

/**
 * The chat: what it's for across the top, then the app's chat window: the
 * channels down the side, a morning's messages with two replies, a shared
 * screenshot of the office itself, reactions, and someone typing.
 */
export function ChatSection() {
  const t = useTranslations("homepage.chat");
  const p = useTranslations("home.preview");
  const { emma, jack, olivia, sam, noah, lily } = PEOPLE;
  const channels = [p("general"), p("design"), p("random")];
  const side = "flex h-8 items-center gap-2 rounded-[9px] px-2.5 text-[13px]";
  return (
    <section id="chat" className={cn(COLUMN, ANCHOR, "py-24 sm:py-32")}>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
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

      <div data-reveal style={rise(0, { y: 28, scale: 0.985 })} className="mt-14 flex overflow-hidden rounded-[20px] border border-border font-(family-name:--font-app) [--face-ring:var(--ui-background)] sm:mt-20">
        <div className="hidden w-[220px] shrink-0 flex-col gap-0.5 border-e border-border p-3 md:flex">
          <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium text-faint">{p("channels")}</p>
          {channels.map((name, i) => (
            <span key={name} className={cn(side, i === 0 ? "bg-foreground/[0.06] font-medium text-foreground" : "text-muted-foreground")}>
              <span className="text-faint">#</span>
              <span className="flex-1">{name}</span>
              {i === 1 && <span className="rounded-full bg-foreground px-1.5 text-[10.5px] font-semibold leading-[1.5] text-background">3</span>}
            </span>
          ))}
          <p className="px-2.5 pb-1 pt-4 text-[11.5px] font-medium text-faint">{p("directMessages")}</p>
          {[olivia, noah, lily].map((one, i) => (
            <span key={one.id} className={cn(side, "text-muted-foreground")}>
              <Face seed={one.id} size={20} presence={i === 2 ? "away" : "available"} />
              {one.name}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-12 items-center gap-2 border-b border-border px-5 text-[14px] font-semibold sm:px-6">
            <span className="text-faint">#</span>
            {channels[0]}
          </div>
          <ol className="flex flex-col gap-5 px-5 pb-4 pt-5 sm:px-6">
            <li className="flex items-center gap-3 text-[11.5px] font-medium text-faint">
              <span className="h-px flex-1 bg-border" />
              {p("today")}
              <span className="h-px flex-1 bg-border" />
            </li>
            <Message who={olivia} time="09:12">
              {p("message0")}
            </Message>
            <Message who={emma} time="09:20" turn={1}>
              {t("reply1")}
            </Message>
            <Message
              who={jack}
              time="09:40"
              turn={2}
              extra={
                <>
                  <Shot />
                  <span className="mt-2 flex gap-1.5">
                    <Reaction emoji="👀" count={2} mine />
                    <Reaction emoji="🔥" count={1} />
                  </span>
                </>
              }
            >
              {p("message3")}
            </Message>
            <Message who={sam} time="09:44" turn={3} reply={{ who: jack, text: p("message3") }}>
              {t("reply2")}
            </Message>
          </ol>
          <p data-reveal style={rise(120 + 80 * 4, { y: 6 })} className="px-5 pb-2 text-[12px] text-faint sm:px-6">
            {p("typing", { name: noah.name })}
          </p>
          <div className="mx-5 mb-5 flex h-11 items-center rounded-[12px] border border-border px-4 text-[13.5px] text-faint sm:mx-6">{p("composer")}</div>
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
    <section id="features" className={cn(COLUMN, ANCHOR, "py-24 sm:py-32")}>
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
    <section id="plans" className={cn(COLUMN, ANCHOR, "grid items-center gap-14 py-24 sm:py-32 lg:grid-cols-2 lg:gap-24")}>
      <Words title={t("title")} body={t("body")} more={t("more")} href="/pricing" />
      <div data-reveal style={rise(80, { y: 20, scale: 0.985 })}>
        <PriceSlider
        locale={locale}
        price={pro.price}
        free={free.people}
        most={pro.people}
        low={8}
        high={16}
        labels={{ team: t("team"), people: t.raw("people") as string, ours: t("ours"), theirs: t.raw("theirs") as string, month: t("month"), freeNote: t("freeNote") }}
        />
      </div>
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
