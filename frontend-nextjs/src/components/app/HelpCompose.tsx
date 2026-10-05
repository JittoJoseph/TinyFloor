"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { ApiError } from "@/lib/api";
import { help, ticketChannel, useHelp } from "@/lib/help";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { usePlace } from "./place";

/** What opens the box: pressing it again closes it, rather than counting as a click outside. */
export const HELP_TRIGGER = "data-help-trigger";
const BACKGROUND_EVERY_MS = 120_000;

/**
 * Help and feedback's way in (docs/19): a small card beside the rail's "?"
 * (above the bar, on a phone), with no backdrop and nothing to wait for. One
 * box to say what's wrong; sending it opens the new ticket in Chat, where
 * the team answers. Also keeps the place's tickets fresh in the background,
 * for the count on Chat.
 */
export function HelpCompose() {
  const t = useTranslations("help");
  const tc = useTranslations("common");
  const router = useRouter();
  const place = usePlace();
  const reduce = useReducedMotion();
  const { composing } = useHelp();
  const card = useRef<HTMLDivElement>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<"error" | "slowDown" | null>(null);
  const office = place.kind === "office" ? place.id : undefined;

  useEffect(() => help.attach(office), [office]);

  // Now and then, and on coming back to the tab, only while it's in view.
  useEffect(() => {
    const look = () => document.visibilityState === "visible" && void help.refresh();
    const timer = setInterval(look, BACKGROUND_EVERY_MS);
    document.addEventListener("visibilitychange", look);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", look);
    };
  }, []);

  // Escape, or a press anywhere else, puts it away; what was typed stays for next time.
  useEffect(() => {
    if (!composing) return;
    const away = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!card.current?.contains(target) && !target.closest?.(`[${HELP_TRIGGER}]`)) help.compose(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && help.compose(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [composing]);

  const send = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(null);
    try {
      const id = await help.raise(text);
      setBody("");
      help.compose(false);
      router.push(place.paths.chat(ticketChannel(id)));
    } catch (error) {
      setFailed(error instanceof ApiError && error.status === 429 ? "slowDown" : "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {composing && (
        <motion.div
          ref={card}
          role="dialog"
          aria-label={t("title")}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.08 } }}
          transition={{ duration: 0.14, ease: EASE_OUT }}
          className={cn(
            "fixed z-[80] rounded-2xl border border-border bg-popover p-3.5 text-foreground shadow-float",
            "inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] md:inset-x-auto md:bottom-3 md:start-[80px] md:w-[22rem]",
          )}
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-semibold tracking-tight">{t("title")}</h2>
              <p className="mt-0.5 text-[12.5px] leading-[1.45] text-muted-foreground">
                {office ? t("officeSees", { office: place.name }) : t("lobbySees")}
              </p>
            </div>
            <button
              type="button"
              aria-label={tc("close")}
              onClick={() => help.compose(false)}
              className="-me-1 -mt-1 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="help-body" className="sr-only">
              {t("title")}
            </label>
            <textarea
              id="help-body"
              autoFocus
              rows={4}
              value={body}
              maxLength={4000}
              dir="auto"
              placeholder={t("placeholder")}
              onChange={(event) => {
                setBody(event.target.value);
                setFailed(null);
              }}
              onKeyDown={(event) => {
                // Often more than a line, so Enter is a new line and Ctrl or ⌘ with it sends.
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void send();
                }
              }}
              className="block max-h-56 min-h-[6.5rem] w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-[16px] leading-[1.5] outline-none transition-colors placeholder:text-faint focus:border-foreground/35 md:text-[13.5px]"
            />
            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p role={failed ? "status" : undefined} className={cn("text-[11.5px] leading-[1.4]", failed ? "text-destructive" : "text-faint")}>
                {failed ? t(failed) : t("context")}
              </p>
              <button
                type="submit"
                disabled={!body.trim() || busy}
                className="h-8 shrink-0 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? t("sending") : t("send")}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
