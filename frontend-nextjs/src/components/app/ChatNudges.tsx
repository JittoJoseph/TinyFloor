"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { isDm } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { roomChat } from "@/lib/roomChat";
import { officeChatPath } from "@/lib/links";
import { AnimatedToastStack, useAnimatedToastStack } from "@/components/motion/animated-toast-stack";
import { Face } from "@/components/ui/Face";

interface Nudge {
  author: string;
  authorName: string;
  body: string;
  /** Where the message is: "#general", or empty for a direct message. */
  where: string;
  href: string;
}

/**
 * A message you have not seen, shown over the floor for a few seconds with the
 * way to it. The office's chat nudges from its socket; the lobby's from the room.
 */
export function ChatNudges({ officeId, lobbyChatHref }: { officeId?: string; lobbyChatHref?: string }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 5000, limit: 3 });

  useEffect(() => {
    const show = (nudge: Nudge) =>
      showToast({
        title: nudge.where ? `${nudge.authorName} · ${nudge.where}` : nudge.authorName,
        description: nudge.body.length > 140 ? `${nudge.body.slice(0, 140)}…` : nudge.body,
        icon: <Face seed={nudge.author} size={32} />,
        action: { label: t("reply"), onClick: () => router.push(nudge.href) },
      });

    if (officeId) {
      return chat.onIncoming((message) =>
        show({
          author: message.author,
          authorName: message.authorName,
          body: message.image ? "📷" : message.body,
          where: isDm(message.channel) ? "" : `#${message.channel}`,
          href: officeChatPath(officeId, message.channel),
        }),
      );
    }
    if (lobbyChatHref) {
      return roomChat.onIncoming((message) =>
        show({ author: message.author, authorName: message.authorName, body: message.body, where: "", href: lobbyChatHref }),
      );
    }
  }, [officeId, lobbyChatHref, showToast, router, t]);

  return (
    <AnimatedToastStack
      toasts={toasts}
      onDismiss={dismissToast}
      position="top-right"
      placement="absolute"
      portal={false}
      className="!top-16 z-[55] w-[min(22rem,calc(100%-1.5rem))] ![right:0.75rem] sm:![right:1rem]"
      classNames={{ iconWrap: "bg-transparent p-0 size-8 rounded-full" }}
    />
  );
}
