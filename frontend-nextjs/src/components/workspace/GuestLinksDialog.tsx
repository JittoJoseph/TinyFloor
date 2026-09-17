"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { api, type GuestLink, type RoomSummary } from "@/lib/api";
import { guestLinkPath, shareUrl } from "@/lib/links";
import { Button, CopyField, Dialog, ErrorText, Label } from "./ui";
import { useErrorMessage } from "./useErrorMessage";

const LIFETIMES = ["1d", "7d", "30d"] as const;

/**
 * Links that let people without an account into one room. The link itself is
 * shown once, when made; revoking one removes anyone who came in with it.
 */
export function GuestLinksDialog({ room, onClose }: { room: RoomSummary | null; onClose: () => void }) {
  const t = useTranslations("workspace.guestLinks");
  const format = useFormatter();
  const explain = useErrorMessage();
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [lifetime, setLifetime] = useState<(typeof LIFETIMES)[number]>("7d");
  const [created, setCreated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!room) return;
    setCreated(null);
    setError("");
    api.guestLinks(room.id).then(({ guestLinks }) => setLinks(guestLinks), () => setLinks([]));
  }, [room]);

  const create = async () => {
    if (!room) return;
    setBusy(true);
    setError("");
    try {
      const { guestLink } = await api.createGuestLink(room.id, lifetime);
      setCreated(shareUrl(guestLinkPath(guestLink.token)));
      setLinks((current) => [guestLink, ...current]);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (link: GuestLink) => {
    if (!room) return;
    try {
      await api.revokeGuestLink(room.id, link.id);
      setLinks((current) => current.filter((item) => item.id !== link.id));
    } catch (err) {
      setError(explain(err));
    }
  };

  return (
    <Dialog open={room !== null} title={t("title", { room: room?.name ?? "" })} description={t("description")} onClose={onClose}>
      {created ? (
        <div className="space-y-3">
          <CopyField value={created} />
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-55">{t("onlyOnce")}</p>
          <Button onClick={() => setCreated(null)}>{t("another")}</Button>
        </div>
      ) : (
        <div>
          <Label>{t("expiresIn")}</Label>
          <div className="flex gap-2">
            {LIFETIMES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={lifetime === option}
                onClick={() => setLifetime(option)}
                className={`cursor-pointer flex-1 h-10 rounded-xl border font-body text-[13px] font-semibold transition-colors ${
                  lifetime === option
                    ? "border-[var(--color-braun-text)]/40 bg-white text-[var(--color-braun-text)] shadow-sm"
                    : "border-black/10 bg-[#fbfbf9] text-[var(--color-braun-text)]/55 hover:bg-white"
                }`}
              >
                {t(`lifetimes.${option}`)}
              </button>
            ))}
          </div>
          <Button variant="primary" busy={busy} onClick={create} className="w-full mt-4">
            {t("create")}
          </Button>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      {links.length > 0 && (
        <div className="mt-6">
          <Label>{t("active")}</Label>
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="font-body text-[13px] text-[var(--color-braun-text)] opacity-70">
                  {t("expires", { date: format.dateTime(new Date(link.expiresAt), { dateStyle: "medium" }) })}
                </span>
                <Button variant="ghost" className="h-8 px-3 text-red-600" onClick={() => revoke(link)}>
                  {t("revoke")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
