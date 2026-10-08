"use client";

import { useEffect, useEffectEvent } from "react";
import { useTranslations } from "next-intl";
import { isDm } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { AnimatedToastStack, useAnimatedToastStack } from "@/components/motion/animated-toast-stack";
import { Face } from "@/components/ui/Face";
import { usePrefs } from "@/lib/prefs";

/**
 * A message you have not seen, shown over the floor for a few seconds with the
 * way to it, from the office's or the lobby's chat.
 */
export function ChatNudges({ chatPath }: { chatPath: (channel: string) => string }) {
  const t = useTranslations("shell");
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 5000, limit: 3 });
  const { nudges } = usePrefs();
  // The path changes with every render of the shell; the subscription should not.
  const open = useEffectEvent((channel: string) => router.push(chatPath(channel)));

  useEffect(() => {
    if (!nudges) return;
    return chat.onIncoming((message) => {
      const where = isDm(message.channel) ? "" : `#${message.channel}`;
      const body = message.image ? "📷" : message.body;
      showToast({
        title: where ? `${message.authorName} · ${where}` : message.authorName,
        description: body.length > 140 ? `${body.slice(0, 140)}…` : body,
        icon: <Face seed={message.author} size={32} />,
        action: { label: t("reply"), onClick: () => open(message.channel) },
      });
    });
  }, [showToast, t, nudges]);

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
