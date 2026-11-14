"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "web-shared/lib/api";
import { Button } from "@/components/motion/button/base";
import { Switch } from "@/components/motion/switch";
import { Loader } from "@/components/motion/loader";
import { calendarAvailable, disconnectCalendar, readCalendar, showCalendarTitles, useCalendar } from "@/lib/calendar";
import { ConnectButton, useConnect } from "@/components/calendar/Connect";
import { GoogleCalendarIcon } from "@/components/calendar/GoogleCalendarIcon";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { Group, Row } from "./SettingsView";

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
  const connect = useConnect();
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

  if (!calendarAvailable && status !== "on") {
    return (
      <Group>
        <Row icon={<GoogleCalendarIcon size={28} />} title={t("google")} description={t("unavailable")} control={null} />
      </Group>
    );
  }

  return (
    <>
      <Group note={t("privacy")}>
        <Row
          icon={<GoogleCalendarIcon size={28} />}
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
              <ConnectButton connect={connect} label={t("connect")} />
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
      {(error || connect.error) && <p className="-mt-5 mb-8 px-1 text-[12.5px] text-destructive">{error || connect.error}</p>}
    </>
  );
}
