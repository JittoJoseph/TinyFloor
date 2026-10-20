"use client";

import { useEffect, useEffectEvent } from "react";
import { useTranslations } from "next-intl";
import { isDm } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { useCall } from "@/lib/useCall";
import { notify, setBadge, useNotifyPermission } from "@/lib/notify";
import { onOpenFromPush, startPush, stopPush } from "@/lib/push";
import { usePrefs } from "@/lib/prefs";
import { WAVED_AT_YOU_EVENT } from "@/lib/floor";

/**
 * What reaches you in another window (lib/notify.ts): a direct message, a
 * mention, a call or an ask into a meeting, a wave. Clicking one brings the
 * office back, at the conversation it came from. Once TinyFloor is closed,
 * direct messages and mentions still come, as pushes. Nothing else: someone walking
 * in, or a busy channel, is for when you're looking. The installed app's icon
 * counts what's waiting, as the tab's title does.
 */
export function DesktopAlerts({ chatPath, waiting }: { chatPath: (channel: string) => string; waiting: number }) {
  const tShell = useTranslations("shell");
  const tCall = useTranslations("call");
  const tMeetings = useTranslations("meetings");
  const router = useRouter();
  const { incoming, invite } = useCall();
  // The path changes with every render of the shell; the subscription should not.
  const open = useEffectEvent((channel: string) => router.push(chatPath(channel)));

  useEffect(
    () =>
      chat.onIncoming((message) => {
        const dm = isDm(message.channel);
        if (!dm && !message.mentions?.includes(chat.getSnapshot().me)) return;
        const body = message.body || message.files?.map((file) => `📎 ${file.name}`).join(", ") || "";
        notify({
          title: dm ? message.authorName : `${message.authorName} · #${message.channel}`,
          body: body.length > 160 ? `${body.slice(0, 160)}…` : body,
          tag: `chat:${message.channel}`,
          onClick: () => open(message.channel),
        });
      }),
    [],
  );

  // A call rings until it's answered or over, and so does its notification.
  useEffect(() => {
    if (!incoming) return;
    return notify({ title: incoming.name, body: tCall("incoming"), tag: `call:${incoming.id}`, sticky: true });
  }, [incoming, tCall]);

  useEffect(() => {
    if (!invite) return;
    return notify({
      title: invite.fromName,
      body: invite.name ? tMeetings("invitedTo", { name: invite.name }) : tMeetings("invited"),
      tag: `meeting:${invite.meeting}`,
      sticky: true,
    });
  }, [invite, tMeetings]);

  useEffect(() => {
    const waved = (event: Event) => {
      const { id, name } = (event as CustomEvent<{ id: string; name: string }>).detail;
      notify({ title: tShell("waved", { name }), tag: `wave:${id}` });
    };
    window.addEventListener(WAVED_AT_YOU_EVENT, waved);
    return () => window.removeEventListener(WAVED_AT_YOU_EVENT, waved);
  }, [tShell]);

  // While closed, the chat pushes instead (lib/push.ts): this browser is
  // subscribed while notifications are allowed and on, and not otherwise.
  const permission = useNotifyPermission();
  const { desktopNotifications } = usePrefs();
  useEffect(() => {
    if (permission !== "granted") return;
    void (desktopNotifications ? startPush() : stopPush());
  }, [permission, desktopNotifications]);
  const go = useEffectEvent((path: string) => router.push(path));
  useEffect(() => onOpenFromPush(go), []);

  useEffect(() => {
    setBadge(waiting);
  }, [waiting]);
  useEffect(() => () => setBadge(0), []);

  return null;
}
