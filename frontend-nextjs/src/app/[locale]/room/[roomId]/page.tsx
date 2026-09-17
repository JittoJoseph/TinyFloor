"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type RoomDetails } from "@/lib/api";
import { roomPath } from "@/lib/links";
import { EntryShell, primaryButtonClass } from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { RoomView } from "@/components/room/RoomView";

/** A workspace room. Members walk straight in; everyone else is sent to sign in. */
export default function RoomPage() {
  const t = useTranslations("room");
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { user, isLoading } = useAuth();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: roomPath(roomId) })}`);
      return;
    }
    let cancelled = false;
    api
      .room(roomId)
      .then(({ room: found }) => !cancelled && setRoom(found))
      .catch((error) => {
        if (!cancelled && error instanceof ApiError && (error.status === 404 || error.status === 403)) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoading, user, roomId, router]);

  if (missing) {
    return (
      <EntryShell backHref="/dashboard" backLabel={t("ended.back")} preview={<EntryPreview occupants={[]} />}>
        <div className="entry-rise">
          <span className="inline-flex w-11 h-11 rounded-xl bg-red-50 items-center justify-center mb-5">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </span>
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-2">
            {t("ended.notFoundTitle")}
          </h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">{t("ended.notFound")}</p>
          <Link href="/dashboard" className={primaryButtonClass}>
            {t("ended.back")}
          </Link>
        </div>
      </EntryShell>
    );
  }

  if (!user || user.guest || !room) return null;

  return (
    <RoomView
      title={room.name}
      subtitle={room.workspaceName}
      user={user}
      ticketFor={() => api.roomTicket(roomId)}
      sharePath={roomPath(roomId)}
      leaveHref="/dashboard"
    />
  );
}
