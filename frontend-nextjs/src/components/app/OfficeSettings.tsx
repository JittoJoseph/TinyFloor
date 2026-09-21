"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Dialog } from "@/components/ui/Dialog";
import { Face } from "@/components/ui/Face";
import { Button } from "@/components/motion/button/base";
import { useOffice } from "./OfficeShell";

/** The office's own settings: its name, its seats, and leaving or closing it. */
export function OfficeSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("office.settings");
  const tc = useTranslations("common");
  const tPlans = useTranslations("office.plans");
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

  const close = () => {
    setConfirming(false);
    setError(null);
    setName(office.name);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={t("title")} closeLabel={tc("close")}>
      <div className="space-y-5 pb-3">
        <div className="flex items-center gap-3">
          <Face seed={office.id} size={48} square />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-foreground">{office.name}</p>
            <p className="text-[12.5px] text-muted-foreground">
              {t("plan", {
                plan: tPlans.has(office.plan as "free") ? tPlans(office.plan as "free") : office.plan,
                used: office.members,
                seats: office.seats,
              })}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="office-name" className="mb-1.5 block text-[12px] font-medium text-muted-foreground">
            {t("name")}
          </label>
          <div className="flex gap-2">
            <input
              id="office-name"
              value={name}
              maxLength={64}
              disabled={!admin || busy}
              onChange={(event) => setName(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-[16px] sm:text-[14px] text-foreground outline-none transition-colors focus:border-border-strong disabled:opacity-60"
            />
            {admin && name.trim() && name.trim() !== office.name && (
              <Button
                size="md"
                className="h-10 px-4 text-[13px]"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await api.renameOffice(office.id, name.trim());
                    await refresh();
                  })
                }
              >
                {tc("save")}
              </Button>
            )}
          </div>
        </div>

        <p className="rounded-xl bg-muted px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground">{t("seatsNote")}</p>

        {error && <p className="text-[12.5px] text-destructive">{error}</p>}

        <div className="border-t border-border pt-4">
          <p className="mb-2 text-[12px] font-medium text-muted-foreground">{t("danger")}</p>
          {owner ? (
            confirming ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-3">
                <p className="text-[13px] leading-relaxed text-foreground">{t("closeSure")}</p>
                <div className="mt-3 flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setConfirming(false)}>
                  {tc("cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  className="h-9 bg-destructive px-4 text-white hover:bg-destructive/90"
                  onClick={() =>
                    run(async () => {
                      await api.closeOffice(office.id);
                      router.replace("/dashboard");
                    })
                  }
                >
                  {t("closeIt")}
                </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="cursor-pointer text-[13px] font-medium text-destructive hover:underline"
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
              className="cursor-pointer text-[13px] font-medium text-destructive hover:underline"
            >
              {t("leave")}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
