"use client";

import { useState, useEffect } from "react";

import { surface, label } from "./room/ui";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "system";
}

interface ChatToastsProps {
  isChatOpen: boolean;
  onOpenChat: () => void;
}

export function ChatToasts({ isChatOpen, onOpenChat }: ChatToastsProps) {
  const [toasts, setToasts] = useState<(ChatMessage & { visible: boolean })[]>(
    [],
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const handleChatMessage = ((event: CustomEvent<ChatMessage>) => {
      // Nothing to pop up for your own words, or while the panel is open.
      if (isChatOpen || event.detail.senderId === "local") return;

      const newMsg = { ...event.detail, visible: true };

      setToasts((prev) => [...prev, newMsg]);

      // Auto-remove after 4 seconds
      timers.push(
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((t) => (t.id === newMsg.id ? { ...t, visible: false } : t)),
          );
          timers.push(
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== newMsg.id));
            }, 300),
          );
        }, 4000),
      );
    }) as EventListener;

    window.addEventListener("chatMessage", handleChatMessage);
    return () => {
      window.removeEventListener("chatMessage", handleChatMessage);
      timers.forEach(clearTimeout);
    };
  }, [isChatOpen]);

  if (toasts.length === 0) return null;

  return (
    <div className="absolute end-3 sm:end-5 top-16 sm:top-20 z-40 flex flex-col gap-2 pointer-events-none items-end">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            onOpenChat();
          }}
          className={`${surface} cursor-pointer pointer-events-auto rounded-full ps-1.5 pe-4 py-1.5 flex items-center gap-2.5 max-w-[min(20rem,70vw)] text-start transition-all duration-300 hover:-translate-x-0.5 ${
            toast.visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          }`}
        >
          <span className="w-7 h-7 rounded-full bg-[var(--color-braun-text)]/[0.06] flex items-center justify-center font-body font-semibold text-[11px] text-[var(--color-braun-text)] shrink-0">
            {toast.senderName.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex items-baseline gap-1.5 overflow-hidden">
            <span className={`${label} text-[var(--color-braun-text)] shrink-0 truncate max-w-[6rem]`}>
              {toast.senderName}
            </span>
            <span className="font-body text-[12px] text-[var(--color-braun-text)] opacity-60 truncate">
              {toast.content}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
