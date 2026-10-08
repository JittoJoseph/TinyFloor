"use client";

import { useSyncExternalStore } from "react";
import { MAIN_MEETING, type MeetingInfo, type MeetingUsage } from "@shared/messages";

/**
 * The office's meetings as the room tells them: the main one always, others
 * while anyone is in them, who is in each and who is talking. It arrives on
 * the floor socket we already hold, so the Meetings page, the rail and the
 * floor show a meeting live without receiving a byte of its media.
 */
interface MeetingsState {
  meetings: MeetingInfo[];
  /** When each person last started or stopped talking, for choosing whose video to show. */
  spokeAt: ReadonlyMap<string, number>;
  /** The place's meeting hours this period (docs/14), as the room last said. */
  usage: MeetingUsage | null;
  /** When it said so, for counting on from there. */
  usageAt: number;
}

const EMPTY: MeetingsState = { meetings: [], spokeAt: new Map(), usage: null, usageAt: 0 };
let state: MeetingsState = EMPTY;
const listeners = new Set<() => void>();

function set(next: MeetingsState) {
  state = next;
  listeners.forEach((listener) => listener());
}

/** The room's whole list, on arriving and whenever anyone joins, leaves or starts one. */
export function setMeetings(meetings: MeetingInfo[]) {
  const spokeAt = new Map(state.spokeAt);
  const now = Date.now();
  for (const meeting of meetings) {
    for (const member of meeting.members) if (member.speaking) spokeAt.set(member.id, now);
  }
  set({ ...state, meetings, spokeAt });
}

/** The meeting hours, on arriving and whenever a meeting starts or stops counting. */
export function setMeetingUsage(usage: MeetingUsage) {
  set({ ...state, usage, usageAt: Date.now() });
}

/** Someone started or stopped talking in their meeting. */
export function setSpeaking(id: string, on: boolean) {
  const meetings = state.meetings.map((meeting) =>
    meeting.members.some((member) => member.id === id)
      ? { ...meeting, members: meeting.members.map((member) => (member.id === id ? { ...member, speaking: on } : member)) }
      : meeting,
  );
  const spokeAt = new Map(state.spokeAt);
  spokeAt.set(id, Date.now());
  set({ ...state, meetings, spokeAt });
}

/** The floor has gone: nothing is known about its meetings. */
export function clearMeetings() {
  set(EMPTY);
}

export function meetingsState(): MeetingsState {
  return state;
}

export function subscribeMeetings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMeetings(): MeetingsState {
  return useSyncExternalStore(subscribeMeetings, () => state, () => EMPTY);
}

/** Which meeting someone is in, if any. */
export function meetingOf(id: string, meetings: MeetingInfo[] = state.meetings): MeetingInfo | undefined {
  return meetings.find((meeting) => meeting.members.some((member) => member.id === id));
}

/** Everyone in any meeting, for the rail and the table's tag. */
export function peopleInMeetings(meetings: MeetingInfo[]): number {
  return meetings.reduce((sum, meeting) => sum + meeting.members.length, 0);
}

export const isMain = (meeting: Pick<MeetingInfo, "id">) => meeting.id === MAIN_MEETING;

/** Asks the floor to walk you into the meeting room (see GameScene). */
export const WALK_TO_MEETING_EVENT = "walkToMeetingRoom";

/** Whether your character stands in the meeting room, from the floor, as it changes. */
export const MEETING_ROOM_EVENT = "meetingRoomPresence";

let inRoom = false;
const roomListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener(MEETING_ROOM_EVENT, (event) => {
    inRoom = (event as CustomEvent<{ inside: boolean }>).detail.inside;
    roomListeners.forEach((listener) => listener());
  });
}

export function useInMeetingRoom(): boolean {
  return useSyncExternalStore(
    (listener) => {
      roomListeners.add(listener);
      return () => roomListeners.delete(listener);
    },
    () => inRoom,
    () => false,
  );
}

export function isInMeetingRoom(): boolean {
  return inRoom;
}
