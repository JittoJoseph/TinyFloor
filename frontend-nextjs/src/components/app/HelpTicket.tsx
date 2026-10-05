"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Loader } from "@/components/motion/loader";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { help, useHelp } from "@/lib/help";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { usePlace } from "./place";
import { Conversation, ConversationIntro, type Line } from "./chat/Conversation";
import { Composer } from "./chat/Composer";
import { HELP_TRIGGER } from "./HelpCompose";

/** How often the ticket is read again, so the team's answer turns up while you're on it. */
const EVERY_MS = 5_000;

/**
 * TinyFloor support in Chat (docs/19): the ticket with the team, as the same
 * conversation as a channel, with the team's answers under the TinyFloor
 * mark. Anyone who can see it can add to it while it's open. Closed while
 * you're on it, it says so; with none open, it offers to start one.
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
    if (!id || closed) return;
    void help.load(id);
    const timer = setInterval(() => document.visibilityState === "visible" && void help.load(id), EVERY_MS);
    return () => clearInterval(timer);
  }, [id, closed]);
  useEffect(() => () => help.leave(), []);

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
        <IconButton
          label={ts("back")}
          size="sm"
          className="md:hidden"
          onClick={() => router.push(place.paths.chat())}
          icon={<ArrowLeft className="rtl:rotate-180" />}
        />
        <Logo size={22} className="shrink-0" />
        <span className="truncate text-[15px] font-semibold text-foreground">{t("support")}</span>
        {view && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
              closed ? "bg-muted text-muted-foreground" : "bg-foreground/[0.07] text-foreground",
            )}
          >
            {t(closed ? "closed" : "open")}
          </span>
        )}
      </header>

      {!id ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">{t("nothingOpen")}</p>
          <button
            type="button"
            {...{ [HELP_TRIGGER]: "" }}
            onClick={() => help.compose(true)}
            className="h-9 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background"
          >
            {t("title")}
          </button>
        </div>
      ) : !view ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader variant="dots" size={18} />
        </div>
      ) : (
        <>
          <Conversation
            key={`support-${view.id}`}
            lines={lines}
            me={user?.id ?? ""}
            more={false}
            intro={
              <ConversationIntro
                mark={<Logo size={56} />}
                title={t("support")}
                body={place.kind === "office" ? t("ticketOffice", { office: place.name }) : t("ticketLobby")}
              />
            }
          />
          {closed ? (
            <p className="shrink-0 px-5 pb-5 pt-2 text-center text-[13px] text-muted-foreground sm:px-6">{t("closedNote")}</p>
          ) : (
            <Composer
              key={`support-composer-${view.id}`}
              placeholder={t("message")}
              attach={false}
              note={failed ? t(failed) : null}
              onSend={(text) => {
                setFailed(null);
                help.say(text).catch((error) => setFailed(error instanceof ApiError && error.status === 429 ? "slowDown" : "error"));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
