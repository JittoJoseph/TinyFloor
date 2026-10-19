"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ImagePlus, Smile } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/motion/tooltip";
import { cn } from "@/lib/utils";
import { draftFor, keepDraft } from "@/lib/chatMemory";

const FOCUS_EVENT = "tinyfloor:focus-composer";
const pointing = () => window.matchMedia("(pointer: fine)").matches;

/** Puts the cursor back in the open conversation's box: clicking the conversation you're already in. */
export function focusComposer() {
  window.dispatchEvent(new Event(FOCUS_EVENT));
}

/** The box grows with what's in it, up to a point; only past that does it scroll. */
function grow(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  element.style.overflowY = element.scrollHeight > 200 ? "auto" : "hidden";
}

const EMOJI = ["😀", "😂", "🙂", "😍", "🤔", "😅", "👍", "👏", "🙌", "🙏", "🎉", "🔥", "❤️", "👀", "✅", "☕"];

/**
 * Where you write: a box that grows with what you type, Enter to send and
 * Shift+Enter for a new line. The image button is always there, so the shape
 * of the product is plain; where images are not included it says why.
 * It is made again for each conversation, and takes the cursor when it is,
 * so opening a channel or a person means you can type straight away; clicking
 * the one already open does the same. Not on a touch screen, where that would
 * throw the keyboard over the messages.
 *
 * What you'd started writing waits for you per conversation. Typing anywhere
 * on the page writes here, the way Slack does. Up, in an empty box, edits
 * your last message. On a phone, Enter is a new line and the button sends.
 */
export function Composer({
  placeholder,
  onSend,
  onFiles,
  note,
  maxLength = 4000,
  attach = true,
  draftKey,
  onEditLast,
}: {
  placeholder: string;
  onSend: (text: string) => void;
  /** Images picked with the button; the view decides what can happen to them. */
  onFiles?: (files: File[]) => void;
  /** Something the room said, like "slow down". */
  note?: string | null;
  maxLength?: number;
  /** The image and emoji buttons; a ticket to the team has words only. */
  attach?: boolean;
  /** Where an unsent draft is kept: the conversation it was written in. */
  draftKey?: string;
  /** Up in an empty box: edit your last message. */
  onEditLast?: () => void;
}) {
  const t = useTranslations("chat");
  const [body, setBodyState] = useState(() => (draftKey ? draftFor(draftKey) : ""));
  const setBody = (next: string) => {
    setBodyState(next);
    if (draftKey) keepDraft(draftKey, next);
  };
  const emojiBox = useRef<HTMLSpanElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

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

  const send = () => {
    const text = body.trim();
    if (!text) return;
    onSend(text);
    setBody("");
    if (box.current) {
      box.current.style.height = "auto";
      box.current.style.overflowY = "hidden";
    }
  };

  const insert = (value: string) => {
    const element = box.current;
    const start = element?.selectionStart ?? body.length;
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

  const shown = note;

  return (
    <div className="shrink-0 px-4 pb-4 sm:px-5">
      {shown && (
        <p role="status" className="mb-2 px-1 text-[12px] text-muted-foreground">
          {shown}
        </p>
      )}

      <div className="relative rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors focus-within:border-border-strong">
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
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && pointing()) {
              event.preventDefault();
              send();
            } else if (event.key === "ArrowUp" && !body && onEditLast) {
              event.preventDefault();
              onEditLast();
            }
          }}
          className="block max-h-[200px] w-full resize-none overflow-y-hidden bg-transparent px-4 pb-1 pt-3 text-[16px] md:text-[14px] leading-[1.45] text-foreground outline-none placeholder:text-faint"
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
              <ImagePlus className="size-[18px]" />
            </button>
          </Tooltip>
          <input
            ref={picker}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              onFiles?.([...(event.target.files ?? [])]);
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

          <span className="ms-auto me-2 hidden items-center gap-1 text-[11px] text-faint md:flex">
            <Kbd>⇧</Kbd>
            <Kbd>↵</Kbd>
            <span className="ms-0.5">{t("newLine")}</span>
          </span>
          <button
            type="button"
            onClick={send}
            disabled={!body.trim()}
            aria-label={t("send")}
            className={cn(
              "flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors max-md:ms-auto",
              body.trim() ? "bg-foreground text-background hover:bg-foreground/90" : "bg-muted text-faint",
            )}
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
