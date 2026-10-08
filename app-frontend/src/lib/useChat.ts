"use client";

import { useSyncExternalStore } from "react";
import { chat, type ChatState } from "./ChatSocket";

/** The office's chat, as React sees it. */
export function useChat(): ChatState {
  return useSyncExternalStore(chat.subscribe, chat.getSnapshot, chat.getServerSnapshot);
}
