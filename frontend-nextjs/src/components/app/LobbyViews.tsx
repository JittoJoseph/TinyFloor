"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Hand, Hash, MessagesSquare, Plus, UserPlus } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { lobbyChatPath, lobbyPath, shareUrl } from "@/lib/links";
import { shareLink } from "@/lib/share";
import { roomChat, useRoomChat } from "@/lib/roomChat";
import { useFloor } from "@/lib/floor";
import { Button } from "@/components/motion/button/base";
import { Face, FaceStack } from "@/components/ui/Face";
import { Chip, Empty } from "@/components/ui/Empty";
import { IconButton } from "@/components/ui/IconButton";
import { PersonPill } from "@/components/ui/Person";
import { ShellView } from "./AppShell";
import { PresenceDock } from "./PresenceDock";
import { Row } from "./ChatView";
import { Conversation, ConversationIntro } from "./chat/Conversation";
import { Composer } from "./chat/Composer";

/**
 * The lobby's chat: one live conversation everyone in the room can read, laid
 * out like an office's so the shape of the product is the same. What an office
 * adds — channels that stay, direct messages — is named, not hidden.
 */
export function LobbyChatView() {
  const t = useTranslations("chat");
  const tl = useTranslations("lobby");
  const ts = useTranslations("shell");
  const router = useRouter();
  const { user } = useAuth();
  const state = useRoomChat();
  const everyone = useFloor();

  useEffect(() => {
    roomChat.watch(true);
    return () => roomChat.watch(false);
  }, []);

  if (!user) return null;
  const guest = user.guest;

  return (
    <ShellView
      showDetail
      column={
        <>
          <header className="flex h-14 shrink-0 items-center px-4">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{tl("title")}</h2>
          </header>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <p className="flex h-7 items-center px-2.5 text-[12.5px] font-medium text-muted-foreground">{t("channels")}</p>
            <Row href={lobbyChatPath} active unread={0} icon={<Hash className="size-4" />} label={ts("lobbyChannel")} />

            <p className="mt-4 flex h-7 items-center px-2.5 text-[12.5px] font-medium text-muted-foreground">
              {t("directMessages")}
            </p>
            <div className="mx-1 rounded-xl border border-dashed border-border-strong p-3">
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("lobbyDirect")}</p>
              <Link
                href={guest ? "/auth?mode=signup" : "/create"}
                className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12.5px] font-medium text-background"
              >
                <Plus className="size-3.5" />
                {guest ? ts("makeAccount") : ts("newOffice")}
              </Link>
            </div>
          </nav>
          <PresenceDock floorHref={lobbyPath} place={tl("title")} />
        </>
      }
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
        <IconButton
          label={ts("back")}
          size="sm"
          className="md:hidden"
          onClick={() => router.push(lobbyPath)}
          icon={<ArrowLeft className="rtl:rotate-180" />}
        />
        <span className="flex min-w-0 items-center gap-1 text-[15px] font-semibold text-foreground">
          <Hash className="size-4 shrink-0 text-muted-foreground" />
          {ts("lobbyChannel")}
        </span>
        <span className="ms-auto flex h-8 items-center gap-2 rounded-full border border-border px-1 pe-2.5 [--face-ring:var(--ui-card)]">
          <FaceStack seeds={everyone.map((one) => one.id)} size={22} max={3} />
          <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground">{Math.max(everyone.length, 1)}</span>
        </span>
      </header>

      <Conversation
        lines={state.messages}
        me={user.id}
        more={false}
        intro={
          <ConversationIntro
            mark={
              <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <MessagesSquare className="size-7" />
              </span>
            }
            title={t("lobbyIntroTitle")}
            body={t("lobbyIntro")}
            actions={
              state.messages.length === 0 && (
                <Chip solid icon={<Hand />} onClick={() => roomChat.say({ id: user.id, name: user.displayName }, t("starterHello"))}>
                  {t("sayHello")}
                </Chip>
              )
            }
          />
        }
      />

      <Composer
        placeholder={t("say", { channel: `#${ts("lobbyChannel")}` })}
        onSend={(text) => roomChat.say({ id: user.id, name: user.displayName }, text)}
        attachNote={t("attachmentsLobby")}
        note={state.slowDown ? t("slowDown") : null}
        maxLength={500}
      />
    </ShellView>
  );
}

/** Who is in the lobby right now, and a way to bring someone. */
export function LobbyPeopleView() {
  const tl = useTranslations("lobby");
  const ts = useTranslations("shell");
  const tr = useTranslations("room");
  const { user } = useAuth();
  const everyone = useFloor();
  const [copied, setCopied] = useState(false);
  const shareLobby = async () => {
    const result = await shareLink(shareUrl(lobbyPath), tl("title"), tr("inviteText", { room: tl("title") }));
    if (result !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const here = [...everyone.filter((one) => one.id === user?.id), ...everyone.filter((one) => one.id !== user?.id)];

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{ts("hereNow")}</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{tl("peopleSubtitle")}</p>
          </div>
          {here.length > 1 && <Button
            size="md"
            className="h-10 gap-2 px-4 text-[13px]"
            onClick={shareLobby}
          >
            {copied ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            {copied ? tr("linkCopied") : tr("invite")}
          </Button>}
        </header>

        {here.length <= 1 && (
          <Empty
            className="mt-8"
            art={
              <span className="flex items-center [--face-ring:var(--ui-card)]">
                {user && <Face seed={user.id} size={44} presence="available" />}
                {[0, 1].map((one) => (
                  <span
                    key={one}
                    className="-ms-2.5 flex size-11 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-card text-faint"
                  >
                    <UserPlus className="size-4" />
                  </span>
                ))}
              </span>
            }
            title={tr("aloneTitle")}
            body={tr("aloneBody")}
            actions={
              <Chip solid icon={copied ? <Check /> : <UserPlus />} onClick={shareLobby}>
                {copied ? tr("linkCopied") : tr("inviteSomeone")}
              </Chip>
            }
          />
        )}
        {here.length > 1 && (
          <ul className="mt-8 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {here.map((one) => (
              <li key={one.id}>
                <PersonPill
                  id={one.id}
                  name={one.id === user?.id ? tr("you", { name: one.name }) : one.name}
                  detail={ts("onFloorShort")}
                  presence={one.status}
                  className="w-full bg-background [--face-ring:var(--ui-background)]"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
