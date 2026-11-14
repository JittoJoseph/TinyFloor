"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ApiError } from "web-shared/lib/api";
import { GoogleButton } from "web-shared/components/auth/GoogleButton";
import { CALENDAR_CLIENT_ID, CALENDAR_SCOPE, calendarAvailable, connectCalendar } from "@/lib/calendar";
import { useErrorMessage } from "@/lib/useErrorMessage";

/** Connecting, with its errors said plainly. */
function useConnect() {
  const t = useTranslations("calendar");
  const explain = useErrorMessage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const connect = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      await connectCalendar(code);
    } catch (problem) {
      const code = problem instanceof ApiError ? problem.code : "";
      setError(code === "calendar_not_allowed" ? t("notAllowed") : code === "calendar_again" ? t("again") : explain(problem));
    } finally {
      setBusy(false);
    }
  };
  const failed = () => setError(explain(new ApiError(0, "google_failed", "")));
  return { busy, error, connect, failed };
}

/** Connecting: Google's button, with what went wrong if anything did. */
export function ConnectInline() {
  const t = useTranslations("calendar");
  const { busy, error, connect, failed } = useConnect();
  if (!calendarAvailable) return <span className="text-[12.5px] text-muted-foreground">{t("unavailable")}</span>;
  return (
    <span className="flex items-center gap-3">
      <span className="w-52">
        <GoogleButton label={t("connect")} clientId={CALENDAR_CLIENT_ID} scope={CALENDAR_SCOPE} busy={busy} onCode={connect} onError={failed} />
      </span>
      {error && <span className="text-[12.5px] text-destructive">{error}</span>}
    </span>
  );
}
