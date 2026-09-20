"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { EntryShell, primaryButtonClass } from "./EntryShell";
import { EntryPreview } from "./EntryPreview";
import { WalkIn } from "./WalkIn";
import { RoomView } from "@/components/room/RoomView";

export interface GuestLinkPreview {
  officeName: string;
}

/**
 * A guest link into someone's room. The server looks the link up so its preview
 * carries the room's name; if that lookup timed out, it loads here.
 */
export function GuestLinkEntry({ token, initialPreview }: { token: string; initialPreview: GuestLinkPreview | null }) {
  const t = useTranslations("join");
  const { user } = useAuth();
  const [preview, setPreview] = useState(initialPreview);
  const [state, setState] = useState<"loading" | "ready" | "invalid">(initialPreview ? "ready" : "loading");
  const [inside, setInside] = useState(false);

  useEffect(() => {
    if (initialPreview) return;
    let cancelled = false;
    api
      .guestLinkPreview(token)
      .then(({ guestLink }) => {
        if (cancelled) return;
        setPreview(guestLink);
        setState("ready");
      })
      .catch(() => !cancelled && setState("invalid"));
    return () => {
      cancelled = true;
    };
  }, [initialPreview, token]);

  if (inside && user && preview) {
    return (
      <div className="fixed inset-0">
        <RoomView
          title={preview.officeName}
          user={user}
          ticketFor={() => api.guestLinkTicket(token)}
          leaveHref={user.guest ? "/" : "/dashboard"}
        />
      </div>
    );
  }

  if (state === "loading") {
    return (
      <EntryShell preview={<EntryPreview occupants={[]} />}>
        <div className="space-y-4">
          <div className="h-3 w-20 rounded-full bg-black/5 animate-pulse" />
          <div className="h-7 w-2/3 rounded-lg bg-black/5 animate-pulse" />
          <div className="h-13 w-full rounded-xl bg-black/5 animate-pulse" />
          <div className="h-24 w-full rounded-xl bg-black/5 animate-pulse" />
        </div>
      </EntryShell>
    );
  }

  if (state === "invalid" || !preview) {
    return (
      <EntryShell preview={<EntryPreview occupants={[]} />}>
        <div className="entry-rise">
          <span className="inline-flex w-11 h-11 rounded-xl bg-red-50 items-center justify-center mb-5">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </span>
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-2">
            {t("unavailableTitle")}
          </h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">{t("linkUnavailable")}</p>
          <Link href="/lobby" className={primaryButtonClass}>
            {t("visitLobby")}
          </Link>
        </div>
      </EntryShell>
    );
  }

  return (
    <WalkIn
      title={preview.officeName}
      subtitle={t("invitedAsGuest")}
      onReady={() => setInside(true)}
    />
  );
}
