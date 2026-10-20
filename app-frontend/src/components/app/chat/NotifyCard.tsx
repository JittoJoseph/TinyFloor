"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "@/components/ui/icons";
import { askToNotify, useNotifyPermission } from "@/lib/notify";

const KEY = "tf-notify-card";

function dismissedBefore() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Asking for desktop notifications where they make sense: in Chat, once
 * there's someone to hear from, and until you answer either way. The browser's
 * own question comes only from the button; Settings keeps the same switch.
 */
export function NotifyCard() {
  const t = useTranslations("chat");
  const permission = useNotifyPermission();
  const [dismissed, setDismissed] = useState(dismissedBefore);
  if (permission !== "default" || dismissed) return null;

  const done = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // Private windows: asked again next time, no harm.
    }
  };
  return (
    <div className="mx-2 mb-2 shrink-0 rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <Bell className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground">{t("notifyTitle")}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{t("notifyBody")}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 ps-[38px]">
        <button
          type="button"
          onClick={async () => {
            await askToNotify();
            done();
          }}
          className="inline-flex h-7 cursor-pointer items-center rounded-full bg-foreground px-3 text-[12px] font-medium text-background transition-opacity hover:opacity-90"
        >
          {t("notifyOn")}
        </button>
        <button
          type="button"
          onClick={done}
          className="inline-flex h-7 cursor-pointer items-center rounded-full px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {t("notNow")}
        </button>
      </div>
    </div>
  );
}
