"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { ArrowDown, Check, Copy, Download, FileText, ImagePlus, Pencil, Reply, SmilePlus, Trash2 } from "@/components/ui/icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { isPicture, type ChatFile } from "@shared/chat";
import { fileUrl, sizeOf } from "@/lib/chatFiles";
import { mentionSpans } from "@/lib/mentions";
import { Viewer } from "./Viewer";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { focusComposer } from "./Composer";

export interface Line {
  id: string;
  author: string;
  authorName: string;
  body: string;
  at: number;
  files?: ChatFile[];
  /** Who it mentions, by id. */
  mentions?: string[];
  reactions?: Record<string, string[]>;
  /** When it was last edited, if it was. */
  edited?: number;
  /** Drawn instead of the author's face: the TinyFloor mark on the team's answers in a ticket. */
  mark?: ReactNode;
  /** The message this answers: who said it and how it began, or that it's gone. */
  reply?: { id: string; author?: string; authorName?: string; body?: string; files?: number; gone?: boolean };
}

const QUICK = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
/** Messages this close together from one person read as one run, under one face. */
const RUN_MS = 5 * 60_000;

/**
 * A conversation, the way Slack lays one out: days under a sticky label, runs
 * of messages under one face and name, a line where the new ones start, and
 * the beginning of the channel at the very top. Give each conversation its
 * own key, so opening another starts at its latest message. Sending always
 * brings you down to what you sent; Up in the box edits your last message
 * (`editLast` changes each time it's asked), and finishing an edit hands the
 * cursor back to the box. A message that mentions you is marked, and `target`
 * (a search result) is brought into view and lit for a moment.
 */
export function Conversation({
  lines,
  me,
  intro,
  more,
  onOlder,
  firstUnread,
  onReact,
  onEdit,
  onDelete,
  onReply,
  onOpenReply,
  personCard,
  editLast,
  names,
  target,
  loading = false,
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
  /** Where your own messages can be changed (the lobby): change one, or take it back. */
  onEdit?: (line: Line, body: string) => void;
  onDelete?: (line: Line) => void;
  /** Answer this message: the box below says who you're replying to. */
  onReply?: (line: Line) => void;
  /** A reply's quote was pressed: bring the message it answers into view. */
  onOpenReply?: (id: string) => void;
  /** Wraps a face or a name so pressing it shows who that is. */
  personCard?: (id: string, name: string, trigger: ReactNode) => ReactNode;
  /** Changes when Up was pressed in an empty box: your last message opens for editing. */
  editLast?: number;
  /** People's names by id, for the mentions in what they said. */
  names?: Map<string, string>;
  /** A message to bring into view: a search result. */
  target?: string | null;
  /** Its messages are on their way: nothing is said until they're here, then they fade in. */
  loading?: boolean;
}) {
  const t = useTranslations("chat");
  // One message is edited at a time, so Up in the box can open the right one.
  const [editing, setEditing] = useState<string | null>(null);
  const lastMine = onEdit ? [...lines].reverse().find((line) => line.author === me && line.body) : undefined;
  const asked = useRef(editLast);
  useEffect(() => {
    if (editLast === asked.current) return;
    asked.current = editLast;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastMine) setEditing(lastMine.id);
  }, [editLast, lastMine]);
  const doneEditing = () => {
    setEditing(null);
    focusComposer();
  };
  const box = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);
  const [behind, setBehind] = useState(false);
  const firstId = lines[0]?.id;
  const lastId = lines.at(-1)?.id;
  const heightBefore = useRef(0);
  const reduce = useReducedMotion();
  // Opened before its messages had come: they fade in when they do. Opened with them
  // already here (seen before, or fetched ahead), they're simply there.
  const [arrived] = useState(loading);
  // What's said after it first showed eases in, one message at a time; a page of
  // older ones loaded above doesn't.
  const [settledAt, setSettledAt] = useState<number | null>(loading ? null : (lines.at(-1)?.at ?? 0));
  if (!loading && settledAt === null) setSettledAt(lines.at(-1)?.at ?? 0);

  // New messages: follow them if you were at the bottom, otherwise say so. Your own always come into view.
  const lastAuthor = lines.at(-1)?.author;
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    if (atEnd.current || lastAuthor === me) {
      element.scrollTop = element.scrollHeight;
      atEnd.current = true;
      setBehind(false);
    } else setBehind(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId]);

  // Older messages arrived above: keep what you were reading where it was.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element || !heightBefore.current) return;
    element.scrollTop += element.scrollHeight - heightBefore.current;
    heightBefore.current = 0;
  }, [firstId]);

  // A search result: once it's loaded, scroll to it and light it up for a moment.
  const [lit, setLit] = useState<string | null>(null);
  const reached = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!target || reached.current === target) return;
    const row = box.current?.querySelector<HTMLElement>(`[data-line="${CSS.escape(target)}"]`);
    if (!row) return;
    reached.current = target;
    row.scrollIntoView({ block: "center" });
    atEnd.current = false;
    setLit(target);
    // Again as messages arrive: the one looked for may be in the page that just came.
  }, [target, lines.length]);
  useEffect(() => {
    if (!lit) return;
    const timer = setTimeout(() => setLit(null), 2200);
    return () => clearTimeout(timer);
  }, [lit]);

  // A reply's quote: the message it answers, brought into view and lit; asked for first if it isn't loaded.
  const openReply = (id: string) => {
    const row = box.current?.querySelector<HTMLElement>(`[data-line="${CSS.escape(id)}"]`);
    if (!row) return onOpenReply?.(id);
    row.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    atEnd.current = false;
    // Lit again even if it was the last one lit.
    setLit(null);
    requestAnimationFrame(() => setLit(id));
  };

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
        className="absolute inset-0 overflow-y-auto overscroll-contain pb-7"
      >
        <div ref={top} />
        {loading ? (
          <Patiently />
        ) : (
          <motion.div
            initial={arrived ? (reduce ? { opacity: 0 } : { opacity: 0, y: 6 }) : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
          >
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
                  // A reply always shows whose it is, under the message it answers.
                  const grouped = !!previous && !line.reply && previous.author === line.author && line.at - previous.at < RUN_MS;
                  const fresh = settledAt !== null && line.at > settledAt;
                  return (
                    <Fragment key={line.id}>
                      {line.id === firstUnread && <NewLine label={t("new")} />}
                      <Arrive fresh={fresh}>
                        <Message
                          line={line}
                          grouped={grouped && line.id !== firstUnread}
                          me={me}
                          onReact={onReact}
                          onEdit={line.author === me ? onEdit : undefined}
                          onDelete={line.author === me ? onDelete : undefined}
                          onReply={onReply}
                          onOpenReply={openReply}
                          personCard={personCard}
                          editing={editing === line.id}
                          onEditing={(on) => (on ? setEditing(line.id) : doneEditing())}
                          names={names}
                          lit={lit === line.id}
                        />
                      </Arrive>
                    </Fragment>
                  );
                })}
              </section>
            ))}
          </motion.div>
        )}
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

/**
 * The message a reply answers, above it: a thin line curling down from the
 * face column into the reply, then a small face, the name and how it began,
 * the way Discord shows it. Pressing it brings that message into view.
 */
function Quote({ reply, onOpen }: { reply: NonNullable<Line["reply"]>; onOpen?: (id: string) => void }) {
  const t = useTranslations("chat");
  return (
    // 20 tall, 4 clear of the name under it; the small face sits on the text column, as the name does.
    <div className="relative mb-1 flex h-5 items-center ps-12">
      {/* From over the middle of the face below (its column is 36 wide) to 4 short of the small face, 3 clear of the face. */}
      <span aria-hidden className="absolute start-[17px] top-[9px] h-[12px] w-[27px] rounded-ss-[6px] border-s-2 border-t-2 border-border" />
      <button
        type="button"
        disabled={reply.gone || !onOpen}
        onClick={() => onOpen?.(reply.id)}
        className="group/quote flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 text-[13px] leading-5 disabled:cursor-default"
      >
        {reply.gone ? (
          <span className="italic text-faint">{t("replyGone")}</span>
        ) : (
          <>
            <Face seed={reply.author ?? ""} size={14} />
            <span className="shrink-0 font-medium text-foreground/70 transition-colors group-hover/quote:text-foreground">{reply.authorName}</span>
            {reply.body ? (
              <span className="truncate text-muted-foreground transition-colors group-hover/quote:text-foreground/80" data-ph-mask>
                {reply.body.replace(/\s+/g, " ")}
              </span>
            ) : reply.files ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <ImagePlus className="size-3.5" />
                {t("replyFiles", { count: reply.files })}
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}

/** A message said just now comes up into place; one that was already here is just there. */
function Arrive({ fresh, children }: { fresh: boolean; children: ReactNode }) {
  if (!fresh) return children;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
      {children}
    </motion.div>
  );
}

/** Waiting on a conversation's messages: nothing at first, so a quick load never flickers; dots if it takes a while. */
function Patiently() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 400);
    return () => clearTimeout(timer);
  }, []);
  return <div className="flex h-full items-center justify-center text-muted-foreground">{slow && <Loader variant="dots" size={16} />}</div>;
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
  onEdit,
  onDelete,
  onReply,
  onOpenReply,
  personCard,
  editing: isEditing,
  onEditing,
  names,
  lit,
}: {
  line: Line;
  grouped: boolean;
  me: string;
  onReact?: (line: Line, emoji: string, on: boolean) => void;
  onEdit?: (line: Line, body: string) => void;
  onDelete?: (line: Line) => void;
  onReply?: (line: Line) => void;
  onOpenReply?: (id: string) => void;
  personCard?: (id: string, name: string, trigger: ReactNode) => ReactNode;
  editing: boolean;
  onEditing: (on: boolean) => void;
  names?: Map<string, string>;
  lit?: boolean;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const [copied, setCopied] = useState(false);
  // The words while they're being changed; opening the edit starts from what was sent.
  const [draft, setDraft] = useState(line.body);
  const [wasEditing, setWasEditing] = useState(isEditing);
  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing) setDraft(line.body);
  }
  const editing = isEditing ? draft : null;
  const setEditing = (value: string | null) => {
    if (value === null) return onEditing(false);
    setDraft(value);
    if (!isEditing) onEditing(true);
  };
  const [confirming, setConfirming] = useState(false);
  const time = format.dateTime(new Date(line.at), { hour: "numeric", minute: "2-digit" });
  const card = (trigger: ReactNode) => (personCard ? personCard(line.author, line.authorName, trigger) : trigger);
  const reactions = Object.entries(line.reactions ?? {});
  // Mentioned: marked down its edge, so it stands out in a long channel without shouting.
  const forMe = !!line.mentions?.includes(me);
  const mentioned = (line.mentions ?? []).map((id) => ({ id, displayName: names?.get(id) ?? "" }));

  return (
    <div
      data-line={line.id}
      className={cn(
        "group relative px-5 py-0.5 transition-colors duration-700 sm:px-6",
        !grouped && "mt-2 pt-1.5",
        lit ? "bg-brand/[0.12]" : forMe ? "bg-brand/[0.06] hover:bg-brand/[0.09]" : "hover:bg-muted/50",
        forMe && "shadow-[inset_2px_0_0_var(--color-brand)]",
      )}
    >
      {line.reply && <Quote reply={line.reply} onOpen={onOpenReply} />}
      <div className="flex gap-3">
      <div className="w-9 shrink-0">
        {grouped ? (
          // One line, wider than the face's column if it must: it reaches back into the padding, never under the text.
          <span className="flex justify-end whitespace-nowrap pt-[3px] text-[10.5px] tabular-nums text-faint opacity-0 group-hover:opacity-100">
            {time}
          </span>
        ) : line.mark ? (
          line.mark
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
        {editing !== null ? (
          <form
            className="mt-0.5"
            onSubmit={(event) => {
              event.preventDefault();
              const body = editing.trim();
              if (body && body !== line.body) onEdit?.(line, body);
              setEditing(null);
            }}
          >
            <textarea
              autoFocus
              // Carry on from the end of what you wrote, as you would in the box below.
              onFocus={(event) => event.currentTarget.setSelectionRange(event.currentTarget.value.length, event.currentTarget.value.length)}
              value={editing}
              rows={Math.min(6, editing.split("\n").length)}
              onChange={(event) => setEditing(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(null);
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-[16px] leading-[1.45] text-foreground outline-none focus:border-foreground/35 md:text-[14px]"
            />
            <div className="mt-1.5 flex gap-1.5">
              <button type="submit" className="h-7 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background">
                {t("save")}
              </button>
              <button type="button" onClick={() => setEditing(null)} className="h-7 cursor-pointer rounded-full px-3 text-[12px] text-muted-foreground hover:bg-muted">
                {t("cancel")}
              </button>
            </div>
          </form>
        ) : (
          line.body && (
            <p dir="auto" data-ph-mask className="whitespace-pre-wrap break-words text-[14px] leading-[1.45] text-foreground/90">
              <Linked text={line.body} mentioned={mentioned} me={me} />
              {line.edited && <span className="ms-1.5 text-[11px] text-faint">({t("edited")})</span>}
            </p>
          )
        )}
        {!!line.files?.length && <Files files={line.files} />}

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
        {onReply && editing === null && (
          <button
            type="button"
            aria-label={t("reply")}
            title={t("reply")}
            onClick={() => onReply(line)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Reply className="size-3.5" />
          </button>
        )}
        {onEdit && editing === null && (
          <button
            type="button"
            aria-label={t("edit")}
            title={t("edit")}
            onClick={() => setEditing(line.body)}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
        {onDelete &&
          (confirming ? (
            <button
              type="button"
              onClick={() => onDelete(line)}
              onBlur={() => setConfirming(false)}
              autoFocus
              className="flex h-7 cursor-pointer items-center rounded-lg bg-destructive px-2 text-[12px] font-medium text-white"
            >
              {t("deleteConfirm")}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t("delete")}
              title={t("delete")}
              onClick={() => setConfirming(true)}
              className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          ))}
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

/** A link written in a message opens, in a new tab; the rest stays plain text. */
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]}]/gi;
function Linked({ text, mentioned = [], me }: { text: string; mentioned?: Array<{ id: string; displayName: string }>; me?: string }) {
  const parts: ReactNode[] = [];
  let at = 0;
  // Mentions and links, in the order they come; anything between them is plain words.
  const marks = [
    ...mentionSpans(text, mentioned).map((span) => ({ ...span, kind: "mention" as const })),
    ...[...text.matchAll(URL_PATTERN)].map((match) => ({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length, kind: "link" as const, person: null })),
  ]
    .sort((a, b) => a.start - b.start)
    .filter((mark, index, all) => index === 0 || mark.start >= all[index - 1].end);
  for (const mark of marks) {
    const start = mark.start;
    if (start > at) parts.push(text.slice(at, start));
    if (mark.kind === "mention") {
      parts.push(
        <span
          key={start}
          className={cn(
            "rounded-[5px] px-[3px] py-px font-medium",
            mark.person?.id === me ? "bg-brand/20 text-foreground" : "bg-brand/10 text-brand",
          )}
        >
          {text.slice(start, mark.end)}
        </span>,
      );
      at = mark.end;
      continue;
    }
    const match = [text.slice(start, mark.end)];
    parts.push(
      <a
        key={start}
        href={match[0]}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-brand underline decoration-brand/40 underline-offset-2 hover:decoration-brand"
      >
        {match[0]}
      </a>,
    );
    at = start + match[0].length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <>{parts}</>;
}

/** The biggest a single picture is drawn in a message; its own shape decides the rest. */
const PICTURE = { width: 360, height: 280 };

/**
 * What came with a message: pictures, drawn at their own shape (one on its
 * own, several as a grid of squares) and opened full size on a click; any
 * other file as a card that downloads it.
 */
function Files({ files }: { files: ChatFile[] }) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [viewing, setViewing] = useState<ChatFile | null>(null);
  const pictures = files.filter((file) => isPicture(file));
  const others = files.filter((file) => !isPicture(file));
  const single = pictures.length === 1 ? pictures[0] : null;
  const fit = single?.width && single.height ? Math.min(1, PICTURE.width / single.width, PICTURE.height / single.height) : 1;

  return (
    <div className="mt-1.5 flex flex-col items-start gap-1.5">
      {single ? (
        <button
          type="button"
          onClick={() => setViewing(single)}
          aria-label={t("openPicture", { name: single.name })}
          className="block max-w-full cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted"
          // Its own shape, at most the picture's box, and never wider than the column on a phone.
          style={
            single.width && single.height
              ? { width: Math.round(single.width * fit), aspectRatio: `${single.width} / ${single.height}` }
              : { width: PICTURE.width, aspectRatio: "4 / 3" }
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(single)} alt={single.name} loading="lazy" className="ph-no-capture size-full object-cover" />
        </button>
      ) : (
        pictures.length > 1 && (
          <div className="grid grid-cols-2 gap-1.5">
            {pictures.map((file) => (
              <button
                key={file.key}
                type="button"
                onClick={() => setViewing(file)}
                aria-label={t("openPicture", { name: file.name })}
                className="block size-[8.5rem] cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted sm:size-40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(file)} alt={file.name} loading="lazy" className="ph-no-capture size-full object-cover" />
              </button>
            ))}
          </div>
        )
      )}
      {others.map((file) => (
        <a
          key={file.key}
          href={fileUrl(file, true)}
          download={file.name}
          className="group/file flex h-14 w-[22.5rem] max-w-full items-center gap-3 rounded-xl border border-border bg-card px-3 transition-colors hover:border-border-strong"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-foreground">{file.name}</span>
            <span className="block text-[11.5px] text-muted-foreground">
              {[extensionLabel(file.name), sizeOf(file.size, locale)].filter(Boolean).join(" · ")}
            </span>
          </span>
          <Download className="size-4 shrink-0 text-faint transition-colors group-hover/file:text-foreground" />
        </a>
      ))}
      {viewing && <Viewer file={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

/** "PDF", "DOCX": what kind of file, from its name. */
function extensionLabel(name: string): string {
  const found = /\.([a-z0-9]{1,6})$/i.exec(name);
  return found ? found[1].toUpperCase() : "";
}

function MoreReactions({ onPick, label }: { onPick: (emoji: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);
  // A press anywhere else, or Escape, puts the extra reactions away.
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => !holder.current?.contains(event.target as Node) && setOpen(false);
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <span ref={holder} className="relative flex">
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
export function ConversationIntro({
  mark,
  title,
  body,
  actions,
}: {
  mark: ReactNode;
  title: string;
  body: ReactNode;
  /** Ways to start, while nothing has been said. */
  actions?: ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <div className="mb-3">{mark}</div>
      <h3 className="text-[20px] font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
