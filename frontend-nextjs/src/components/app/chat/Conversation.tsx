"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { ArrowDown, Check, Copy, SmilePlus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ChatImage } from "@shared/chat";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

export interface Line {
  id: string;
  author: string;
  authorName: string;
  body: string;
  at: number;
  image?: ChatImage;
  reactions?: Record<string, string[]>;
}

const QUICK = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
/** Messages this close together from one person read as one run, under one face. */
const RUN_MS = 5 * 60_000;

/**
 * A conversation, the way Slack lays one out: days under a sticky label, runs
 * of messages under one face and name, a line where the new ones start, and
 * the beginning of the channel at the very top. Give each conversation its
 * own key, so opening another starts at its latest message.
 */
export function Conversation({
  lines,
  me,
  intro,
  more,
  onOlder,
  firstUnread,
  onReact,
  personCard,
}: {
  lines: Line[];
  me: string;
  /** What sits above the first message, once there is nothing older. */
  intro: ReactNode;
  more: boolean;
  onOlder?: () => void;
  /** The first message you had not read when you opened this. */
  firstUnread?: string | null;
  onReact?: (line: Line, emoji: string, on: boolean) => void;
  /** Wraps a face or a name so pressing it shows who that is. */
  personCard?: (id: string, name: string, trigger: ReactNode) => ReactNode;
}) {
  const t = useTranslations("chat");
  const box = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const [behind, setBehind] = useState(false);
  const firstId = lines[0]?.id;
  const lastId = lines.at(-1)?.id;
  const heightBefore = useRef(0);
  const reduce = useReducedMotion();

  // New messages: follow them if you were at the bottom, otherwise say so.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    if (atEnd.current) element.scrollTop = element.scrollHeight;
    else setBehind(true);
  }, [lastId]);

  // Older messages arrived above: keep what you were reading where it was.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element || !heightBefore.current) return;
    element.scrollTop += element.scrollHeight - heightBefore.current;
    heightBefore.current = 0;
  }, [firstId]);

  // Reaching the top asks for the page before it.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = top.current;
    if (!sentinel || !more || !onOlder) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        heightBefore.current = box.current?.scrollHeight ?? 0;
        onOlder();
      },
      { root: box.current, rootMargin: "200px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [more, onOlder, firstId]);

  const days = byDay(lines);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={box}
        onScroll={(event) => {
          const element = event.currentTarget;
          atEnd.current = element.scrollHeight - element.scrollTop - element.clientHeight < 60;
          if (atEnd.current) setBehind(false);
        }}
        className="absolute inset-0 overflow-y-auto overscroll-contain pb-4"
      >
        <div ref={top} />
        {more ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader variant="dots" size={16} />
          </div>
        ) : (
          <div className="px-5 pb-2 pt-10 sm:px-6">{intro}</div>
        )}

        {days.map((day) => (
          <section key={day.key}>
            <DayLabel at={day.at} />
            {day.lines.map((line, index) => {
              const previous = day.lines[index - 1];
              const grouped = !!previous && previous.author === line.author && line.at - previous.at < RUN_MS;
              return (
                <Fragment key={line.id}>
                  {line.id === firstUnread && <NewLine label={t("new")} />}
                  <Message
                    line={line}
                    grouped={grouped && line.id !== firstUnread}
                    me={me}
                    onReact={onReact}
                    personCard={personCard}
                  />
                </Fragment>
              );
            })}
          </section>
        ))}
      </div>

      <AnimatePresence>
        {behind && (
          <motion.button
            type="button"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            onClick={() => {
              const element = box.current;
              if (element) element.scrollTo({ top: element.scrollHeight, behavior: reduce ? "auto" : "smooth" });
              setBehind(false);
            }}
            className="absolute bottom-3 left-1/2 z-10 flex h-8 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12px] font-medium text-background shadow-float"
          >
            <ArrowDown className="size-3.5" />
            {t("latest")}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function byDay(lines: Line[]) {
  const days: Array<{ key: string; at: number; lines: Line[] }> = [];
  for (const line of lines) {
    const key = new Date(line.at).toDateString();
    const last = days.at(-1);
    if (last?.key === key) last.lines.push(line);
    else days.push({ key, at: line.at, lines: [line] });
  }
  return days;
}

function DayLabel({ at }: { at: number }) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const day = new Date(at);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  const label =
    day.toDateString() === today.toDateString()
      ? t("today")
      : day.toDateString() === yesterday.toDateString()
        ? t("yesterday")
        : format.dateTime(day, {
            weekday: "long",
            month: "long",
            day: "numeric",
            ...(day.getFullYear() === today.getFullYear() ? {} : { year: "numeric" }),
          });
  // The pill sticks while its day is on screen; the line stays where the day begins.
  return (
    <>
      <div className="pointer-events-none sticky top-2 z-[5] flex h-0 justify-center">
        <span className="mt-6 h-7 -translate-y-1/2 rounded-full border border-border bg-card px-3 text-[12px] font-medium leading-[26px] text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
          {label}
        </span>
      </div>
      <div className="flex h-12 items-center px-5 sm:px-6" aria-hidden>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

function NewLine({ label }: { label: string }) {
  return (
    <div className="relative my-1 flex h-4 items-center px-5 sm:px-6" role="separator">
      <span className="h-px flex-1 bg-brand/60" />
      <span className="ms-2 text-[11px] font-semibold uppercase tracking-wide text-brand">{label}</span>
    </div>
  );
}

function Message({
  line,
  grouped,
  me,
  onReact,
  personCard,
}: {
  line: Line;
  grouped: boolean;
  me: string;
  onReact?: (line: Line, emoji: string, on: boolean) => void;
  personCard?: (id: string, name: string, trigger: ReactNode) => ReactNode;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  const time = format.dateTime(new Date(line.at), { hour: "numeric", minute: "2-digit" });
  const card = (trigger: ReactNode) => (personCard ? personCard(line.author, line.authorName, trigger) : trigger);
  const reactions = Object.entries(line.reactions ?? {});

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-5 py-0.5 transition-colors hover:bg-muted/50 sm:px-6",
        !grouped && "mt-2 pt-1.5",
      )}
    >
      <div className="w-9 shrink-0">
        {grouped ? (
          <span className="block pt-[3px] text-end text-[10.5px] tabular-nums text-faint opacity-0 group-hover:opacity-100">
            {time}
          </span>
        ) : (
          card(
            <button type="button" className="cursor-pointer rounded-full" aria-label={line.authorName}>
              <Face seed={line.author} size={36} />
            </button>,
          )
        )}
      </div>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <div className="flex items-baseline gap-2 leading-5">
            {card(
              <button type="button" className="cursor-pointer text-[14px] font-semibold text-foreground hover:underline">
                {line.authorName}
              </button>,
            )}
            <span className="text-[11.5px] tabular-nums text-faint">{time}</span>
          </div>
        )}
        {line.body && (
          <p dir="auto" className="whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-foreground/90">
            {line.body}
          </p>
        )}
        {line.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/attachments/${line.image.key}`}
            alt=""
            width={line.image.width}
            height={line.image.height}
            className="mt-1.5 h-auto max-w-[min(22rem,100%)] rounded-xl border border-border"
          />
        )}

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map(([emoji, people]) => {
              const mine = people.includes(me);
              return (
                <button
                  key={emoji}
                  type="button"
                  disabled={!onReact}
                  onClick={() => onReact?.(line, emoji, !mine)}
                  className={cn(
                    "flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[12px] transition-colors",
                    mine
                      ? "border-brand/40 bg-brand/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-border-strong",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="tabular-nums">{people.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* What you can do to a message, on hover or focus. */}
      <div className="absolute -top-3.5 end-5 z-[6] hidden items-center gap-0.5 rounded-xl border border-border bg-popover p-0.5 shadow-float group-focus-within:flex group-hover:flex">
        {onReact &&
          QUICK.slice(0, 4).map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={emoji}
              onClick={() => onReact(line, emoji, !line.reactions?.[emoji]?.includes(me))}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[14px] hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        {onReact && (
          <MoreReactions onPick={(emoji) => onReact(line, emoji, !line.reactions?.[emoji]?.includes(me))} label={t("react")} />
        )}
        <button
          type="button"
          aria-label={t("copy")}
          title={t("copy")}
          onClick={async () => {
            await navigator.clipboard?.writeText(line.body).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

function MoreReactions({ onPick, label }: { onPick: (emoji: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative flex">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen((was) => !was)}
        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <SmilePlus className="size-3.5" />
      </button>
      {open && (
        <span className="absolute end-0 top-8 flex gap-0.5 rounded-xl border border-border bg-popover p-0.5 shadow-float">
          {["🙌", "🔥", "💯", "🙏", "🤔", "😮", "👀", "✅"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onPick(emoji);
                setOpen(false);
              }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[14px] hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/** The top of a conversation: what this is and who can read it. */
export function ConversationIntro({ mark, title, body }: { mark: ReactNode; title: string; body: ReactNode }) {
  return (
    <div className="max-w-xl">
      <div className="mb-3">{mark}</div>
      <h3 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
