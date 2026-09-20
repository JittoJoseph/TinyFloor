"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { label, quietLabel } from "@/components/room/ui";
import { useOffice } from "./OfficeShell";

/** The office's own settings. What a microphone does lives on the floor, with the microphone. */
export function OfficeSettings({ onClose }: { onClose: () => void }) {
  const t = useTranslations("office.settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const { user } = useAuth();
  const { office, refresh } = useOffice();
  const [name, setName] = useState(office.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const admin = office.role === "admin";
  const owner = user?.id === office.owner;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label={tc("close")} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-[#fbfbf9] border border-black/[0.07] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
        <header className="flex items-center justify-between ps-5 pe-2.5 py-3 border-b border-black/[0.06]">
          <h2 className={`${label} text-[var(--color-braun-text)]`}>{t("title")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-colors duration-150"
          >
            <X className="w-4 h-4 opacity-60" />
          </button>
        </header>

        <div className="p-5 space-y-5">
          <div>
            <label htmlFor="office-name" className={`${quietLabel} block mb-1.5`}>
              {t("name")}
            </label>
            <div className="flex gap-2">
              <input
                id="office-name"
                value={name}
                disabled={!admin || busy}
                onChange={(event) => setName(event.target.value)}
                className="flex-1 h-10 px-3.5 rounded-xl bg-white border border-black/[0.08] font-body text-sm outline-none focus:border-black/20 transition-colors disabled:opacity-60"
              />
              {admin && (
                <button
                  type="button"
                  disabled={busy || !name.trim() || name === office.name}
                  onClick={() =>
                    run(async () => {
                      await api.renameOffice(office.id, name.trim());
                      await refresh();
                    })
                  }
                  className="cursor-pointer h-10 px-4 rounded-full bg-[var(--color-braun-text)] text-white font-body text-[13px] font-semibold disabled:opacity-40"
                >
                  {tc("save")}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-braun-text)]/[0.04] px-4 py-3">
            <p className={`${label} text-[var(--color-braun-text)]`}>
              {t("seats", { used: office.members, seats: office.seats })}
            </p>
            <p className={quietLabel}>{t("seatsNote")}</p>
          </div>

          {error && <p className="font-body text-[12px] text-[var(--color-braun-orange)]">{error}</p>}

          <div className="pt-1 border-t border-black/[0.06]">
            {owner ? (
              confirming ? (
                <div className="flex items-center gap-2 pt-3">
                  <p className={`${quietLabel} me-auto`}>{t("closeSure")}</p>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="cursor-pointer h-9 px-3 rounded-full font-body text-[13px] font-semibold opacity-60"
                  >
                    {tc("cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await api.closeOffice(office.id);
                        router.replace("/dashboard");
                      })
                    }
                    className="cursor-pointer h-9 px-4 rounded-full bg-[var(--color-braun-orange)] text-white font-body text-[13px] font-semibold"
                  >
                    {t("closeIt")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="cursor-pointer mt-3 font-body text-[13px] font-semibold text-[var(--color-braun-orange)]"
                >
                  {t("close")}
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api.removeMember(office.id, user!.id);
                    router.replace("/dashboard");
                  })
                }
                className="cursor-pointer mt-3 font-body text-[13px] font-semibold text-[var(--color-braun-orange)]"
              >
                {t("leave")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
