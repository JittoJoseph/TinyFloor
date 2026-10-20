"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, FileText, Loader2, Paperclip, Smile, X } from "@/components/ui/icons";
import { FILES_PER_MESSAGE, isPicture, type ChatFile } from "@shared/chat";
import { Kbd } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/motion/tooltip";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { draftFor, keepDraft } from "@/lib/chatMemory";
import { FileProblem, prepare, sizeOf, type Prepared } from "@/lib/chatFiles";
import { typingMention, type Mentionable } from "@/lib/mentions";

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
 */
export function Composer({
  placeholder,
  onSend,
  onFiles,
  upload,
  people,
  note,
  maxLength = 4000,
  attach = true,
  draftKey,
  onEditLast,
}: {
  placeholder: string;
  onSend: (text: string, files: ChatFile[]) => void;
  /** Where files can't go (the lobby): the view says why, instead of taking them. */
  onFiles?: (files: File[]) => void;
  /** Sends a file up; without it, files go to `onFiles`. */
  upload?: (file: Prepared, progress: (fraction: number) => void) => Promise<ChatFile>;
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
}) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const [body, setBodyState] = useState(() => (draftKey ? draftFor(draftKey) : ""));
  const setBody = (next: string) => {
    setBodyState(next);
    if (draftKey) keepDraft(draftKey, next);
  };
  const emojiBox = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLInputElement>(null);
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
      setPending((all) => [...all, { id, name: file.name || "file", size: file.size, type: file.type, preview, progress: 0 }]);
      void prepare(file)
        .then((ready) => upload(ready, (progress) => change({ progress })))
        .then((done) => change({ done, progress: 1 }))
        .catch((error: unknown) => change({ failed: error instanceof FileProblem ? error.code : "failed" }));
    }
    box.current?.focus({ preventScroll: true });
  };

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
  useEffect(() => {
    if (!waiting || uploading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWaiting(false);
    sendRef.current();
  }, [waiting, uploading]);

  const failedOne = pending.find((one) => one.failed);
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
    <div className="shrink-0 px-4 pb-4 sm:px-5">
      {shownNote && (
        <p role="status" className="mb-2 px-1 text-[12px] text-muted-foreground">
          {shownNote}
        </p>
      )}

      <div className="relative rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-border-strong">
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
                  onClick={() => setPending((all) => all.filter((other) => other.id !== one.id))}
                  className="absolute -end-1.5 -top-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-foreground text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <textarea
          ref={box}
          rows={1}
          dir="auto"
          value={body}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => {
            setBody(event.target.value);
            grow(event.target);
            follow(event.target);
          }}
          onSelect={(event) => mention && follow(event.currentTarget)}
          onBlur={() => setMention(null)}
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
            } else if (event.key === "ArrowUp" && !body && !pending.length && onEditLast) {
              event.preventDefault();
              onEditLast();
            }
          }}
          className="block max-h-[200px] w-full resize-none overflow-y-hidden bg-transparent px-4 pb-1 pt-3 text-[16px] leading-[1.45] text-foreground outline-none placeholder:text-faint md:text-[14px]"
        />

        <div className="flex items-center gap-0.5 px-2 pb-2">
          {attach && (
            <>
              <Tooltip content={t("attach")}>
                <button
                  type="button"
                  aria-label={t("attach")}
                  onClick={() => picker.current?.click()}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
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
              <span ref={emojiBox} className="relative">
                <Tooltip content={t("emoji")}>
                  <button
                    type="button"
                    aria-label={t("emoji")}
                    aria-expanded={emoji}
                    onClick={() => setEmoji((was) => !was)}
                    className={cn(
                      "flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      emoji && "bg-muted text-foreground",
                    )}
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
            </>
          )}

          <span className="me-2 ms-auto hidden items-center gap-1 text-[11px] text-faint md:flex">
            <Kbd>⇧</Kbd>
            <Kbd>↵</Kbd>
            <span className="ms-0.5">{t("newLine")}</span>
          </span>
          <button
            type="button"
            onClick={send}
            disabled={(!canSend && !uploading) || waiting}
            aria-label={t("send")}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors max-md:ms-auto",
              canSend || uploading ? "bg-foreground text-background hover:bg-foreground/90" : "bg-muted text-faint",
            )}
          >
            {waiting ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
          </button>
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
