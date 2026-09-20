"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Hash, ImageUp, Plus, Send, SmilePlus } from "lucide-react";
import { GENERAL_CHANNEL, type ChatMessage } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { officeChatPath } from "@/lib/links";
import { Badge, label, quietLabel, surface } from "@/components/room/ui";
import { OfficeView, useOffice } from "./OfficeShell";

const QUICK = ["👍", "😂", "❤️", "🎉"];

/** The office's chat: channels and direct messages, beside the floor. */
export function ChatView({ channel }: { channel?: string }) {
  const t = useTranslations("chat");
  const tOffice = useTranslations("office");
  const router = useRouter();
  const { office } = useOffice();
  const state = useChat();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  const open = channel ?? GENERAL_CHANNEL;
  const current = state.channels.find((one) => one.id === open);
  const messages = state.history[open] ?? [];

  // Reading a channel is what marks it read, and what asks for its history.
  useEffect(() => {
    chat.watch(open);
    return () => chat.watch(null);
  }, [open, state.ready]);

  useEffect(() => {
    if (state.ready && !state.history[open]) chat.older(open);
  }, [state.ready, state.history, open]);

  return (
    <OfficeView
      title={tOffice("chat")}
      action={
        <button
          type="button"
          onClick={() => setNaming((was) => !was)}
          title={t("newChannel")}
          aria-label={t("newChannel")}
          className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
        </button>
      }
      column={
        <>
          {naming && (
            <form
              className="px-1 pb-2"
              onSubmit={(event) => {
                event.preventDefault();
                const clean = name.trim();
                if (!clean) return;
                chat.makeChannel(clean);
                setName("");
                setNaming(false);
              }}
            >
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("channelName")}
                className="w-full h-9 px-3 rounded-xl bg-white border border-black/[0.08] font-body text-[13px] outline-none focus:border-black/20"
              />
            </form>
          )}

          <Section title={t("channels")} />
          {state.channels
            .filter((one) => one.kind === "channel")
            .map((one) => (
              <ChannelRow
                key={one.id}
                active={one.id === open}
                unread={one.unread}
                onClick={() => router.push(officeChatPath(office.id, one.id))}
              >
                <Hash className="w-3.5 h-3.5 opacity-40 shrink-0" />
                <span className="truncate">{one.name}</span>
              </ChannelRow>
            ))}

          <Section title={t("directMessages")} />
          {state.channels
            .filter((one) => one.kind === "dm")
            .map((one) => (
              <ChannelRow
                key={one.id}
                active={one.id === open}
                unread={one.unread}
                onClick={() => router.push(officeChatPath(office.id, one.id))}
              >
                <span className="w-4 h-4 rounded-full bg-[var(--color-braun-text)]/[0.08] flex items-center justify-center font-body text-[9px] font-semibold shrink-0">
                  {one.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="truncate">{one.name}</span>
              </ChannelRow>
            ))}
          {!state.channels.some((one) => one.kind === "dm") && (
            <p className={`${quietLabel} px-3 py-1`}>{t("noDirect")}</p>
          )}
        </>
      }
    >
      <header className="h-14 shrink-0 flex items-center gap-2 px-5 border-b border-black/[0.06]">
        <Hash className="w-4 h-4 opacity-40" />
        <h3 className={`${label} text-[var(--color-braun-text)]`}>{current?.name ?? open}</h3>
      </header>

      <Conversation messages={messages} me={state.me} more={state.more[open] ?? false} channel={open} />
      <Composer channel={open} placeholder={t("say", { channel: current?.name ?? open })} />
    </OfficeView>
  );
}

function Section({ title }: { title: string }) {
  return <p className={`${quietLabel} px-3 pt-3 pb-1 uppercase-none`}>{title}</p>;
}

function ChannelRow({
  active,
  unread,
  onClick,
  children,
}: {
  active: boolean;
  unread: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer w-full h-9 px-3 rounded-xl flex items-center gap-2 font-body text-[13px] transition-colors duration-150 ${
        active
          ? "bg-[var(--color-braun-text)]/[0.08] font-semibold text-[var(--color-braun-text)]"
          : "text-[var(--color-braun-text)] opacity-70 hover:opacity-100 hover:bg-black/[0.04]"
      }`}
    >
      {children}
      {unread > 0 && (
        <span className="ms-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-braun-orange)] text-white font-body text-[10px] font-bold leading-[18px] text-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}

function Conversation({
  messages,
  me,
  more,
  channel,
}: {
  messages: ChatMessage[];
  me: string;
  more: boolean;
  channel: string;
}) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const box = useRef<HTMLDivElement>(null);
  const atEnd = useRef(true);

  // Stay at the bottom while new messages arrive, unless you have scrolled up.
  useLayoutEffect(() => {
    const element = box.current;
    if (element && atEnd.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={box}
      onScroll={(event) => {
        const element = event.currentTarget;
        atEnd.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}
      className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
    >
      {more && (
        <button
          type="button"
          onClick={() => chat.older(channel)}
          className="cursor-pointer mx-auto mb-4 block h-8 px-4 rounded-full bg-white border border-black/[0.06] font-body text-[12px] font-semibold"
        >
          {t("older")}
        </button>
      )}

      {!messages.length && <p className={`${quietLabel} text-center py-8`}>{t("nothingYet")}</p>}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const sameDay = previous && new Date(previous.at).toDateString() === new Date(message.at).toDateString();
        const grouped = sameDay && previous.author === message.author && message.at - previous.at < 5 * 60_000;
        return (
          <div key={message.seq}>
            {!sameDay && (
              <div className="flex items-center gap-3 my-4">
                <span className="flex-1 h-px bg-black/[0.06]" />
                <span className={quietLabel}>{format.dateTime(new Date(message.at), { dateStyle: "medium" })}</span>
                <span className="flex-1 h-px bg-black/[0.06]" />
              </div>
            )}
            <Line message={message} grouped={!!grouped} me={me} />
          </div>
        );
      })}
    </div>
  );
}

function Line({ message, grouped, me }: { message: ChatMessage; grouped: boolean; me: string }) {
  const format = useFormatter();
  const [picking, setPicking] = useState(false);

  return (
    <div className={`group relative flex gap-3 ${grouped ? "mt-0.5" : "mt-4"}`}>
      <span className="w-8 shrink-0">
        {!grouped && (
          <span className="w-8 h-8 rounded-full bg-[var(--color-braun-text)]/[0.06] flex items-center justify-center font-body text-[13px] font-semibold text-[var(--color-braun-text)]">
            {message.authorName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <span className={`${label} text-[var(--color-braun-text)]`}>{message.authorName}</span>
            <span className={quietLabel}>{format.dateTime(new Date(message.at), { timeStyle: "short" })}</span>
          </p>
        )}
        {message.body && (
          <p dir="auto" className="font-body text-sm text-[var(--color-braun-text)] whitespace-pre-wrap break-words">
            {message.body}
          </p>
        )}
        {message.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL ?? ""}/attachments/${message.image.key}`}
            alt=""
            width={message.image.width}
            height={message.image.height}
            className="mt-1 rounded-xl border border-black/[0.06] max-w-[min(20rem,100%)] h-auto"
          />
        )}

        {!!message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, people]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => chat.react(message.seq, emoji, !people.includes(me))}
                className={`cursor-pointer h-6 px-2 rounded-full border font-body text-[12px] flex items-center gap-1 ${
                  people.includes(me)
                    ? "bg-[var(--color-braun-text)]/[0.08] border-[var(--color-braun-text)]/20"
                    : "bg-white border-black/[0.06]"
                }`}
              >
                <span>{emoji}</span>
                <span className="opacity-60">{people.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="absolute end-0 -top-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <div className={`${surface} rounded-full flex items-center p-1 gap-0.5`}>
          {(picking ? QUICK : QUICK.slice(0, 2)).map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => chat.react(message.seq, emoji, !message.reactions?.[emoji]?.includes(me))}
              className="cursor-pointer w-7 h-7 rounded-full hover:bg-black/[0.05] text-[14px]"
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPicking((was) => !was)}
            className="cursor-pointer w-7 h-7 rounded-full hover:bg-black/[0.05] flex items-center justify-center"
          >
            <SmilePlus className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Composer({ channel, placeholder }: { channel: string; placeholder: string }) {
  const t = useTranslations("chat");
  const { office } = useOffice();
  const [body, setBody] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    chat.say(channel, text);
    setBody("");
    if (box.current) box.current.style.height = "auto";
  };

  return (
    <div className="shrink-0 px-5 pb-5">
      {note && <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-60 mb-2">{note}</p>}
      <div className="flex items-end gap-2 rounded-2xl bg-white border border-black/[0.08] px-3 py-2 focus-within:border-black/20 transition-colors">
        <button
          type="button"
          // Attachments are part of a paid office: the button is here so the
          // shape of the product is plain, and it says why when pressed.
          onClick={() => setNote(office.plan === "free" ? t("attachmentsPaid") : t("attachmentsSoon"))}
          title={t("attach")}
          aria-label={t("attach")}
          className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] shrink-0"
        >
          <ImageUp className="w-4 h-4 opacity-55" />
        </button>

        <textarea
          ref={box}
          rows={1}
          dir="auto"
          value={body}
          placeholder={placeholder}
          onChange={(event) => {
            setBody(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          className="flex-1 resize-none bg-transparent outline-none font-body text-sm text-[var(--color-braun-text)] py-1.5 max-h-40"
        />

        <button
          type="button"
          onClick={send}
          disabled={!body.trim()}
          title={t("send")}
          aria-label={t("send")}
          className="cursor-pointer w-8 h-8 rounded-full bg-[var(--color-braun-text)] text-white flex items-center justify-center disabled:opacity-25 shrink-0"
        >
          <Send className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}

export { Badge };
