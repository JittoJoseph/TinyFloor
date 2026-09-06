"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, Lock } from "lucide-react";
import {
  EntryShell,
  Field,
  inputClass,
  primaryButtonClass,
} from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { IdentityFields, ErrorNote } from "@/components/entry/IdentityFields";
import { useIdentity, roomHref } from "@/components/entry/useIdentity";
import { apiClient } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

interface CreatedRoom {
  id: string;
  name: string;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const identity = useIdentity();

  const [roomName, setRoomName] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedRoom | null>(null);

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomName.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const room = await apiClient.createRoom({
        name: roomName.trim(),
        password: password.trim() || undefined,
      });
      setCreated({ id: room.id, name: room.name });
    } catch {
      setError("Could not create the room. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const walkIn = async () => {
    if (!created || !identity.name.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const result = await apiClient.joinRoom(
        created.id,
        password.trim() || undefined,
        identity.name,
      );

      if (!result.success) {
        setError(result.message || "Could not open the room");
        setBusy(false);
        return;
      }

      await identity.remember();
      router.push(
        roomHref(created.id, identity.name, identity.character, result.userId),
      );
    } catch {
      setError("Could not open the room");
      setBusy(false);
    }
  };

  if (created) {
    return (
      <EntryShell
        preview={
          <EntryPreview
            inviteLink={`${SITE_URL}/join?roomId=${created.id}`}
            occupants={[
              {
                character: identity.character,
                left: "50%",
                top: "79%",
                name: identity.name.trim() || "You",
                width: 44,
                running: identity.arriving,
              },
            ]}
          />
        }
      >
        <div className="entry-rise">
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-5 break-words">
            {created.name}
          </h1>

          <IdentityFields
            name={identity.name}
            onName={identity.setName}
            character={identity.character}
            onCharacter={identity.pickCharacter}
          />

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <button
            type="button"
            onClick={walkIn}
            disabled={!identity.name.trim() || busy}
            className={`${primaryButtonClass} mt-5`}
          >
            {busy ? "Opening the door" : "Walk in"}
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </EntryShell>
    );
  }

  return (
    <EntryShell
      preview={
        <EntryPreview
          occupants={[
            { character: "Alex", left: "40%", top: "79%", width: 38 },
            {
              character: "Bob",
              left: "62%",
              top: "79%",
              direction: "left",
              width: 38,
            },
          ]}
        />
      }
    >
      <div className="entry-rise">
        <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-5">
          Open a room.
        </h1>

        <form onSubmit={createRoom}>
          <Field label="Room name" htmlFor="room-name">
            <input
              id="room-name"
              type="text"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Design team, Studio, Friday hangout"
              className={inputClass}
              maxLength={50}
              autoFocus
            />
          </Field>

          <button
            type="button"
            onClick={() => setAdvanced(!advanced)}
            aria-expanded={advanced}
            aria-controls="advanced-options"
            className="cursor-pointer mt-3.5 inline-flex items-center gap-1.5 font-body text-[13px] font-medium text-[var(--color-braun-text)] opacity-50 hover:opacity-90 transition-opacity duration-200"
          >
            Advanced
            <ChevronDown
              aria-hidden="true"
              className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                advanced ? "rotate-180" : ""
              }`}
            />
          </button>

          {advanced && (
            <div id="advanced-options" className="entry-rise mt-3.5">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-35" />
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Add a password (optional)"
                  aria-label="Room password"
                  className={`${inputClass} pl-11`}
                  maxLength={40}
                />
              </div>
              <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 mt-2 px-1">
                Every room is listed in the directory. A password keeps the door
                shut to anyone without it.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <button
            type="submit"
            disabled={!roomName.trim() || busy}
            className={`${primaryButtonClass} mt-5`}
          >
            {busy ? "Setting it up" : "Create the room"}
            {!busy && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </EntryShell>
  );
}
