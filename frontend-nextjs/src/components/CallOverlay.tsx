"use client";

import { useTranslations } from "next-intl";
import { Phone, X } from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import CallCards from "./CallCards";
import { Face } from "@/components/ui/Face";
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
            <span className="relative mx-auto mb-4 flex size-16 items-center justify-center [--face-ring:var(--ui-card)]">
              <span className="absolute inset-0 animate-ping rounded-full bg-ok/25" />
              <Face seed={incoming.id} size={64} />
              <span className="absolute -bottom-0.5 -end-0.5 flex size-6 items-center justify-center rounded-full bg-ok text-white ring-2 ring-card">
                <Phone className="size-3" strokeWidth={2.5} />
              </span>
            </span>
            <h2 className="text-xl font-semibold text-foreground truncate">
              {incoming.name}
            </h2>
            <p className={`${quietLabel} mt-1 mb-6`}>{t("incoming")}</p>

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
                className={`cursor-pointer flex-1 h-11 rounded-full bg-ok text-white hover:bg-ok/90 shadow-sm transition-colors duration-150 flex items-center justify-center gap-2 ${label}`}
              >
                <Phone className="w-4 h-4" />
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
            <span className="relative flex size-9 shrink-0 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-foreground/10" />
              <Face seed={outgoing.id} size={36} />
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
