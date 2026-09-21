"use client";

import { RailIcons } from "@/components/app/railIcons";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { EntryShell } from "./EntryShell";
import { EntryProblem } from "./EntryProblem";
import { ActionLink } from "@/components/ui/Action";
import { EntryPreview } from "./EntryPreview";
import { WalkIn } from "./WalkIn";
import { RoomView } from "@/components/room/RoomView";
import { AppShell, Logo } from "@/components/app/AppShell";
import { YouMenu } from "@/components/app/YouMenu";
import { SettingsView } from "@/components/app/SettingsView";
import { PlaceProvider, type Place } from "@/components/app/place";
import { useSearchParams } from "next/navigation";

export interface GuestLinkPreview {
  officeName: string;
}

/**
 * A guest link into someone's room. The server looks the link up so its preview
 * carries the room's name; if that lookup timed out, it loads here.
 */
export function GuestLinkEntry({ token, initialPreview }: { token: string; initialPreview: GuestLinkPreview | null }) {
  const t = useTranslations("join");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const [preview, setPreview] = useState(initialPreview);
  const [state, setState] = useState<"loading" | "ready" | "invalid">(initialPreview ? "ready" : "loading");
  const [inside, setInside] = useState(false);
  const ts = useTranslations("shell");
  const pathname = usePathname();
  const onSettings = useSearchParams().get("view") === "settings";
  const settingsHref = `${pathname}?view=settings`;

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

  // A guest visits the floor only: an office's chat and people are its members'.
  if (inside && user && preview) {
    const place: Place = {
      kind: "visit",
      id: token,
      name: preview.officeName,
      role: "guest",
      people: [],
      paths: { floor: pathname, chat: () => pathname, people: pathname, settings: settingsHref },
      sharePath: pathname,
      officesOnly: () => {},
    };
    return (
      <PlaceProvider value={place}>
        <AppShell
          mark={<Logo size={40} />}
          destinations={[{ key: "floor", href: pathname, label: ts("floor"), icon: RailIcons.floor, active: !onSettings }]}
          settings={{ key: "settings", href: settingsHref, label: ts("settings"), icon: RailIcons.settings, active: onSettings }}
          you={<YouMenu onFloor settingsHref={settingsHref} />}
          floor={
            <RoomView
              title={preview.officeName}
              user={user}
              ticketFor={() => api.guestLinkTicket(token)}
              leaveHref={user.guest ? "/" : "/dashboard"}
              settingsHref={settingsHref}
            />
          }
        >
          {onSettings && <SettingsView />}
        </AppShell>
      </PlaceProvider>
    );
  }

  if (state === "loading") {
    return (
      <EntryShell preview={<EntryPreview occupants={[]} />}>
        <div className="space-y-4">
          <div className="h-3 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-2/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-13 w-full rounded-xl bg-muted animate-pulse" />
          <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />
        </div>
      </EntryShell>
    );
  }

  if (state === "invalid" || !preview) {
    return (
      <EntryShell preview={<EntryPreview occupants={[]} />}>
        <EntryProblem title={t("unavailableTitle")} body={t("linkUnavailable")}>
          <ActionLink href="/lobby">{t("visitLobby")}</ActionLink>
          <ActionLink href="/create" tone="secondary" icon={null}>
            {tc("createOffice")}
          </ActionLink>
        </EntryProblem>
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
