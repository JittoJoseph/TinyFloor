"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, Lock, Users } from "lucide-react";
import {
  EntryShell,
  primaryButtonClass,
} from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { IdentityFields, ErrorNote } from "@/components/entry/IdentityFields";
import { useIdentity, roomHref } from "@/components/entry/useIdentity";
import { apiClient } from "@/lib/api";

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  isPublic: boolean;
}

function JoinContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const shareCode = searchParams.get("code");
  const router = useRouter();
  const identity = useIdentity();

  const [password, setPassword] = useState("");
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        if (!shareCode && !roomId) throw new Error("No room specified");

        const found = shareCode
          ? await apiClient.getRoomByShareCode(shareCode)
          : await apiClient.getRoom(roomId as string);

        if (cancelled) return;
        setRoom({
          id: found.id,
          name: found.name,
          playerCount: found.playerCount || 0,
          maxPlayers: found.maxPlayers || 20,
          hasPassword: found.hasPassword || false,
          isPublic: found.isPublic ?? true,
        });
      } catch {
        if (!cancelled) setError("This room is not available any more.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [roomId, shareCode]);

  const walkIn = async () => {
    if (!room || !identity.name.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      if (room.playerCount >= room.maxPlayers) {
        setError("This room is full right now");
        setBusy(false);
        return;
      }

      if (room.hasPassword && !password) {
        setError("This room needs a password");
        setBusy(false);
        return;
      }

      const result = await apiClient.joinRoom(
        room.id,
        password || undefined,
        identity.name,
      );

      if (!result.success) {
        setError(result.message || "Could not join this room");
        setBusy(false);
        return;
      }

      await identity.remember();
      router.push(
        roomHref(room.id, identity.name, identity.character, result.userId),
      );
    } catch {
      setError("Could not join this room");
      setBusy(false);
    }
  };

  if (loading) {
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

  if (!room) {
    return (
      <EntryShell preview={<EntryPreview occupants={[]} />}>
        <div className="entry-rise">
          <span className="inline-flex w-11 h-11 rounded-xl bg-red-50 items-center justify-center mb-5">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </span>
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-2">
            That door does not open.
          </h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">
            {error}
          </p>
          <Link href="/rooms" className={primaryButtonClass}>
            Browse rooms
          </Link>
        </div>
      </EntryShell>
    );
  }

  const full = room.playerCount >= room.maxPlayers;

  return (
    <EntryShell
      preview={
        <EntryPreview
          occupants={[
            {
              character: identity.character,
              left: "50%",
              top: "80%",
              name: identity.name.trim() || "You",
              width: 44,
              running: identity.arriving,
            },
          ]}
          caption={
            <>
              <Users className="w-3 h-3 opacity-60" />
              {room.playerCount === 0
                ? "You will be first in"
                : `${room.playerCount} already inside`}
            </>
          }
        />
      }
    >
      <div className="entry-rise">
        <h1 className="flex items-start gap-2 font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-5 break-words">
          {!room.isPublic && (
            <Lock className="w-4 h-4 mt-2 shrink-0 opacity-40" />
          )}
          {room.name}
        </h1>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            walkIn();
          }}
        >
          <IdentityFields
            name={identity.name}
            onName={identity.setName}
            character={identity.character}
            onCharacter={identity.pickCharacter}
            password={password}
            onPassword={setPassword}
            needsPassword={room.hasPassword}
            autoFocus
          />

          {error && (
            <div className="mt-5">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <button
            type="submit"
            disabled={!identity.name.trim() || busy || full}
            className={`${primaryButtonClass} mt-5`}
          >
            {busy ? "Opening the door" : full ? "Room is full" : "Walk in"}
            {!busy && !full && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {!identity.isAuthenticated && (
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 text-center mt-5">
            Joining as a guest.{" "}
            <Link
              href="/auth"
              className="underline underline-offset-2 hover:opacity-100"
            >
              Sign in
            </Link>{" "}
            to keep your name and character.
          </p>
        )}
      </div>
    </EntryShell>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[var(--color-braun-bg)] flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin opacity-30" />
        </div>
      }
    >
      <JoinContent />
    </Suspense>
  );
}
