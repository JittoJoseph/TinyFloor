"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { lobbyPath, useSitePage } from "@/lib/links";
import { WalkIn } from "@/components/entry/WalkIn";
import { EntryDetail } from "@/components/entry/EntryShell";
import { LobbyMark as LobbyDoorMark } from "@/components/entry/DoorParts";
import { Introduce } from "@/components/entry/Introduce";
import { FaceStack } from "@/components/ui/Face";
import { Entering } from "./Entering";
import { withPostHog } from "@/lib/analytics";
import { earlyTicket, warmFloor } from "@/lib/floorWarmup";
import { takeHandedTicket } from "@/lib/handedTicket";

const loadLobbyInside = () => import("./LobbyInside");
// Someone this browser knows skips the door, and waits here only while that code arrives.
const LobbyInside = dynamic(loadLobbyInside, { loading: () => <Entering /> });

/**
 * The free public lobby's door, and past it the lobby itself (LobbyInside):
 * the same shell an office has, with one more place, about getting an office
 * of your own. The door is all its page needs to show; the rest arrives
 * while it's open.
 */
export function LobbyShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("lobby");
  const home = useSitePage();
  const { user, isLoading } = useAuth();
  const [door, setDoor] = useState<{ here: number; faces: Array<{ id: string; name: string }> } | null>(null);

  // Anyone with a session already has a name and a character, so the door is only for someone new;
  // a new account first says who it is (see Introduce below).
  const inside = !!user && (user.guest || user.introduced !== false);

  // The floor, and everything inside the lobby, load while the door is open; its ticket as soon as you're in.
  // A guest made at the door brings their ticket with them (handedTicket); anyone else asks.
  const [ticket] = useState(() =>
    earlyTicket(() => {
      const handed = takeHandedTicket();
      return handed ? Promise.resolve(handed) : api.lobbyTicket();
    }),
  );
  useEffect(() => {
    warmFloor();
    void loadLobbyInside().catch(() => {});
  }, []);
  useEffect(() => {
    if (inside) ticket.start();
  }, [inside, ticket]);

  // What's done here is the demo office's, not any team's.
  useEffect(() => {
    withPostHog((posthog) => posthog.register({ place: "lobby" }));
    return () => withPostHog((posthog) => posthog.unregister("place"));
  }, []);

  // Who is inside, for the door.
  useEffect(() => {
    if (inside) return;
    let cancelled = false;
    api.lobbyPeople().then(
      (found) => !cancelled && setDoor(found),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [inside]);

  // A new account says who it is at its first door.
  if (!isLoading && user && !user.guest && user.introduced === false) return <Introduce backHref={home} />;

  if (!inside || !user) {
    const walkIn = (
      <WalkIn
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
        sharePath={lobbyPath}
        onReady={() => {}}
        mark={<LobbyDoorMark />}
        detail={
          // Who's inside arrives a moment after the door: until then an empty chip
          // holds its place, so the door doesn't grow under someone reading it.
          !door ? (
            <span aria-hidden className="block h-8 w-44 rounded-full border border-border bg-background" />
          ) : (
            <EntryDetail
              lead={
                door.faces.length > 0 ? (
                  <FaceStack seeds={door.faces.map((one) => one.id)} size={22} max={4} />
                ) : (
                  <span className="flex size-[22px] items-center justify-center rounded-full bg-muted">
                    <span className="size-1.5 rounded-full bg-ok" />
                  </span>
                )
              }
            >
              {t("door", { here: door.here })}
            </EntryDetail>
          )
        }
      />
    );
    // The page is built with the door; someone this browser knows is let in instead of shown it.
    return (
      <>
        <div className={isLoading ? "when-new" : undefined}>{walkIn}</div>
        {isLoading && <Entering className="when-known" />}
      </>
    );
  }

  return (
    <LobbyInside user={user} ticketFor={ticket.ticketFor}>
      {children}
    </LobbyInside>
  );
}
