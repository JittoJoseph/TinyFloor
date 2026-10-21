"use client";

import { useCallback, useSyncExternalStore } from "react";
import { chat, type ChatState } from "./ChatSocket";

/** The office's chat, as React sees it. */
export function useChat(): ChatState {
  return useSyncExternalStore(chat.subscribe, chat.getSnapshot, chat.getServerSnapshot);
}

const NONE = new Map<string, { name: string; until: number }>();

/** Who's typing in this conversation right now, by id. */
export function useTyping(channel: string | null) {
  const read = useCallback(() => (channel ? chat.typistsIn(channel) : NONE), [channel]);
  return useSyncExternalStore(chat.subscribeTyping, read, () => NONE);
}
