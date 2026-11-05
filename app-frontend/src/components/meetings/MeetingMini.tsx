"use client";

import { usePlace } from "@/components/app/place";
import { CallWindow } from "@/components/calls/CallWindow";
import { useMyMeeting } from "./hooks";

/**
 * Your meeting, while you look at the floor: the same small dark card as the
 * window that stays on top of other apps (CallWindow), in the corner, pressed
 * to go back to the meeting. Out here only that one small video is received.
 */
export function MeetingMini() {
  const place = usePlace();
  const meeting = useMyMeeting();
  if (!meeting || !place.paths.meetings) return null;
  return (
    <div className="pointer-events-auto absolute end-3 top-16 z-40 sm:bottom-4 sm:end-4 sm:top-auto">
      <CallWindow variant="floor" />
    </div>
  );
}
