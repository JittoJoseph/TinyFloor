"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowUp } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError, type HelpMessage } from "@/lib/api";
import { analyticsConfigured, withPostHog } from "@/lib/analytics";
import { help, useHelp } from "@/lib/help";
import { cn } from "@/lib/utils";
import { usePlace } from "./place";

const MAX = 4000;
/** How often the conversation is read while it's open, so the team's answers turn up. */
const OPEN_EVERY_MS = 6_000;
/** And while it's closed, for the count on the rail. */
const CLOSED_EVERY_MS = 120_000;

/** This moment in PostHog's recording, if it's recording, so the team can watch what happened. */
function replayLink(): Promise<string | null> {
  if (!analyticsConfigured) return Promise.resolve(null);
  return new Promise((resolve) => {
    const late = setTimeout(() => resolve(null), 1000);
    withPostHog((posthog) => {
      clearTimeout(late);
      try {
        resolve(posthog.get_session_replay_url({ withTimestamp: true, timestampLookBack: 60 }) || null);
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Help and feedback (docs/19). Until anything is said, one roomy box to tell
 * the TinyFloor team what isn't working. After that it's a conversation: the
 * team answers in it, and in an office everyone there can read and add to it.
 * It says plainly who sees it. Opened from the rail, or your menu on a phone.
 */
export function HelpDialog() {
  const t = useTranslations("help");
  const tc = useTranslations("common");
  const place = usePlace();
  const locale = useLocale();
  const { open, conversation } = useHelp();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<"error" | "slowDown" | null>(null);
  const office = place.kind === "office" ? place.id : undefined;
  const messages = conversation?.messages ?? [];
  const started = messages.length > 0;

  useEffect(() => help.attach(office), [office]);

  // Read often while it's open and now and then while it isn't, only while the tab is in view.
  useEffect(() => {
    const look = (force: boolean) => document.visibilityState === "visible" && void help.refresh(force);
    const timer = setInterval(() => look(open), open ? OPEN_EVERY_MS : CLOSED_EVERY_MS);
    const back = () => look(false);
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  }, [open]);

  const send = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(null);
    try {
      await help.say(text, {
        page: window.location.pathname,
        locale,
        screen: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
        replay: await replayLink(),
      });
      setBody("");
    } catch (error) {
      setFailed(error instanceof ApiError && error.status === 429 ? "slowDown" : "error");
    } finally {
      setBusy(false);
    }
  };

  const sees = office ? t("officeSees", { office: place.name }) : t("lobbySees");

  return (
    <Dialog
      open={open}
      onClose={() => {
        help.close();
        setFailed(null);
      }}
      title={t("title")}
      description={started ? sees : t("intro")}
      closeLabel={tc("close")}
      className="max-w-[31rem]"
    >
      {started ? (
        <>
          <Thread messages={messages} />
          <form
            className="mt-3 flex items-end gap-2 rounded-2xl border border-border bg-background p-1.5 ps-3.5 transition-colors focus-within:border-foreground/35"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <label htmlFor="help-body" className="sr-only">
              {t("message")}
            </label>
            <textarea
              id="help-body"
              autoFocus
              rows={1}
              value={body}
              maxLength={MAX}
              dir="auto"
              placeholder={t("message")}
              onChange={(event) => {
                setBody(event.target.value);
                setFailed(null);
                event.target.style.height = "auto";
                event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  const area = event.currentTarget;
                  void send().then(() => {
                    area.style.height = "auto";
                  });
                }
              }}
              className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[16px] leading-[1.45] text-foreground outline-none placeholder:text-faint sm:text-[14px]"
            />
            <button
              type="submit"
              aria-label={t("send")}
              disabled={!body.trim() || busy}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-foreground text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
          </form>
          {failed && (
            <p role="status" className="mt-2 text-[12px] text-destructive">
              {t(failed)}
            </p>
          )}
        </>
      ) : (
        <form
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
            value={body}
            rows={5}
            maxLength={MAX}
            dir="auto"
            placeholder={t("placeholder")}
            onChange={(event) => {
              setBody(event.target.value);
              setFailed(null);
            }}
            onKeyDown={(event) => {
              // A first message is often more than a line, so Enter is a new line and Ctrl or ⌘ with it sends.
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
            className="block max-h-[16rem] min-h-[8.5rem] w-full resize-y rounded-2xl border border-border bg-background px-3.5 py-3 text-[16px] leading-[1.5] text-foreground outline-none transition-colors placeholder:text-faint focus:border-foreground/35 sm:text-[14px]"
          />
          <div className="mt-3 flex items-start justify-between gap-4">
            <p role={failed ? "status" : undefined} className={cn("pt-0.5 text-[12px] leading-[1.45]", failed ? "text-destructive" : "text-muted-foreground")}>
              {failed ? t(failed) : `${sees} ${t("context")}`}
            </p>
            <button
              type="submit"
              disabled={!body.trim() || busy}
              className="h-9 shrink-0 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? t("sending") : t("send")}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/**
 * The conversation, newest at the bottom and kept in view as messages
 * arrive. Yours sit on the right; the team's say who they are, and in an
 * office so do your teammates'.
 */
function Thread({ messages }: { messages: HelpMessage[] }) {
  const t = useTranslations("help");
  const format = useFormatter();
  const box = useRef<HTMLOListElement>(null);
  const last = messages.at(-1)?.id;

  useLayoutEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [last]);

  return (
    <ol ref={box} className="-me-2 max-h-[min(24rem,48vh)] space-y-1 overflow-y-auto pe-2">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const sameAuthor = previous && previous.team === message.team && previous.mine === message.mine && previous.name === message.name;
        return (
          <li key={message.id} className={cn("flex flex-col", message.mine ? "items-end" : "items-start", !sameAuthor && index > 0 && "pt-2.5")}>
            {!sameAuthor && (
              <p className="mb-1 px-1 text-[11.5px] text-muted-foreground">
                <span className={cn("font-semibold", message.team ? "text-brand" : "text-foreground")}>
                  {message.mine ? t("you") : message.team ? t("team") : message.name}
                </span>
                {" · "}
                <time dateTime={new Date(message.at).toISOString()}>
                  {format.dateTime(message.at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </time>
              </p>
            )}
            <p
              dir="auto"
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13.5px] leading-[1.5]",
                message.mine ? "bg-foreground text-background" : message.team ? "bg-brand/[0.1] text-foreground" : "bg-muted text-foreground",
              )}
            >
              {message.body}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
