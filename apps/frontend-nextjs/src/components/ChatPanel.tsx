"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, MessageSquare } from "lucide-react";

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      senderId: "system",
      senderName: "System",
      content:
        "Welcome to the room chat. Messages are visible to everyone here.",
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
  isOpenRef.current = isOpen;

  // Reset unread and focus input when opened; unlock movement when closed
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
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

  // Introduce players to chat 10 seconds after mounting
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("chatMessage", {
          detail: {
            id: `intro-${Date.now()}`,
            senderId: "system-intro",
            senderName: "System",
            content: "You can chat with everyone in this room here.",
            timestamp: new Date(),
            type: "text",
          } satisfies ChatMessage,
        }),
      );
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpenRef.current &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
    new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const handleFocus = () =>
    window.dispatchEvent(new CustomEvent("chatFocused"));
  const handleBlur = () => window.dispatchEvent(new CustomEvent("chatBlurred"));

  return (
    <div
      ref={panelRef}
      className={`fixed bottom-24 right-4 md:right-8 w-full max-w-[340px] h-[450px] z-50 bg-[#fbfbf9]/95 backdrop-blur-md border border-[rgba(0,0,0,0.06)] rounded-3xl shadow-lg flex flex-col font-body overflow-hidden transition-all duration-200 ${
        isOpen
          ? "opacity-100 pointer-events-auto translate-y-0"
          : "opacity-0 pointer-events-none translate-y-2"
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(0,0,0,0.04)] bg-white/50">
        <h3 className="font-semibold text-[var(--color-braun-text)] flex items-center gap-2">
          <MessageSquare className="w-4 h-4 opacity-70" />
          Room Chat
        </h3>
        <button
          onClick={onClose}
          className="cursor-pointer p-1.5 hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-70" />
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
                  <p className="text-[11px] text-[var(--color-braun-text)] opacity-60 font-medium ml-1 mb-1">
                    {msg.senderName}
                  </p>
                )}
                <div
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
                    msg.senderId === userId ? "text-right mr-1" : "ml-1"
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

      <div className="p-3 bg-white/50 border-t border-[rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 bg-white rounded-full border border-[rgba(0,0,0,0.06)] pr-1.5 pl-4 py-1.5 focus-within:border-[rgba(0,0,0,0.15)] transition-colors shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--color-braun-text)] placeholder:opacity-40"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className={`cursor-pointer p-2 rounded-full transition-all flex items-center justify-center ${
              inputValue.trim()
                ? "bg-[var(--color-braun-text)] text-white hover:bg-[#3d3d3d]"
                : "bg-[rgba(0,0,0,0.04)] text-[var(--color-braun-text)] opacity-30"
            }`}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
