"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Smile,
  Paperclip,
  Maximize2,
  Minimize2,
  MessageCircle,
} from "lucide-react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: "text" | "emoji" | "system";
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerName: string;
}

const EMOJI_QUICK_PICKS = ["👋", "👍", "😊", "🎉", "💡", "🤔", "✅", "❤️"];

export default function ChatPanel({
  isOpen,
  onClose,
  playerId,
  playerName,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Listen for incoming chat messages
  useEffect(() => {
    const handleChatMessage = ((event: CustomEvent<ChatMessage>) => {
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.some((msg) => msg.id === event.detail.id)) {
          return prev;
        }
        return [...prev, event.detail];
      });
    }) as EventListener;

    window.addEventListener("chatMessage", handleChatMessage);

    // Add welcome message
    setMessages([
      {
        id: "welcome",
        senderId: "system",
        senderName: "System",
        content: "Welcome to the room chat! Say hi to your colleagues",
        timestamp: new Date(),
        type: "system",
      },
    ]);

    return () => {
      window.removeEventListener("chatMessage", handleChatMessage);
    };
  }, []);

  const sendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    const message: ChatMessage = {
      id: `${Date.now()}-${playerId}`,
      senderId: playerId,
      senderName: playerName,
      content: inputValue.trim(),
      timestamp: new Date(),
      type: "text",
    };

    // Add to local messages
    setMessages((prev) => [...prev, message]);

    // Send via WebSocket
    window.dispatchEvent(
      new CustomEvent("sendChatMessage", { detail: message })
    );

    setInputValue("");
    setShowEmojis(false);
  }, [inputValue, playerId, playerName]);

  const sendEmoji = useCallback(
    (emoji: string) => {
      const message: ChatMessage = {
        id: `${Date.now()}-${playerId}`,
        senderId: playerId,
        senderName: playerName,
        content: emoji,
        timestamp: new Date(),
        type: "emoji",
      };

      setMessages((prev) => [...prev, message]);
      window.dispatchEvent(
        new CustomEvent("sendChatMessage", { detail: message })
      );
      setShowEmojis(false);
    },
    [playerId, playerName]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-50 bg-white/95 backdrop-blur-sm border-2 border-gray-800 rounded-2xl shadow-retro flex flex-col transition-all duration-200 ${
        isExpanded ? "inset-4" : "bottom-24 right-4 w-80 h-96"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-200 bg-indigo-50 rounded-t-xl">
        <h3 className="font-pixel text-lg text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          Room Chat
          {messages.length > 1 && (
            <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded-full">
              {messages.length - 1}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderId === playerId ? "justify-end" : "justify-start"
            }`}
          >
            {msg.type === "system" ? (
              <div className="text-center text-xs text-gray-500 bg-gray-100 px-3 py-2 rounded-lg mx-auto">
                {msg.content}
              </div>
            ) : (
              <div
                className={`max-w-[75%] ${
                  msg.senderId === playerId ? "order-1" : ""
                }`}
              >
                {msg.senderId !== playerId && (
                  <div className="flex items-center gap-1 mb-1 ml-1">
                    <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-200">
                      {msg.senderName.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {msg.senderName}
                    </p>
                  </div>
                )}
                <div
                  className={`px-3 py-2 rounded-2xl ${
                    msg.type === "emoji"
                      ? "text-3xl bg-transparent"
                      : msg.senderId === playerId
                      ? "bg-indigo-500 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <p
                  className={`text-[10px] text-gray-400 mt-1 ${
                    msg.senderId === playerId ? "text-right mr-1" : "ml-1"
                  }`}
                >
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Quick Picks */}
      {showEmojis && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            {EMOJI_QUICK_PICKS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendEmoji(emoji)}
                className="text-2xl hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t-2 border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmojis(!showEmojis)}
            className={`p-2 rounded-lg transition-colors ${
              showEmojis
                ? "bg-indigo-100 text-indigo-600"
                : "hover:bg-gray-100 text-gray-500"
            }`}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-gray-100 rounded-xl border-2 border-transparent focus:border-indigo-300 focus:bg-white outline-none text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim()}
            className={`p-2 rounded-xl transition-all ${
              inputValue.trim()
                ? "bg-indigo-500 hover:bg-indigo-600 text-white hover:-translate-y-0.5"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
