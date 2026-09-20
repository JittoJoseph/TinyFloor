"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { X, Send, MessageSquare } from "lucide-react";
import { surface, label } from "./room/ui";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "system";
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onUnreadChange?: (count: number) => void;
  participantCount?: number;
}

export default function ChatPanel({
  isOpen,
  onClose,
  userId,
  userName,
  onUnreadChange,
  participantCount = 1,
}: ChatPanelProps) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      senderId: "system",
      senderName: t("system"),
      content: t("welcome"),
      timestamp: new Date(),
      type: "system",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Ref so the message listener always reads the latest isOpen without being in deps
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Opening the panel reads everything, adjusted during render.
  const [seenOpen, setSeenOpen] = useState(isOpen);
  if (isOpen !== seenOpen) {
    setSeenOpen(isOpen);
    if (isOpen) setUnreadCount(0);
  }

  // Focus input when opened; unlock movement when closed
  useEffect(() => {
    if (isOpen) {
      onUnreadChange?.(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      window.dispatchEvent(new CustomEvent("chatBlurred"));
    }
  }, [isOpen, onUnreadChange]);

  // Propagate unread count to parent outside the render cycle
  useEffect(() => {
    if (!isOpen) onUnreadChange?.(unreadCount);
  }, [unreadCount, isOpen, onUnreadChange]);

  // Message listener — runs once on mount, never resets message history
  useEffect(() => {
    const handleChatMessage = ((event: CustomEvent<ChatMessage>) => {
      setMessages((prev) => {
        if (prev.some((msg) => msg.id === event.detail.id)) return prev;
        return [...prev, event.detail];
      });
      if (!isOpenRef.current) setUnreadCount((prev) => prev + 1);
    }) as EventListener;

    window.addEventListener("chatMessage", handleChatMessage);
    return () => window.removeEventListener("chatMessage", handleChatMessage);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isOpenRef.current &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, {
      passive: true,
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onClose]);

  // Scroll to bottom when new messages arrive (only when open)
  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = useCallback(() => {
    if (!inputValue.trim()) return;
    const message: ChatMessage = {
      id: `${Date.now()}-${userId}`,
      senderId: userId,
      senderName: userName,
      content: inputValue.trim(),
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, message]);
    window.dispatchEvent(
      new CustomEvent("sendChatMessage", { detail: message }),
    );
    setInputValue("");
    inputRef.current?.focus();
  }, [inputValue, userId, userName]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  const formatTime = (date: Date) =>
    format.dateTime(new Date(date), { hour: "2-digit", minute: "2-digit" });

  const handleFocus = () =>
    window.dispatchEvent(new CustomEvent("chatFocused"));
  const handleBlur = () => window.dispatchEvent(new CustomEvent("chatBlurred"));

  return (
    <div
      ref={panelRef}
      className={`${surface} fixed z-50 flex flex-col font-body overflow-hidden rounded-3xl transition-all duration-200 inset-x-3 bottom-20 h-[min(60vh,26rem)] sm:inset-x-auto sm:end-5 sm:bottom-24 sm:w-[21rem] sm:h-[28rem] ${
        isOpen
          ? "opacity-100 pointer-events-auto translate-y-0"
          : "opacity-0 pointer-events-none translate-y-2"
      }`}
    >
      <div className="flex items-center justify-between ps-4 pe-2.5 py-3 border-b border-black/[0.05]">
        <h2 className={`${label} text-[var(--color-braun-text)] flex items-center gap-2`}>
          <MessageSquare className="w-4 h-4 opacity-50" />
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-colors duration-150"
        >
          <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === userId ? "justify-end" : "justify-start"}`}
          >
            {msg.type === "system" ? (
              <div className="text-center text-xs text-[var(--color-braun-text)] opacity-50 bg-[rgba(0,0,0,0.03)] px-3 py-1.5 rounded-full mx-auto">
                {msg.content}
              </div>
            ) : (
              <div
                className={`max-w-[85%] ${msg.senderId === userId ? "order-1" : ""}`}
              >
                {msg.senderId !== userId && participantCount > 2 && (
                  <p className="text-[11px] text-[var(--color-braun-text)] opacity-60 font-medium ms-1 mb-1">
                    {msg.senderName}
                  </p>
                )}
                <div
                  dir="auto"
                  className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                    msg.senderId === userId
                      ? "bg-[var(--color-braun-orange)] text-white rounded-br-sm"
                      : "bg-white text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.04)] rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p
                  className={`text-[10px] opacity-40 mt-1 ${
                    msg.senderId === userId ? "text-end me-1" : "ms-1"
                  } text-[var(--color-braun-text)]`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-black/[0.05]">
        <div className="flex items-center gap-2 bg-white rounded-full border border-[rgba(0,0,0,0.06)] pe-1.5 ps-4 py-1.5 focus-within:border-[rgba(0,0,0,0.15)] transition-colors shadow-sm">
          <input
            ref={inputRef}
            type="text"
            dir="auto"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={t("placeholder")}
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--color-braun-text)] placeholder:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            aria-label={t("send")}
            className={`cursor-pointer p-2 rounded-full transition-all flex items-center justify-center ${
              inputValue.trim()
                ? "bg-[var(--color-braun-text)] text-white hover:bg-[#3d3d3d]"
                : "bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-30"
            }`}
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}
