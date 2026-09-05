"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Link2, Lock } from "lucide-react";
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
  shareCode?: string;
}

export default function CreateRoomPage() {
  const router = useRouter();
  const identity = useIdentity();

  const [roomName, setRoomName] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedRoom | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = created
    ? created.shareCode
      ? `${SITE_URL}/join?code=${created.shareCode}`
      : `${SITE_URL}/join?roomId=${created.id}`
    : "";

  const createRoom = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!roomName.trim() || busy) return;

    setBusy(true);
    setError("");

    try {
      const room = await apiClient.createRoom({
        name: roomName.trim(),
        isPublic,
        password: password.trim() || undefined,
      });
      setCreated({ id: room.id, name: room.name, shareCode: room.shareCode });
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

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copying is blocked here. Select the link instead.");
    }
  };

  const preview = created ? (
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
      caption={created.name}
    />
  ) : (
    <EntryPreview
      occupants={[
        { character: "Alex", left: "40%", top: "80%", width: 38 },
        {
          character: "Bob",
          left: "62%",
          top: "80%",
          direction: "left",
          width: 38,
        },
      ]}
      caption={roomName.trim() || "Your new room"}
    />
  );

  if (created) {
    return (
      <EntryShell preview={preview}>
        <div className="entry-rise">
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight text-[var(--color-braun-text)] mb-5">
            Now, who are you?
          </h1>

          <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-[#fbfbf9] p-1.5 mb-5">
            <span className="flex-1 min-w-0 px-2.5 py-1.5 font-body text-[12px] text-[var(--color-braun-text)] opacity-60 truncate">
              {inviteLink}
            </span>
            <button
              type="button"
              onClick={copyInvite}
              className="cursor-pointer shrink-0 inline-flex items-center gap-2 rounded-lg bg-white border border-black/10 px-3 py-2 font-body text-[12px] font-semibold text-[var(--color-braun-text)] shadow-sm hover:bg-[#f7f7f4] transition-colors duration-[120ms]"
            >
              <span className="relative inline-flex w-4 h-4 items-center justify-center">
                <Link2
                  className={`absolute w-4 h-4 transition-all duration-200 ease-out motion-reduce:transition-none ${
                    copied
                      ? "scale-50 opacity-0 blur-[2px]"
                      : "scale-100 opacity-100 blur-0"
                  }`}
                />
                <Check
                  className={`absolute w-4 h-4 text-emerald-600 transition-all duration-200 ease-out motion-reduce:transition-none ${
                    copied
                      ? "scale-100 opacity-100 blur-0"
                      : "scale-50 opacity-0 blur-[2px]"
                  }`}
                />
              </span>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <IdentityFields
            name={identity.name}
            onName={identity.setName}
            character={identity.character}
            onCharacter={identity.pickCharacter}
          />

          {error && (
            <div className="mt-5">
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
    <EntryShell preview={preview}>
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
            <div
              id="advanced-options"
              className="entry-rise mt-3.5 rounded-xl border border-black/8 bg-[#fbfbf9] p-3.5 space-y-3.5"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isPublic}
                  aria-label="Keep it private"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`cursor-pointer relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ${
                    !isPublic ? "bg-[var(--color-braun-text)]" : "bg-black/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      !isPublic ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="min-w-0">
                  <span className="block font-body text-[14px] font-semibold text-[var(--color-braun-text)]">
                    Keep it private
                  </span>
                  <span className="block font-body text-[12px] text-[var(--color-braun-text)] opacity-50 mt-0.5">
                    Hidden from the directory. Only your link opens it.
                  </span>
                </span>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-35" />
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Add a password (optional)"
                  aria-label="Room password"
                  className={`${inputClass} bg-white pl-11`}
                  maxLength={40}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-5">
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
