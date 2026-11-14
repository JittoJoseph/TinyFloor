"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "web-shared/lib/api";
import { GoogleButton, googleAvailable } from "web-shared/components/auth/GoogleButton";
import { Button } from "@/components/motion/button/base";
import { Switch } from "@/components/motion/switch";
import { Loader } from "@/components/motion/loader";
import { connectCalendar, disconnectCalendar, readCalendar, showCalendarTitles, useCalendar } from "@/lib/calendar";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { Group, Row } from "./SettingsView";

/** What connecting asks Google for: who you are (to show which account), and your calendar's events, read-only. */
const SCOPE = "openid email https://www.googleapis.com/auth/calendar.events.readonly";

/**
 * Your Google Calendar: connected, your office sees when you're in a meeting
 * and until when, and the Meetings page lists your day. Titles stay yours
 * unless you turn them on; private events never show one.
 */
export function CalendarSettings() {
  const t = useTranslations("settings.calendar");
  const explain = useErrorMessage();
  const { status, info } = useCalendar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => void readCalendar(), []);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (problem) {
      const code = problem instanceof ApiError ? problem.code : "";
      setError(code === "calendar_not_allowed" ? t("notAllowed") : code === "calendar_again" ? t("again") : explain(problem));
    } finally {
      setBusy(false);
    }
  };

  if (!googleAvailable && status !== "on") {
    return (
      <Group>
        <Row title={t("google")} description={t("unavailable")} control={null} />
      </Group>
    );
  }

  return (
    <>
      <Group note={t("privacy")}>
        <Row
          title={t("google")}
          description={status === "on" ? (info?.email ?? t("connected")) : t("connectNote")}
          control={
            status === "unknown" ? (
              <Loader variant="dots" size={16} />
            ) : status === "on" ? (
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(disconnectCalendar)} className="h-8 px-4 text-[13px]">
                {t("disconnect")}
              </Button>
            ) : (
              <div className="w-44">
                <GoogleButton
                  label={t("connect")}
                  scope={SCOPE}
                  busy={busy}
                  onCode={(code) => run(() => connectCalendar(code))}
                  onError={() => setError(explain(new ApiError(0, "google_failed", "")))}
                />
              </div>
            )
          }
        />
        {status === "on" && (
          <Row
            title={t("titles")}
            description={t("titlesNote")}
            control={
              <Switch checked={info?.showTitles ?? false} disabled={busy} onCheckedChange={(on) => run(() => showCalendarTitles(on))} ariaLabel={t("titles")} />
            }
          />
        )}
      </Group>
      {error && <p className="-mt-5 mb-8 px-1 text-[12.5px] text-destructive">{error}</p>}
    </>
  );
}
