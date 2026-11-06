"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "web-shared/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Loader } from "@/components/motion/loader";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "web-shared/lib/api";
import { help, useHelp } from "@/lib/help";
import { Logo } from "web-shared/components/app/Logo";
import { usePlace } from "./place";
import { Conversation, ConversationIntro, type Line } from "./chat/Conversation";
import { Composer } from "./chat/Composer";

/**
 * The conversation with the TinyFloor team, in Chat: the same as any other
 * conversation, with the team's words under the TinyFloor mark. With nothing
 * open it's the team's introduction and a composer, so the first message is
 * just a message; anyone who can see it can add to it. Closed, it stays to
 * read, and writing again starts a new one.
 */
export function HelpTicket() {
  const t = useTranslations("help");
  const ts = useTranslations("shell");
  const router = useRouter();
  const place = usePlace();
  const { user } = useAuth();
  const { ticket, view } = useHelp();
  const [failed, setFailed] = useState<"error" | "slowDown" | null>(null);
  // The open ticket, or the one already on screen (which stays if it's closed meanwhile).
  const id = view?.id ?? ticket?.id;
  const closed = view?.status === "closed";

  useEffect(() => {
    help.show();
    return () => help.leave();
  }, []);
  // Read as it opens; the team's answer arrives by the chat socket (help.changed reads it again).
  useEffect(() => {
    if (id && !closed) void help.load(id);
  }, [id, closed]);

  const lines: Line[] = (view?.messages ?? []).map((message) => ({
    id: String(message.id),
    author: message.team ? "tinyfloor" : (message.author ?? `gone-${message.id}`),
    authorName: message.name,
    body: message.body,
    at: message.at,
    ...(message.team ? { mark: <Logo size={36} /> } : {}),
  }));

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
        <IconButton label={ts("back")} size="sm" className="md:hidden" onClick={() => router.push(place.paths.chat())} icon={<ArrowLeft className="rtl:rotate-180" />} />
        <Logo size={22} className="shrink-0" />
        <span className="truncate text-[15px] font-semibold text-foreground">{t("support")}</span>
        {closed && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">{t("closed")}</span>}
      </header>

      {id && !view ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader variant="dots" size={18} />
        </div>
      ) : (
        <>
          <Conversation
            key={`support-${view?.id ?? "new"}`}
            lines={lines}
            me={user?.id ?? ""}
            more={false}
            intro={<ConversationIntro mark={<Logo size={56} />} title={t("support")} body={place.kind === "office" ? t("ticketOffice", { office: place.name }) : t("ticketLobby")} />}
          />
          {closed && <p className="shrink-0 px-5 pt-2 text-center text-[12.5px] text-muted-foreground sm:px-6">{t("closedNote")}</p>}
          <Composer
            key={`support-composer-${view?.id ?? "new"}`}
            placeholder={t("message")}
            attach={false}
            note={failed ? t(failed) : null}
            onSend={(text) => {
              setFailed(null);
              help.say(text).catch((error) => setFailed(error instanceof ApiError && error.status === 429 ? "slowDown" : "error"));
            }}
          />
        </>
      )}
    </div>
  );
}
