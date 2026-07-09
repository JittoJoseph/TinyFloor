"use client";

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";

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
    const handleChatMessage = ((event: CustomEvent<ChatMessage>) => {
      // Don't show toast if chat is open, or if it's the system intro message
      if (isChatOpen || event.detail.senderId === "system-intro") return;

      // Don't show toast for own messages
      if (event.detail.senderId === "local") return; // or however local sender is identified, though local shouldn't trigger if chat is closed since you can't type

      const newMsg = { ...event.detail, visible: true };

      setToasts((prev) => [...prev, newMsg]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === newMsg.id ? { ...t, visible: false } : t)),
        );

        // Clean up array after animation
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newMsg.id));
        }, 300);
      }, 4000);
    }) as EventListener;

    window.addEventListener("chatMessage", handleChatMessage);
    return () => window.removeEventListener("chatMessage", handleChatMessage);
  }, [isChatOpen]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 md:right-6 top-24 z-40 flex flex-col gap-2 pointer-events-none items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-full shadow-sm pr-4 pl-1.5 py-1.5 transition-all duration-300 cursor-pointer hover:-translate-x-1 hover:shadow-md flex items-center gap-2 max-w-[200px] sm:max-w-xs ${
            toast.visible
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4"
          }`}
          onClick={() => {
            // Dismiss this toast immediately when clicked
            setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            onOpenChat();
          }}
        >
          <div className="w-6 h-6 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-[10px] shrink-0">
            {toast.senderName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
            <span className="font-bold text-[11px] text-[var(--color-braun-text)] shrink-0 truncate max-w-[80px]">
              {toast.senderName}
            </span>
            <span className="text-[11px] text-gray-500 truncate">
              {toast.content}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
