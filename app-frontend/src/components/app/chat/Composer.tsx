"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, FileText, ImagePlus, Loader2, Mic, Paperclip, Reply, Smile, Trash2, X } from "@/components/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { FILES_PER_MESSAGE, TYPING_EVERY_MS, isPicture, type ChatFile } from "@shared/chat";
import { Kbd } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/motion/tooltip";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { draftFor, keepDraft } from "@/lib/chatMemory";
import { FileProblem, prepare, sizeOf, type Prepared } from "@/lib/chatFiles";
import { typingMention, type Mentionable } from "@/lib/mentions";
import { RecorderFailure, VoiceRecorder, canRecord } from "@/lib/voiceRecorder";
import { SPRING_SWAP } from "@/lib/ease";

const FOCUS_EVENT = "tinyfloor:focus-composer";
const FILES_EVENT = "tinyfloor:composer-files";
const pointing = () => window.matchMedia("(pointer: fine)").matches;

/** Puts the cursor back in the open conversation's box: clicking the conversation you're already in. */
export function focusComposer() {
  window.dispatchEvent(new Event(FOCUS_EVENT));
}

/** Files dropped anywhere on the conversation go into its box, the same as picked or pasted ones. */
export function addToComposer(files: File[]) {
  window.dispatchEvent(new CustomEvent(FILES_EVENT, { detail: files }));
}

/** The box grows with what's in it, up to a point; only past that does it scroll. */
function grow(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  element.style.overflowY = element.scrollHeight > 200 ? "auto" : "hidden";
}

const EMOJI = ["😀", "😂", "🙂", "😍", "🤔", "😅", "👍", "👏", "🙌", "🙏", "🎉", "🔥", "❤️", "👀", "✅", "☕"];
/** A button in the box's toolbar. */
const tool =
  "flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

/** A voice message on its way: being started, recorded (how long, how loud lately), or sent. */
type Voice = { phase: "starting" | "recording" | "sending"; seconds: number; levels: number[] };
/** How many bars the moving waveform shows. */
const BARS = 240;

/** People the picker offers at once. */
const PICKS = 6;

/** A file on its way into a message: its own preview while it goes up, then what chat keeps. */
interface Pending {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  done?: ChatFile;
  failed?: FileProblem["code"];
  /** Calls the upload off if it's taken out before it's up. */
  stop: AbortController;
}

/**
 * Where you write: a box that grows with what you type, Enter to send and
 * Shift+Enter for a new line. It is made again for each conversation, and
 * takes the cursor when it is, so opening a channel or a person means you can
 * type straight away; clicking the one already open does the same. Not on a
 * touch screen, where that would throw the keyboard over the messages.
 *
 * What you'd started writing waits for you per conversation. Typing anywhere
 * on the page writes here, the way Slack does. Up, in an empty box, edits
 * your last message. On a phone, Enter is a new line and the button sends.
 *
 * Files come in by the paperclip, a paste or a drop, and start going up at
 * once, so sending is instant; sending while one is still going waits for it.
 * "@" offers the people here, and picking one writes their name.
 *
 * With nothing in the box, the send button is a microphone: pressing it
 * records a voice message in place of the box, with its waveform moving as
 * you speak; send it, or throw it away. It goes up like any file, carrying
 * its length and the shape of its waveform.
 */
export function Composer({
  placeholder,
  onSend,
  onFiles,
  upload,
  discard,
  people,
  note,
  maxLength = 4000,
  attach = true,
  draftKey,
  onEditLast,
  replying,
  onCancelReply,
  onTyping,
  typing,
  onVoiceBlocked,
}: {
  placeholder: string;
  onSend: (text: string, files: ChatFile[]) => void;
  /** Where files can't go (the lobby): the view says why, instead of taking them. */
  onFiles?: (files: File[]) => void;
  /** Sends a file up; without it, files go to `onFiles`. */
  upload?: (file: Prepared, progress: (fraction: number) => void, signal: AbortSignal) => Promise<ChatFile>;
  /** Throws away a file that went up but won't be sent. */
  discard?: (file: ChatFile) => void;
  /** Who "@" can mention. */
  people?: Mentionable[];
  /** Something the room said, like "slow down". */
  note?: string | null;
  maxLength?: number;
  /** The file and emoji buttons; a ticket to the team has words only. */
  attach?: boolean;
  /** Where an unsent draft is kept: the conversation it was written in. */
  draftKey?: string;
  /** Up in an empty box: edit your last message. */
  onEditLast?: () => void;
  /** Who you're answering, shown over the box until you send or let it go. */
  replying?: { name: string } | null;
  onCancelReply?: () => void;
  /** Whether the box has words in it, as that changes, so the others can see you're typing. */
  onTyping?: (on: boolean) => void;
  /** Who else is typing here, said under the box. */
  typing?: string | null;
  /** Where voice messages can't go (the lobby): the view says why. */
  onVoiceBlocked?: () => void;
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [body, setBodyState] = useState(() => (draftKey ? draftFor(draftKey) : ""));
  // Leaving the conversation with words still in the box: you've stopped typing here.
  const stopTyping = useRef(onTyping);
  useEffect(() => {
    stopTyping.current = onTyping;
  });
  useEffect(() => () => stopTyping.current?.(false), []);
  // While there are words in the box and you're in it, you're still typing, keys or not: say so
  // now and then. Away from the box, it fades on the others' screens by itself.
  const [inBox, setInBox] = useState(false);
  const drafting = inBox && !!body.trim() && !!onTyping;
  useEffect(() => {
    if (!drafting) return;
    const timer = setInterval(() => stopTyping.current?.(true), TYPING_EVERY_MS);
    return () => clearInterval(timer);
  }, [drafting]);
  const setBody = (next: string) => {
    setBodyState(next);
    if (draftKey) keepDraft(draftKey, next);
  };
  const emojiBox = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const photoPicker = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [mention, setMention] = useState<{ start: number; query: string; at: number } | null>(null);

  useEffect(() => {
    const focus = () => {
      const element = box.current;
      if (!pointing() || !element) return;
      element.focus({ preventScroll: true });
      // A draft waiting here: carry on at its end.
      element.setSelectionRange(element.value.length, element.value.length);
    };
    focus();
    if (box.current) grow(box.current);
    // A key pressed with nothing else to take it starts a message here.
    const typing = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
      const active = document.activeElement as HTMLElement | null;
      if (active?.closest("input, textarea, select, [contenteditable], [role=dialog], [role=listbox], [role=menu]")) return;
      if (document.querySelector("[aria-modal=true]")) return;
      focus();
    };
    window.addEventListener(FOCUS_EVENT, focus);
    window.addEventListener("keydown", typing);
    return () => {
      window.removeEventListener(FOCUS_EVENT, focus);
      window.removeEventListener("keydown", typing);
    };
  }, []);

  // The emoji grid goes away on a press elsewhere, or Escape.
  useEffect(() => {
    if (!emoji) return;
    const away = (event: PointerEvent) => !emojiBox.current?.contains(event.target as Node) && setEmoji(false);
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setEmoji(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", escape);
    };
  }, [emoji]);

  // Previews are the browser's own copies; they go with the box.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const made = previews.current;
    return () => made.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const add = (files: File[]) => {
    if (!files.length) return;
    if (!upload) return onFiles?.(files);
    setProblem(null);
    const room = FILES_PER_MESSAGE - pending.length;
    if (files.length > room) setProblem(t("filesMax", { count: FILES_PER_MESSAGE }));
    for (const file of files.slice(0, Math.max(0, room))) {
      const id = crypto.randomUUID();
      const preview = isPicture({ type: file.type }) ? URL.createObjectURL(file) : undefined;
      if (preview) previews.current.add(preview);
      const change = (patch: Partial<Pending>) => setPending((all) => all.map((one) => (one.id === id ? { ...one, ...patch } : one)));
      const stop = new AbortController();
      setPending((all) => [...all, { id, name: file.name || "file", size: file.size, type: file.type, preview, progress: 0, stop }]);
      void prepare(file)
        .then((ready) => upload(ready, (progress) => change({ progress }), stop.signal))
        .then((done) => {
          // Taken out while it went up: it isn't wanted.
          if (stop.signal.aborted) return discard?.(done);
          change({ done, progress: 1 });
        })
        .catch((error: unknown) => change({ failed: error instanceof FileProblem ? error.code : "failed" }));
    }
    box.current?.focus({ preventScroll: true });
  };

  // Taken out of the box: stopped if it's still going up, deleted if it's up.
  const drop = (one: Pending) => {
    one.stop.abort();
    if (one.done) discard?.(one.done);
  };
  const remove = (one: Pending) => {
    drop(one);
    setPending((all) => all.filter((other) => other.id !== one.id));
  };
  // Left in the box when the conversation changes or the page goes: the same.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });
  const dropRef = useRef(drop);
  useEffect(() => {
    dropRef.current = drop;
  });
  useEffect(() => () => pendingRef.current.forEach((one) => dropRef.current(one)), []);

  // Dropped on the conversation, outside the box.
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });
  useEffect(() => {
    const dropped = (event: Event) => addRef.current((event as CustomEvent<File[]>).detail);
    window.addEventListener(FILES_EVENT, dropped);
    return () => window.removeEventListener(FILES_EVENT, dropped);
  }, []);

  // A voice message: being recorded, with how long and how loud so far, then on its way.
  const [voice, setVoice] = useState<Voice | null>(null);
  const [lineHeight, setLineHeight] = useState(0);
  const recorder = useRef<VoiceRecorder | null>(null);
  const voiceProblem = (code: string) =>
    setProblem(code === "denied" ? t("voiceDenied") : code === "no_mic" ? t("voiceNoMic") : code === "unsupported" ? t("voiceUnsupported") : t("voiceFailed"));

  const sendVoice = async () => {
    const taking = recorder.current;
    if (!taking || !upload) return;
    recorder.current = null;
    setVoice((was) => was && { ...was, phase: "sending" });
    const take = await taking.stop();
    if (!take) return setVoice(null);
    try {
      const file = new File([take.blob], `${t("voiceMessage")}.${take.extension}`, { type: take.type });
      const done = await upload({ blob: file, name: file.name, type: take.type }, () => {}, new AbortController().signal);
      onSend("", [{ ...done, duration: take.duration, peaks: take.peaks }]);
    } catch {
      voiceProblem("failed");
    } finally {
      setVoice(null);
    }
  };
  const sendVoiceRef = useRef(sendVoice);
  useEffect(() => {
    sendVoiceRef.current = sendVoice;
  });

  const record = async () => {
    if (!upload) return onVoiceBlocked?.();
    if (voice) return;
    setProblem(null);
    setLineHeight(box.current?.offsetHeight ?? 0);
    setVoice({ phase: "starting", seconds: 0, levels: [] });
    const taking = new VoiceRecorder(
      (level, seconds) => setVoice((was) => (was && was.phase !== "sending" ? { phase: "recording", seconds, levels: [...was.levels.slice(-(BARS - 1)), level] } : was)),
      () => void sendVoiceRef.current(),
    );
    recorder.current = taking;
    try {
      await taking.start();
    } catch (error) {
      recorder.current = null;
      setVoice(null);
      voiceProblem(error instanceof RecorderFailure ? error.code : "failed");
    }
  };
  const discardVoice = () => {
    recorder.current?.cancel();
    recorder.current = null;
    setVoice(null);
    requestAnimationFrame(() => box.current?.focus({ preventScroll: true }));
  };
  const discardRef = useRef(discardVoice);
  useEffect(() => {
    discardRef.current = discardVoice;
  });
  const recordRef = useRef(record);
  useEffect(() => {
    recordRef.current = record;
  });
  const emptyRef = useRef(true);
  useEffect(() => {
    emptyRef.current = !body.trim() && !pending.length;
  });
  useEffect(() => {
    if (!attach || !canRecord()) return;
    const keys = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !event.shiftKey || !(event.metaKey || event.ctrlKey) || event.repeat) return;
      if (recorder.current) {
        event.preventDefault();
        void sendVoiceRef.current();
      } else if (emptyRef.current && !document.querySelector("[aria-modal=true]")) {
        event.preventDefault();
        void recordRef.current();
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [attach]);
  // Leaving the conversation mid-recording throws it away.
  useEffect(() => () => recorder.current?.cancel(), []);
  // While recording, Escape throws it away and Enter sends it.
  const phase = voice?.phase;
  useEffect(() => {
    if (!phase || phase === "sending") return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        discardRef.current();
      } else if (event.key === "Enter" && phase === "recording") {
        event.preventDefault();
        void sendVoiceRef.current();
      }
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [phase]);

  const uploading = pending.some((one) => !one.done && !one.failed);
  const ready = pending.filter((one) => one.done).map((one) => one.done!);
  const canSend = !!body.trim() || ready.length > 0;

  const send = () => {
    if (!canSend && !uploading) return;
    // Still going up: send the moment it's there.
    if (uploading) return setWaiting(true);
    const text = body.trim();
    if (!text && !ready.length) return;
    onSend(text, ready);
    setBody("");
    setPending([]);
    setProblem(null);
    setMention(null);
    if (box.current) {
      box.current.style.height = "auto";
      box.current.style.overflowY = "hidden";
    }
  };
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  const failedOne = pending.find((one) => one.failed);
  useEffect(() => {
    if (!waiting || uploading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaiting(false);
    // One didn't make it: nothing goes until you've seen why, and taken it out or tried again.
    if (!failedOne) sendRef.current();
  }, [waiting, uploading, failedOne]);

  const shownNote =
    note ??
    problem ??
    (failedOne ? (failedOne.failed === "too_big" ? t("fileTooBig") : failedOne.failed === "slow_down" ? t("fileSlowDown") : t("fileFailed")) : null);

  const insert = (value: string, from?: number) => {
    const element = box.current;
    const start = from ?? element?.selectionStart ?? body.length;
    const end = element?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + value + body.slice(end);
    setBody(next);
    setEmoji(false);
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      element.setSelectionRange(start + value.length, start + value.length);
      grow(element);
    });
  };

  // The people "@" is offering: first names first, then anywhere in the name.
  const needle = mention?.query.toLocaleLowerCase().trimStart() ?? "";
  const picks = mention
    ? (people ?? [])
        .filter((one) => one.displayName.toLocaleLowerCase().split(/\s+/).some((word) => word.startsWith(needle)) || one.displayName.toLocaleLowerCase().startsWith(needle))
        .slice(0, PICKS)
    : [];
  const picking = picks.length > 0;
  const pick = (person: Mentionable) => {
    if (!mention) return;
    insert(`@${person.displayName} `, mention.start);
    setMention(null);
  };
  const follow = (element: HTMLTextAreaElement) => {
    const found = people?.length ? typingMention(element.value, element.selectionStart ?? element.value.length) : null;
    setMention((was) => (found ? { ...found, at: was && was.start === found.start ? Math.min(was.at, PICKS - 1) : 0 } : null));
  };

  return (
    <div className="relative shrink-0 px-4 pb-4 sm:px-5">
      {shownNote && (
        <p role="status" className="mb-2 px-1 text-[12px] text-muted-foreground">
          {shownNote}
        </p>
      )}

      <div className="relative rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-border-strong">
        {/* 8 above the box, in the room the conversation keeps under its last message (Conversation's pb-7), so nothing moves when it comes and goes. */}
        {typing && (
          <p
            aria-live="polite"
            className="typing-in pointer-events-none absolute bottom-full start-4 mb-2 flex h-4 max-w-[calc(100%-2rem)] items-center gap-1.5 text-[12px] text-muted-foreground"
          >
            <span className="typing-dots shrink-0" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="truncate">{typing}</span>
          </p>
        )}
        {replying && (
          <div className="flex h-9 items-center gap-2 rounded-t-2xl border-b border-border bg-muted/60 ps-4 pe-1.5 text-[12.5px] text-muted-foreground">
            <Reply className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {t.rich("replyingTo", { name: replying.name, strong: (chunks) => <strong className="font-semibold text-foreground">{chunks}</strong> })}
            </span>
            <button
              type="button"
              aria-label={t("cancelReply")}
              onClick={onCancelReply}
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
        {picking && (
          <div
            role="listbox"
            aria-label={t("mentionSomeone")}
            className="absolute bottom-full start-0 z-30 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-float"
          >
            {picks.map((person, index) => (
              <button
                key={person.id}
                type="button"
                role="option"
                aria-selected={index === mention!.at}
                // Down on the button, so the box keeps its cursor.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(person);
                }}
                onMouseEnter={() => setMention((was) => (was ? { ...was, at: index } : was))}
                className={cn(
                  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 text-start text-[13.5px] text-foreground",
                  index === mention!.at && "bg-muted",
                )}
              >
                <Face seed={person.id} size={22} />
                <span className="min-w-0 flex-1 truncate">{person.displayName}</span>
              </button>
            ))}
          </div>
        )}

        {pending.length > 0 && (
          <ul className="flex flex-wrap gap-2 px-3 pt-3">
            {pending.map((one) => (
              <li key={one.id} className="group relative">
                {one.preview ? (
                  <span className="relative block size-16 overflow-hidden rounded-xl border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={one.preview} alt={one.name} className="size-full object-cover" />
                    <Progress item={one} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "relative flex h-16 w-56 items-center gap-2.5 overflow-hidden rounded-xl border bg-background px-2.5",
                      one.failed ? "border-destructive/50" : "border-border",
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">{one.name}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{sizeOf(one.size, locale)}</span>
                    </span>
                    <Progress item={one} />
                  </span>
                )}
                <button
                  type="button"
                  aria-label={t("removeFile", { name: one.name })}
                  onClick={() => remove(one)}
                  className="absolute -end-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {voice ? (
          <RecordingLine voice={voice} height={lineHeight} label={t("recording")} />
        ) : (
          <textarea
            ref={box}
            rows={1}
            dir="auto"
            value={body}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(event) => {
              setBody(event.target.value);
              onTyping?.(!!event.target.value.trim());
              grow(event.target);
              follow(event.target);
            }}
            onSelect={(event) => mention && follow(event.currentTarget)}
            onFocus={() => setInBox(true)}
            onBlur={() => {
              setMention(null);
              setInBox(false);
            }}
            onPaste={(event) => {
              const files = [...event.clipboardData.files];
              if (!files.length || !attach) return;
              event.preventDefault();
              add(files);
            }}
            onKeyDown={(event) => {
              if (picking) {
                const move = (step: number) => setMention((was) => (was ? { ...was, at: (was.at + step + picks.length) % picks.length } : was));
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  return move(event.key === "ArrowDown" ? 1 : -1);
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  event.preventDefault();
                  return pick(picks[mention!.at] ?? picks[0]);
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  return setMention(null);
                }
              }
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && pointing()) {
                event.preventDefault();
                send();
              } else if (event.key === "Escape" && replying && onCancelReply) {
                event.preventDefault();
                onCancelReply();
              } else if (event.key === "ArrowUp" && !body && !pending.length && onEditLast) {
                event.preventDefault();
                onEditLast();
              }
            }}
            className="block max-h-[200px] w-full resize-none overflow-y-hidden bg-transparent px-4 pb-1 pt-3 text-[16px] leading-[1.45] text-foreground outline-none placeholder:text-faint md:text-[14px]"
          />
        )}

        {/* What goes in the message on the left (emoji, a picture, a file), sending on the right; while recording, deleting it on the left. */}
        <div className="flex items-center gap-0.5 px-2 pb-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {voice ? (
              <motion.span key="recording" {...SWAP} className="flex">
                <Tooltip content={t("cancelRecording")}>
                  <button
                    type="button"
                    onClick={discardVoice}
                    disabled={voice.phase === "sending"}
                    aria-label={t("cancelRecording")}
                    className={cn(tool, "hover:bg-destructive/10 hover:text-destructive disabled:opacity-40")}
                  >
                    <Trash2 className="size-[18px]" />
                  </button>
                </Tooltip>
              </motion.span>
            ) : (
              attach && (
                <motion.span key="tools" {...SWAP} className="flex items-center gap-0.5">

              <span ref={emojiBox} className="relative">
                <Tooltip content={t("emoji")}>
                  <button
                    type="button"
                    aria-label={t("emoji")}
                    aria-expanded={emoji}
                    onClick={() => setEmoji((was) => !was)}
                    className={cn(tool, emoji && "bg-muted text-foreground")}
                  >
                    <Smile className="size-[18px]" />
                  </button>
                </Tooltip>
                {emoji && (
                  <span className="absolute bottom-10 start-0 z-20 grid w-[232px] grid-cols-8 gap-0.5 rounded-xl border border-border bg-popover p-1.5 shadow-float">
                    {EMOJI.map((one) => (
                      <button
                        key={one}
                        type="button"
                        onClick={() => insert(one)}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-[16px] hover:bg-muted"
                      >
                        {one}
                      </button>
                    ))}
                  </span>
                )}
              </span>
              <Tooltip content={t("photo")}>
                <button type="button" aria-label={t("photo")} onClick={() => photoPicker.current?.click()} className={tool}>
                  <ImagePlus className="size-[18px]" />
                </button>
              </Tooltip>
              <Tooltip content={t("file")}>
                <button type="button" aria-label={t("file")} onClick={() => picker.current?.click()} className={tool}>
                  <Paperclip className="size-[18px]" />
                </button>
              </Tooltip>
              <input
                ref={picker}
                type="file"
                multiple
                hidden
                onChange={(event) => {
                  add([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
              {/* Pictures only: on a phone this offers the camera and the gallery first. */}
              <input
                ref={photoPicker}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  add([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
                </motion.span>
              )
            )}
          </AnimatePresence>

          <span className="me-1 ms-auto hidden items-center gap-1 text-[11px] text-faint md:flex">
            {voice ? (
              <>
                <Kbd>↵</Kbd>
                <span className="ms-0.5 me-1.5">{t("voiceSendHint")}</span>
                <Kbd>Esc</Kbd>
                <span className="ms-0.5">{t("voiceDeleteHint")}</span>
              </>
            ) : (
              <>
                <Kbd>⇧</Kbd>
                <Kbd>↵</Kbd>
                <span className="ms-0.5">{t("newLine")}</span>
              </>
            )}
          </span>
          {/* One button in the corner: send, or with nothing to send, record; while recording, send that. */}
          {(() => {
            const recordable = attach && !canSend && !uploading && canRecord();
            const mode = voice ? "voice" : recordable ? "record" : "send";
            const button = (
              <button
                type="button"
                onClick={mode === "voice" ? () => void sendVoice() : mode === "record" ? () => void record() : send}
                disabled={mode === "voice" ? voice?.phase !== "recording" : mode === "send" && ((!canSend && !uploading) || waiting)}
                aria-label={mode === "voice" ? t("sendVoice") : mode === "record" ? t("recordVoice") : t("send")}
                className={cn(
                  "ms-1 flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors max-md:ms-auto disabled:cursor-default",
                  mode === "record"
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : mode === "voice" || canSend || uploading
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-muted text-faint",
                )}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={mode === "record" ? "mic" : waiting || voice?.phase === "sending" ? "wait" : "send"} {...SWAP} className="flex">
                    {mode === "record" ? (
                      <Mic className="size-[18px]" />
                    ) : waiting || voice?.phase === "sending" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ArrowUp className="size-4" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
            );
            return mode === "record" ? (
              <Tooltip content={<RecordTip label={t("recordVoice")} />}>{button}</Tooltip>
            ) : (
              button
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/** How far a file has gone up: a thin bar along its foot, gone once it's there. */
function Progress({ item }: { item: Pending }) {
  if (item.done) return null;
  if (item.failed) return <span className="absolute inset-0 bg-destructive/10" aria-hidden />;
  return (
    <span className="absolute inset-x-0 bottom-0 h-1 bg-foreground/10" aria-hidden>
      <span className="block h-full bg-foreground/70 transition-[width] duration-200" style={{ width: `${Math.max(item.progress * 100, 6)}%` }} />
    </span>
  );
}

/** Icons and controls trading places in the box: quick, and never a jump. */
const SWAP = {
  initial: { opacity: 0, scale: 0.85, filter: "blur(2px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.85, filter: "blur(2px)" },
  transition: SPRING_SWAP,
} as const;

/** Whether this is a Mac, for the shortcut's keys: read on hover, so the server never guesses. */
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The microphone's tooltip: what it does, and the keys that do it from anywhere in the box. */
function RecordTip({ label }: { label: string }) {
  const key = "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] bg-white/[0.14] px-1 font-sans text-[10.5px] font-medium";
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      {label}
      <span className="flex items-center gap-0.5">
        <kbd className={key}>{isMac() ? "⌘" : "Ctrl"}</kbd>
        <kbd className={key}>⇧</kbd>
        <kbd className={key}>Space</kbd>
      </span>
    </span>
  );
}

/**
 * A voice message being recorded, in the place of the line you type on and
 * at its height: the red dot and how long, then the waveform coming in from
 * the right as you speak, quiet staying a dot. The box keeps its shape.
 */
function RecordingLine({ voice, height, label }: { voice: Voice; height: number; label: string }) {
  const shown = [...Array<number>(Math.max(0, BARS - voice.levels.length)).fill(0), ...voice.levels.slice(-BARS)];
  const minutes = Math.floor(voice.seconds / 60);
  const seconds = String(Math.floor(voice.seconds % 60)).padStart(2, "0");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-3 px-4 pb-1 pt-3"
      style={{ height: height || undefined }}
    >
      <span role="status" aria-label={label} className="flex shrink-0 items-center gap-2 text-[13.5px] font-medium tabular-nums text-foreground">
        <span className="relative flex size-2.5">
          {voice.phase === "recording" && <span className="absolute inset-0 rounded-full bg-destructive/50 motion-safe:animate-ping" />}
          <span className="relative size-2.5 rounded-full bg-destructive" />
        </span>
        {minutes}:{seconds}
      </span>
      <span aria-hidden className="flex h-full min-w-0 flex-1 items-center justify-end gap-[2px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_24%)]">
        {shown.map((level, index) => (
          <span
            key={index}
            className={cn("w-[2.5px] shrink-0 rounded-full transition-[height] duration-100", level ? "bg-foreground/75" : "bg-foreground/20")}
            style={{ height: `${Math.max(2.5, Math.round(level * 22))}px` }}
          />
        ))}
      </span>
    </motion.div>
  );
}
