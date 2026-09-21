"use client";

import { useSyncExternalStore } from "react";

export interface RoomChatMessage {
  id: string;
  author: string;
  authorName: string;
  body: string;
  at: number;
}

export interface RoomChatState {
  messages: RoomChatMessage[];
  unread: number;
  /** The room asked us to slow down; shown under the composer. */
  slowDown: boolean;
}

/**
 * The floor's own live chat, which the lobby shows as its Chat view. It rides
 * the floor socket and is never stored: it lasts as long as you are in the room.
 */
const MAX = 200;
let state: RoomChatState = { messages: [], unread: 0, slowDown: false };
let watching = false;
const listeners = new Set<() => void>();
const incoming = new Set<(message: RoomChatMessage) => void>();

function set(next: RoomChatState) {
  state = next;
  listeners.forEach((listener) => listener());
}

function add(message: RoomChatMessage, fromMe: boolean) {
  if (state.messages.some((one) => one.id === message.id)) return;
  set({
    ...state,
    messages: [...state.messages, message].slice(-MAX),
    unread: watching || fromMe ? 0 : state.unread + 1,
  });
  if (!watching && !fromMe) incoming.forEach((listener) => listener(message));
}

if (typeof window !== "undefined") {
  window.addEventListener("chatMessage", (event) => {
    const detail = (event as CustomEvent<{ id: string; senderId: string; senderName: string; content: string; timestamp: Date }>)
      .detail;
    add(
      {
        id: detail.id,
        author: detail.senderId,
        authorName: detail.senderName,
        body: detail.content,
        at: new Date(detail.timestamp).getTime(),
      },
      false,
    );
  });
  window.addEventListener("chatSlowDown", () => {
    set({ ...state, slowDown: true });
    setTimeout(() => set({ ...state, slowDown: false }), 4000);
  });
}

export const roomChat = {
  say(me: { id: string; name: string }, body: string) {
    const at = Date.now();
    const message = { id: `${at}-${me.id}`, author: me.id, authorName: me.name, body, at };
    add(message, true);
    // The floor socket sends it; see GameScene.
    window.dispatchEvent(
      new CustomEvent("sendChatMessage", {
        detail: { id: message.id, senderId: me.id, senderName: me.name, content: body, timestamp: new Date(at), type: "text" },
      }),
    );
  },
  watch(on: boolean) {
    watching = on;
    if (on && state.unread) set({ ...state, unread: 0 });
  },
  onIncoming(listener: (message: RoomChatMessage) => void) {
    incoming.add(listener);
    return () => {
      incoming.delete(listener);
    };
  },
  reset() {
    watching = false;
    set({ messages: [], unread: 0, slowDown: false });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: RoomChatState = { messages: [], unread: 0, slowDown: false };

export function useRoomChat(): RoomChatState {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}
