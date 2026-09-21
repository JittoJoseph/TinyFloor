"use client";

import { useTranslations } from "next-intl";
import { Phone, Video, X, Check } from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import CallCards from "./CallCards";
import { RoomIconButton, surface, label, quietLabel } from "./room/ui";

/** The ring, the wait and the "that didn't work", all in the same language. */
export default function CallOverlay() {
  const t = useTranslations("call");
  const { incoming, outgoing, error } = useCall();

  return (
    <>
      <CallCards />

      {incoming && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-card rounded-3xl shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] border border-border p-7 w-[min(20rem,100%)] text-center">
            <span className="w-16 h-16 rounded-full bg-foreground/[0.06] text-foreground flex items-center justify-center mx-auto mb-4 animate-pulse">
              {incoming.video ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </span>
            <h2 className="text-xl font-semibold text-foreground truncate">
              {incoming.name}
            </h2>
            <p className={`${quietLabel} mt-1 mb-6`}>
              {incoming.video ? t("incomingVideo") : t("incomingAudio")}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => callManager.decline()}
                className={`cursor-pointer flex-1 h-11 rounded-full bg-card border border-border text-foreground hover:bg-muted shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 ${label}`}
              >
                <X className="w-4 h-4" />
                {t("decline")}
              </button>
              <button
                type="button"
                onClick={() => callManager.accept()}
                className={`cursor-pointer flex-1 h-11 rounded-full bg-foreground text-white hover:bg-foreground/90 shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 ${label}`}
              >
                <Check className="w-4 h-4" />
                {t("accept")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute end-3 sm:end-5 bottom-20 sm:bottom-24 z-40 flex flex-col items-end gap-2 pointer-events-none">
        {error && (
          <button
            type="button"
            onClick={() => callManager.clearError()}
            className="cursor-pointer pointer-events-auto max-w-[16rem] text-start rounded-2xl bg-brand/10 border border-brand/20 text-brand px-4 py-2.5 text-[12px] font-semibold"
          >
            {t(`errors.${error}`)}
          </button>
        )}

        {outgoing && (
          <div className={`${surface} pointer-events-auto rounded-full ps-2 pe-2 py-2 flex items-center gap-2.5`}>
            <span className="w-9 h-9 rounded-full bg-foreground/[0.06] flex items-center justify-center font-semibold text-sm text-foreground animate-pulse shrink-0">
              {outgoing.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 max-w-[9rem] pe-1">
              <span className={`block ${label} text-foreground truncate`}>{outgoing.name}</span>
              <span className={`block ${quietLabel}`}>{t("calling")}</span>
            </span>
            <RoomIconButton
              onClick={() => callManager.cancel()}
              tone="danger"
              title={t("cancel")}
              icon={<X className="w-4 h-4" />}
            />
          </div>
        )}
      </div>
    </>
  );
}
