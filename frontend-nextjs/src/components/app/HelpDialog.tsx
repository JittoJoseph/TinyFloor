"use client";

import { useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowUp } from "@/components/ui/icons";
import { Dialog } from "@/components/ui/Dialog";
import { api, ApiError, type Report } from "@/lib/api";
import { analyticsConfigured, withPostHog } from "@/lib/analytics";
import { help, useHelp } from "@/lib/help";
import { cn } from "@/lib/utils";
import { usePlace } from "./place";

const MAX = 4000;
/** What the API calls a report from the demo office (worker-api/src/reports.ts); said in your language here. */
const LOBBY_PLACE = "Demo office";

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
 * Help and feedback (docs/19): one roomy box to tell the TinyFloor team what
 * isn't working, or anything else. It goes to the team, never to the office,
 * and says so. Underneath, your own reports with the team's replies, until
 * one is closed; you can add to an open one. Opened from the rail, or from
 * your menu on a phone.
 */
export function HelpDialog() {
  const t = useTranslations("help");
  const tc = useTranslations("common");
  const place = usePlace();
  const locale = useLocale();
  const { open, data } = useHelp();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<"sent" | "error" | "slowDown" | null>(null);

  // Yours are read once you're in, and again when you come back to the tab, so a reply shows as a dot.
  useEffect(() => {
    void help.refresh(true);
    const back = () => document.visibilityState === "visible" && void help.refresh();
    document.addEventListener("visibilitychange", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      help.forget();
    };
  }, []);

  const send = async () => {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setSaid(null);
    try {
      help.take(
        await api.report({
          body: text,
          ...(place.kind === "office" ? { officeId: place.id } : {}),
          page: window.location.pathname,
          locale,
          screen: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
          replay: await replayLink(),
        }),
      );
      setBody("");
      setSaid("sent");
    } catch (error) {
      setSaid(error instanceof ApiError && error.status === 429 ? "slowDown" : "error");
    } finally {
      setBusy(false);
    }
  };

  const reports = data?.reports ?? [];

  return (
    <Dialog
      open={open}
      onClose={() => {
        help.close();
        setSaid(null);
      }}
      title={t("title")}
      description={t("body")}
      closeLabel={tc("close")}
      className="max-w-[31rem]"
    >
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
            if (said) setSaid(null);
          }}
          onKeyDown={(event) => {
            // A report is often more than a line, so Enter is a new line and Ctrl or ⌘ with it sends.
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void send();
            }
          }}
          className="block max-h-[16rem] min-h-[8.5rem] w-full resize-y rounded-2xl border border-border bg-background px-3.5 py-3 text-[16px] leading-[1.5] text-foreground outline-none transition-colors placeholder:text-faint focus:border-foreground/35 sm:text-[14px]"
        />
        <div className="mt-3 flex items-start justify-between gap-4">
          <p
            role={said ? "status" : undefined}
            className={cn("pt-0.5 text-[12px] leading-[1.45]", said === "sent" ? "text-ok" : said ? "text-destructive" : "text-muted-foreground")}
          >
            {said ? t(said) : t("context")}
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

      {reports.length > 0 && (
        <section className="mt-6 border-t border-border pt-5">
          <h3 className="text-[12.5px] font-medium text-muted-foreground">{t("yours")}</h3>
          <ol className="-me-2 mt-3 max-h-[min(22rem,38vh)] space-y-2.5 overflow-y-auto pe-2">
            {reports.map((report) => (
              <YourReport key={report.id} report={report} />
            ))}
          </ol>
        </section>
      )}
    </Dialog>
  );
}

/** One of yours: what you said, what the team said back, and a line to add more while it's open. */
function YourReport({ report }: { report: Report }) {
  const t = useTranslations("help");
  const ts = useTranslations("shell");
  const format = useFormatter();
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const add = async () => {
    const text = more.trim();
    if (!text || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      help.take(await api.addToReport(report.id, text));
      setMore("");
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={cn("rounded-2xl border p-3.5 transition-colors", report.news ? "border-brand/40 bg-brand/[0.05]" : "border-border")}>
      <p className="flex min-w-0 items-center gap-2 text-[11.5px] text-muted-foreground">
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-medium",
            report.status === "open" ? "bg-foreground/[0.07] text-foreground" : "bg-ok/15 text-ok",
          )}
        >
          {t(report.status)}
        </span>
        <span className="truncate">{report.place === LOBBY_PLACE ? ts("publicLobby") : report.place}</span>
        <span aria-hidden>·</span>
        <time dateTime={new Date(report.createdAt).toISOString()} className="shrink-0">
          {format.dateTime(report.createdAt, { month: "short", day: "numeric" })}
        </time>
      </p>
      <div className="mt-2.5 space-y-2">
        {report.messages.map((message) =>
          message.fromTeam ? (
            <div key={message.id} className="rounded-xl bg-muted px-3 py-2">
              <p className="text-[11.5px] font-semibold text-foreground">{t("team")}</p>
              <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.5] text-foreground/90">
                {message.body}
              </p>
            </div>
          ) : (
            <p key={message.id} dir="auto" className="line-clamp-6 whitespace-pre-wrap break-words px-0.5 text-[13.5px] leading-[1.5] text-foreground/90">
              {message.body}
            </p>
          ),
        )}
      </div>
      {report.status === "open" && (
        <form
          className="mt-3 flex h-9 items-center gap-1 rounded-full border border-border bg-background p-1 ps-3.5 transition-colors focus-within:border-foreground/35"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <label htmlFor={`more-${report.id}`} className="sr-only">
            {t("more")}
          </label>
          <input
            id={`more-${report.id}`}
            value={more}
            maxLength={MAX}
            dir="auto"
            autoComplete="off"
            placeholder={failed ? t("error") : t("more")}
            onChange={(event) => setMore(event.target.value)}
            className={cn("h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none sm:text-[13px]", failed ? "placeholder:text-destructive" : "placeholder:text-faint")}
          />
          <button
            type="submit"
            aria-label={t("send")}
            disabled={!more.trim() || busy}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ArrowUp className="size-3.5" />
          </button>
        </form>
      )}
    </li>
  );
}
