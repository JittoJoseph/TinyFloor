"use client";

import { useTranslations } from "next-intl";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import CallCards from "./CallCards";
import { CallRing } from "./CallRing";

/** Everything about a call over the floor: who is on it, the ring on both ends, and the "that didn't work". */
export default function CallOverlay() {
  const t = useTranslations("call");
  const { error } = useCall();

  return (
    <>
      <CallCards />
      <CallRing />

      {error && (
        <div className="pointer-events-none absolute bottom-20 end-3 z-40 flex flex-col items-end gap-2 sm:bottom-24 sm:end-5">
          <button
            type="button"
            onClick={() => callManager.clearError()}
            className="pointer-events-auto max-w-[16rem] cursor-pointer rounded-2xl border border-brand/20 bg-brand/10 px-4 py-2.5 text-start text-[12px] font-semibold text-brand"
          >
            {t(`errors.${error}`)}
          </button>
        </div>
      )}
    </>
  );
}
