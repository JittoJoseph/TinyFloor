"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "web-shared/lib/api";
import { useGoogleCode } from "web-shared/components/auth/GoogleButton";
import { Loader2 } from "web-shared/components/ui/icons";
import { cn } from "web-shared/lib/utils";
import { CALENDAR_CLIENT_ID, CALENDAR_SCOPE, connectCalendar } from "@/lib/calendar";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { GoogleCalendarIcon } from "./GoogleCalendarIcon";

/** Connecting through Google's popup with calendar's own client, its errors said plainly. */
export function useConnect() {
  const t = useTranslations("calendar");
  const explain = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { ready, request } = useGoogleCode({
    clientId: CALENDAR_CLIENT_ID,
    scope: CALENDAR_SCOPE,
    onCode: async (code) => {
      setBusy(true);
      setError("");
      try {
        await connectCalendar(code);
      } catch (problem) {
        const kind = problem instanceof ApiError ? problem.code : "";
        setError(kind === "calendar_not_allowed" ? t("notAllowed") : kind === "calendar_again" ? t("again") : explain(problem));
      } finally {
        setBusy(false);
      }
    },
    onError: () => setError(explain(new ApiError(0, "google_failed", ""))),
  });
  return { ready, busy, error, request };
}

/** Connect: a small pill at the end of a row, or the full "Connect Google Calendar" on its own. */
export function ConnectButton({ connect, size = "sm", label }: { connect: ReturnType<typeof useConnect>; size?: "sm" | "lg"; label?: string }) {
  const t = useTranslations("calendar");
  return (
    <button
      type="button"
      onClick={connect.request}
      disabled={!connect.ready || connect.busy}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-foreground font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-50",
        size === "sm" ? "h-7 px-3 text-[12px]" : "h-9 px-4 text-[13px]",
      )}
    >
      {connect.busy && <Loader2 className="size-3.5 animate-spin" />}
      {label ?? (size === "sm" ? t("connectShort") : t("connect"))}
    </button>
  );
}

/**
 * Google Calendar, not connected yet, as a row of the Calendars list: its icon
 * in the column the others have a face in, Connect where they have a tick.
 */
export function ConnectRow({ className }: { className?: string }) {
  const t = useTranslations("calendar");
  const connect = useConnect();
  return (
    <div className={className}>
      <div className="flex items-center gap-2.5 px-1 py-1.5">
        <GoogleCalendarIcon size={24} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-foreground">{t("google")}</span>
          <span className="block truncate text-[11.5px] text-muted-foreground">{t("notLinked")}</span>
        </span>
        <ConnectButton connect={connect} />
      </div>
      {connect.error && <p className="pb-1 pe-1 ps-[2.375rem] text-[12px] leading-snug text-destructive">{connect.error}</p>}
    </div>
  );
}

/** The empty week's middle, before your calendar is connected: the icon, a line, and the way in. */
export function ConnectCard() {
  const t = useTranslations("calendar");
  const connect = useConnect();
  return (
    <div className="pointer-events-auto flex w-72 flex-col items-center rounded-2xl border border-border bg-card px-6 pb-6 pt-7 text-center shadow-[var(--ui-shadow)]">
      <GoogleCalendarIcon size={44} />
      <p className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">{t("emptyTitle")}</p>
      <p className="mt-1 text-[12.5px] text-muted-foreground">{t("readOnly")}</p>
      <div className="mt-5">
        <ConnectButton size="lg" connect={connect} />
      </div>
      {connect.error && <p className="mt-3 text-[12px] leading-snug text-destructive">{connect.error}</p>}
    </div>
  );
}
