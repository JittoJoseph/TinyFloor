"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ImagePlus, Smile } from "@/components/ui/icons";
import { Kbd } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/motion/tooltip";
import { cn } from "@/lib/utils";

const FOCUS_EVENT = "tinyfloor:focus-composer";
const pointing = () => window.matchMedia("(pointer: fine)").matches;

/** Puts the cursor back in the open conversation's box: clicking the conversation you're already in. */
export function focusComposer() {
  window.dispatchEvent(new Event(FOCUS_EVENT));
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
 */
export function Composer({
  placeholder,
  onSend,
  onFiles,
  note,
  maxLength = 4000,
  attach = true,
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
}) {
  const t = useTranslations("chat");
  const [body, setBody] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const [emoji, setEmoji] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const focus = () => pointing() && box.current?.focus({ preventScroll: true });
    focus();
    window.addEventListener(FOCUS_EVENT, focus);
    return () => window.removeEventListener(FOCUS_EVENT, focus);
  }, []);

  const grow = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 200)}px`;
  };

  const send = () => {
    const text = body.trim();
    if (!text) return;
    onSend(text);
    setBody("");
    if (box.current) box.current.style.height = "auto";
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
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          className="block max-h-[200px] w-full resize-none bg-transparent px-4 pb-1 pt-3 text-[16px] md:text-[14px] leading-[1.45] text-foreground outline-none placeholder:text-faint"
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
          <span className="relative">
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
