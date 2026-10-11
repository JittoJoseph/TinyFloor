"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { VideoOff } from "@/components/ui/icons";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { cn } from "@/lib/utils";

/**
 * Said for a moment when your camera turned itself off after a quiet stretch
 * (docs/24): what happened and the one press that brings it back. Then the
 * camera is simply off, the way it rests anyway.
 */
export function CameraRested({ className }: { className?: string }) {
  const t = useTranslations("controls");
  const { cameraRested } = useCall();
  return (
    <AnimatePresence>
      {cameraRested && (
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
          <VideoOff className="size-3.5 shrink-0 text-faint" aria-hidden />
          <span className="whitespace-nowrap">{t("cameraRested")}</span>
          <button
            type="button"
            onClick={() => callManager.setCamera(true)}
            className="shrink-0 cursor-pointer font-medium text-foreground underline-offset-2 hover:underline"
          >
            {t("cameraOn")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
