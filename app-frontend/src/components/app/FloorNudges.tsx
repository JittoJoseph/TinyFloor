"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { isDm, isPicture, isVoice, type ChatMessage } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { Face } from "@/components/ui/Face";
import { ArrowUp, Check, Mic, Paperclip, X } from "@/components/ui/icons";
import { usePrefs } from "@/lib/prefs";
import { SPRING_LAYOUT, SPRING_SWAP } from "@/lib/ease";
import { TEAMMATE_ARRIVED_EVENT, WAVED_AT_YOU_EVENT, waveAt } from "@/lib/floor";
import { cn } from "@/lib/utils";

/*
 * What's worth a glance while you're on the floor (docs/product.md): a message
 * you haven't seen, and a teammate walking in or waving at you. They arrive at
 * the top of the floor, in the gap between its two rows of controls, as one
 * dark island in the controls' own style: a wave or an arrival is a slim pill
 * with one thing to do, a message opens into a card you can answer from where
 * you stand. Newer ones stack over older ones, which peek out below; pointing
 * at the stack spreads it out and holds it. A run of messages from one person
 * in one place is one card that keeps up with them. One setting turns it off.
 */

type Hello = { kind: "wave" | "arrived"; id: string; person: string; name: string; done?: boolean };
type Note = {
  kind: "message";
  id: string;
  channel: string;
  author: string;
  name: string;
  /** The latest of the run. */
  message: ChatMessage;
  /** How many messages the card stands for. */
  count: number;
  mentionsYou: boolean;
};
type Nudge = Hello | Note;

/** How long each stays on its own, and how many show at once. */
const SHOW_MS = { message: 7000, wave: 6000, arrived: 5000 } as const;
const MAX = 3;

let seed = 0;
const nextId = () => `nudge-${++seed}`;

export function FloorNudges({ chatPath }: { chatPath: (channel: string) => string }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const router = useRouter();
  const { nudges: enabled } = usePrefs();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [open, setOpen] = useState(false);
  const [replying, setReplying] = useState<string | null>(null);

  // Each nudge's own clock: what's left of it, so pointing at the stack can stop them all and let go again.
  const clocks = useRef(new Map<string, { left: number; started: number; timer?: number }>());
  const held = useRef(false);

  const dismiss = useCallback((id: string) => {
    const clock = clocks.current.get(id);
    if (clock?.timer) window.clearTimeout(clock.timer);
    clocks.current.delete(id);
    setNudges((all) => all.filter((one) => one.id !== id));
    setReplying((now) => (now === id ? null : now));
    // The last one gone: the stack closes, and lets go, for the next one.
    if (!clocks.current.size) {
      held.current = false;
      setOpen(false);
    }
  }, []);

  const run = useCallback(
    (id: string) => {
      const clock = clocks.current.get(id);
      if (!clock || held.current) return;
      clock.started = Date.now();
      clock.timer = window.setTimeout(() => dismiss(id), clock.left);
    },
    [dismiss],
  );

  const time = useCallback(
    (id: string, ms: number) => {
      const old = clocks.current.get(id);
      if (old?.timer) window.clearTimeout(old.timer);
      clocks.current.set(id, { left: ms, started: Date.now() });
      run(id);
    },
    [run],
  );

  const hold = useCallback((on: boolean) => {
    held.current = on;
    clocks.current.forEach((clock, id) => {
      // A wave already sent is on its way out whatever happens.
      if (clock.left === 0) return;
      if (on) {
        if (clock.timer) window.clearTimeout(clock.timer);
        clock.timer = undefined;
        clock.left = Math.max(clock.left - (Date.now() - clock.started), 1500);
      } else {
        run(id);
      }
    });
  }, [run]);

  // Newest first, at most MAX; whatever falls off the end goes with its clock.
  const add = useCallback(
    (nudge: Nudge, replace?: (one: Nudge) => boolean) => {
      setNudges((all) => {
        const kept = replace ? all.filter((one) => !replace(one)) : all;
        const next = [nudge, ...kept];
        next.slice(MAX).forEach((one) => {
          const clock = clocks.current.get(one.id);
          if (clock?.timer) window.clearTimeout(clock.timer);
          clocks.current.delete(one.id);
        });
        return next.slice(0, MAX);
      });
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    return chat.onIncoming((message) => {
      const me = chat.getSnapshot().me;
      const mentionsYou = !!me && !!message.mentions?.includes(me);
      setNudges((all) => {
        // The same person still talking in the same place: one card, kept up to date and brought back to the top.
        const run = all.find((one): one is Note => one.kind === "message" && one.channel === message.channel && one.author === message.author);
        const id = run?.id ?? nextId();
        const note: Note = {
          kind: "message",
          id,
          channel: message.channel,
          author: message.author,
          name: message.authorName,
          message,
          count: (run?.count ?? 0) + 1,
          mentionsYou: mentionsYou || !!run?.mentionsYou,
        };
        queueMicrotask(() => time(id, SHOW_MS.message));
        const next = [note, ...all.filter((one) => one.id !== id)];
        next.slice(MAX).forEach((one) => clocks.current.delete(one.id));
        return next.slice(0, MAX);
      });
    });
  }, [enabled, time]);

  // A teammate walked in, or waved at you: one nudge a person, their wave replacing their arrival.
  useEffect(() => {
    if (!enabled) return;
    const hello = (kind: Hello["kind"]) => (event: Event) => {
      const { id: person, name } = (event as CustomEvent<{ id: string; name: string }>).detail;
      const id = nextId();
      add({ kind, id, person, name }, (one) => one.kind !== "message" && one.person === person);
      time(id, SHOW_MS[kind]);
    };
    const arrived = hello("arrived");
    const waved = hello("wave");
    window.addEventListener(TEAMMATE_ARRIVED_EVENT, arrived);
    window.addEventListener(WAVED_AT_YOU_EVENT, waved);
    return () => {
      window.removeEventListener(TEAMMATE_ARRIVED_EVENT, arrived);
      window.removeEventListener(WAVED_AT_YOU_EVENT, waved);
    };
  }, [enabled, add, time]);

  // Turning them off, or leaving the floor, clears whatever is showing.
  useEffect(() => {
    if (!enabled) return;
    const all = clocks.current;
    return () => {
      all.forEach((clock) => clock.timer && window.clearTimeout(clock.timer));
      all.clear();
      held.current = false;
      setNudges([]);
      setOpen(false);
    };
  }, [enabled]);

  const openChat = (channel: string, id: string) => {
    dismiss(id);
    router.push(chatPath(channel));
  };

  // Waving shows it was done, then goes on its own, even while the stack is held.
  const waveBack = (nudge: Hello) => {
    waveAt(nudge.person);
    setNudges((all) => all.map((one) => (one.id === nudge.id ? { ...nudge, done: true } : one)));
    const clock = clocks.current.get(nudge.id);
    if (clock?.timer) window.clearTimeout(clock.timer);
    clocks.current.set(nudge.id, { left: 0, started: 0, timer: window.setTimeout(() => dismiss(nudge.id), 1400) });
  };

  const spread = open || nudges.length === 1;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-14 z-[55] flex justify-center px-3 sm:top-3"
      onPointerEnter={() => {
        setOpen(true);
        hold(true);
      }}
      onPointerLeave={() => {
        if (replying) return;
        setOpen(false);
        hold(false);
      }}
    >
      <ol aria-live="polite" className="relative flex w-full max-w-[23rem] flex-col items-center">
        <AnimatePresence initial={false}>
          {nudges.map((nudge, index) => (
            <Island key={nudge.id} index={index} spread={spread} count={nudges.length} closeLabel={tc("close")} onDismiss={() => dismiss(nudge.id)}>
              {nudge.kind === "message" ? (
                <Message
                  note={nudge}
                  replying={replying === nudge.id}
                  onOpen={() => openChat(nudge.channel, nudge.id)}
                  onReply={() => {
                    setReplying(nudge.id);
                    setOpen(true);
                    hold(true);
                  }}
                  onSent={() => {
                    setReplying(null);
                    dismiss(nudge.id);
                  }}
                  onCancel={() => {
                    setReplying(null);
                    hold(false);
                  }}
                />
              ) : (
                <Greeting
                  hello={nudge}
                  title={nudge.kind === "wave" ? t("waved", { name: nudge.name }) : t("arrived", { name: nudge.name })}
                  action={nudge.done ? t("wavedDone") : nudge.kind === "wave" ? t("waveBackShort") : t("waveShort")}
                  onAction={() => waveBack(nudge)}
                />
              )}
            </Island>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}

/**
 * One nudge on the stack: on top it's whole; behind, a step smaller and
 * dimmer, peeking out below the one in front, until the stack is spread.
 */
function Island({
  index,
  spread,
  count,
  closeLabel,
  onDismiss,
  children,
}: {
  index: number;
  spread: boolean;
  count: number;
  closeLabel: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const behind = !spread && index > 0;
  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.92 }}
      animate={
        reduce
          ? { opacity: behind ? 0 : 1 }
          : {
              opacity: behind ? 1 - index * 0.35 : 1,
              y: behind ? index * 7 : 0,
              scale: behind ? 1 - index * 0.05 : 1,
            }
      }
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.94, transition: { duration: 0.18 } }}
      transition={SPRING_LAYOUT}
      drag={reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) onDismiss();
      }}
      className={cn(
        "group/nudge pointer-events-auto w-full",
        behind ? "absolute inset-x-0 top-0 [&_*]:pointer-events-none" : "relative",
        spread && index > 0 && "mt-2",
      )}
      style={{ zIndex: count - index, transformOrigin: "50% 0%" }}
    >
      <div
        className={cn(
          "dark relative mx-auto max-w-full rounded-[22px] bg-[#0c0c0d]/95 text-foreground shadow-[0_0_0_1px_rgb(255_255_255/0.08),0_18px_44px_-18px_rgb(0_0_0/0.7)] backdrop-blur-xl [--face-ring:#0c0c0d]",
          // Alone it fits what it says; in a stack each is as wide as the stack, so the ones behind line up under the one in front.
          count > 1 ? "w-full" : "w-fit",
        )}
      >
        {children}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={closeLabel}
          className="absolute -start-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-[#2a2a2c] text-white/80 opacity-0 shadow-[0_0_0_1px_rgb(255_255_255/0.1)] transition-opacity hover:text-white focus-visible:opacity-100 group-hover/nudge:opacity-100"
        >
          <X className="size-3" strokeWidth={2.4} />
        </button>
      </div>
    </motion.li>
  );
}

/** A wave or an arrival: a slim pill with the face, what happened and the one thing to do about it. */
function Greeting({ hello, title, action, onAction }: { hello: Hello; title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex h-12 items-center gap-2.5 ps-2 pe-1.5">
      <Face seed={hello.person} size={32} />
      <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium tracking-[-0.01em]">
        {title}
        {hello.kind === "wave" && (
          <span aria-hidden className="ms-1.5 inline-block origin-[70%_80%] motion-safe:animate-[wave_1.6s_ease-in-out_2]">
            👋
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={onAction}
        disabled={hello.done}
        className={cn(
          "ms-1 flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
          hello.done ? "bg-white/[0.08] text-white/70" : "bg-white text-black hover:bg-white/90",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={hello.done ? "done" : "wave"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING_SWAP}
            className="flex items-center gap-1.5"
          >
            {hello.done && <Check className="size-3.5" strokeWidth={2.4} />}
            {action}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

/** How a message reads in a few words: its text, or what it carries when it has none. */
function Preview({ message }: { message: ChatMessage }) {
  const t = useTranslations("shell");
  const voice = message.files?.find(isVoice);
  if (voice) {
    return (
      <span className="flex items-center gap-1.5 text-white/75">
        <Mic className="size-3.5 shrink-0" />
        {t("voiceMessage")}
        {voice.duration ? <span className="tabular-nums text-white/45">{clock(voice.duration)}</span> : null}
      </span>
    );
  }
  if (message.body) return <span data-ph-mask className="line-clamp-2 text-white/75">{message.body}</span>;
  const files = message.files ?? [];
  const pictures = files.filter(isPicture).length;
  return (
    <span className="flex items-center gap-1.5 text-white/75">
      <Paperclip className="size-3.5 shrink-0" />
      {pictures === files.length ? t("photos", { count: pictures }) : t("files", { count: files.length })}
    </span>
  );
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;

/**
 * A message: who, where and how it begins, and below it a reply box. Tapping
 * the card opens the conversation; the box answers it from the floor.
 */
function Message({
  note,
  replying,
  onOpen,
  onReply,
  onSent,
  onCancel,
}: {
  note: Note;
  replying: boolean;
  onOpen: () => void;
  onReply: () => void;
  onSent: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("shell");
  const [text, setText] = useState("");
  const where = isDm(note.channel) ? null : `#${note.channel}`;

  const send = () => {
    const body = text.trim();
    if (!body) return;
    chat.say(note.channel, body);
    setText("");
    onSent();
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    } else if (event.key === "Escape") {
      setText("");
      onCancel();
    }
  };

  return (
    <div className="w-[min(23rem,calc(100vw-1.5rem))] max-w-full p-1.5">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 rounded-[16px] p-2 text-start transition-colors hover:bg-white/[0.04]">
        <span className="relative mt-0.5 shrink-0">
          <Face seed={note.author} size={34} />
          {note.count > 1 && (
            <span className="absolute -bottom-1 -end-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10.5px] font-bold tabular-nums text-black shadow-[0_0_0_2px_#0c0c0d]">
              {note.count}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5 text-[13.5px]">
            <span className="truncate font-semibold tracking-[-0.01em]">{note.name}</span>
            {where && <span className="shrink-0 text-white/45">{where}</span>}
            {note.mentionsYou && (
              <span className="ms-auto shrink-0 rounded-full bg-[#ff6b35]/15 px-1.5 py-px text-[11px] font-semibold text-[#ff8a5c]">@</span>
            )}
          </span>
          <span className="mt-0.5 block text-[13px] leading-[1.45]">
            <Preview message={note.message} />
          </span>
        </span>
      </button>
      <div
        className={cn(
          "mx-1 mb-0.5 mt-1 flex h-9 items-center gap-1 rounded-full bg-white/[0.06] ps-3.5 pe-1 transition-colors focus-within:bg-white/[0.09]",
          !replying && "cursor-text",
        )}
        onClick={onReply}
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          onFocus={onReply}
          onBlur={() => !text && onCancel()}
          onKeyDown={keys}
          placeholder={t("replyTo", { name: note.name })}
          aria-label={t("replyTo", { name: note.name })}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/40"
        />
        <AnimatePresence initial={false}>
          {text.trim() && (
            <motion.button
              type="button"
              onClick={send}
              aria-label={t("send")}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={SPRING_SWAP}
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-black"
            >
              <ArrowUp className="size-3.5" strokeWidth={2.6} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
