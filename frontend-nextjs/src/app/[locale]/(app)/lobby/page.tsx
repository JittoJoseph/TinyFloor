"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { lobbyPath } from "@/lib/links";
import { WalkIn } from "@/components/entry/WalkIn";
import { RoomView } from "@/components/room/RoomView";

/** The free public lobby: anyone walks in, as a guest or with their account. */
export default function LobbyPage() {
  const t = useTranslations("lobby");
  const { user } = useAuth();
  const [inside, setInside] = useState(false);

  if (inside && user) {
    return (
      <div className="fixed inset-0">
        <RoomView
          title={t("title")}
          user={user}
          ticketFor={api.lobbyTicket}
          sharePath={lobbyPath}
          leaveHref={user.guest ? "/" : "/dashboard"}
        />
      </div>
    );
  }

  return (
    <WalkIn
      eyebrow={t("eyebrow")}
      title={t("title")}
      subtitle={t("subtitle")}
      sharePath={lobbyPath}
      onReady={() => setInside(true)}
    />
  );
}
