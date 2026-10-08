"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MAIN_MEETING, type MeetingInfo } from "@shared/messages";
import { useCall } from "@/lib/useCall";
import { useMeetings } from "@/lib/meetings";
import { usePlace } from "@/components/app/place";

/** The meeting you are in, as the room lists it, if you are in one. */
export function useMyMeeting(): MeetingInfo | null {
  const { meeting } = useCall();
  const { meetings } = useMeetings();
  return (meeting && meetings.find((one) => one.id === meeting)) || null;
}

/** A meeting's name as people see it: the office's (or the lobby's) for the main one, its own or its starter's for others. */
export function useMeetingName() {
  const t = useTranslations("meetings");
  const { kind } = usePlace();
  return (meeting: Pick<MeetingInfo, "id" | "name" | "by"> | null, office: string) => {
    if (!meeting || meeting.id === MAIN_MEETING) return kind === "lobby" ? t("lobbyName") : t("mainName", { office });
    return meeting.name ?? t("byName", { name: meeting.by ?? "" });
  };
}

/** Seconds since a meeting started, ticking while it runs. */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
}

/** 4:07, or 1:02:09 past the hour. */
export function clock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
