"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { MicOff } from "@/components/ui/icons";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { cn } from "@/lib/utils";

/**
 * Talking with the microphone off, on a call or in a meeting: says so, above
 * the call's keys, with the way to switch it on. Heard only on this device;
 * nothing is sent while the microphone is off.
 */
export function MicMutedHint({ className }: { className?: string }) {
  const t = useTranslations("controls");
  const { talkingMuted } = useCall();
  return (
    <AnimatePresence>
      {talkingMuted && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] text-muted-foreground shadow-float",
            className,
          )}
        >
          <MicOff className="size-3.5 shrink-0 text-brand" aria-hidden />
          <span className="whitespace-nowrap">{t("talkingMuted")}</span>
          <button
            type="button"
            onClick={() => callManager.setMic(true)}
            className="shrink-0 cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          >
            {t("unmuteShort")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
