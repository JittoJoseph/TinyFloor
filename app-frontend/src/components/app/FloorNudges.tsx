"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslations } from "next-intl";
import { isDm } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { AnimatedToastStack, useAnimatedToastStack } from "@/components/motion/animated-toast-stack";
import { Face } from "@/components/ui/Face";
import { usePrefs } from "@/lib/prefs";
import { TEAMMATE_ARRIVED_EVENT, WAVED_AT_YOU_EVENT, waveAt } from "@/lib/floor";

/**
 * What's worth a glance while you're on the floor, for a few seconds each: a
 * message you haven't seen, with the way to it, and a teammate walking in or
 * waving at you, with a wave to send back (docs/product.md). One quiet stack, and one
 * setting turns it off.
 */
export function FloorNudges({ chatPath }: { chatPath: (channel: string) => string }) {
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
      const body = message.body || (message.files?.length ? `📎 ${message.files.map((file) => file.name).join(", ")}` : "");
      showToast({
        title: where ? `${message.authorName} · ${where}` : message.authorName,
        description: <span data-ph-mask>{body.length > 140 ? `${body.slice(0, 140)}…` : body}</span>,
        icon: <Face seed={message.author} size={32} />,
        action: { label: t("reply"), onClick: () => open(message.channel) },
      });
    });
  }, [showToast, t, nudges]);

  // A teammate walked in, or waved at you: one tap waves (back), and the toast
  // goes. One toast a person: their wave replaces their arrival.
  const hellos = useRef(new Map<string, string>());
  useEffect(() => {
    if (!nudges) return;
    const hello = (title: (name: string) => string, label: string) => (event: Event) => {
      const { id, name } = (event as CustomEvent<{ id: string; name: string }>).detail;
      const before = hellos.current.get(id);
      if (before) dismissToast(before);
      const shown = showToast({
        title: title(name),
        icon: <Face seed={id} size={32} />,
        duration: 6000,
        action: {
          label,
          onClick: (toast) => {
            waveAt(id);
            dismissToast(toast.id);
          },
        },
      });
      hellos.current.set(id, shown);
    };
    const arrived = hello((name) => t("arrived", { name }), t("wave"));
    const waved = hello((name) => t("waved", { name }), t("waveBack"));
    window.addEventListener(TEAMMATE_ARRIVED_EVENT, arrived);
    window.addEventListener(WAVED_AT_YOU_EVENT, waved);
    return () => {
      window.removeEventListener(TEAMMATE_ARRIVED_EVENT, arrived);
      window.removeEventListener(WAVED_AT_YOU_EVENT, waved);
    };
  }, [showToast, dismissToast, t, nudges]);

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
