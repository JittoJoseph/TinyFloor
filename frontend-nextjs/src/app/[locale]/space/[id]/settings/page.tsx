"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/components/space/SpaceShell";
import { SpaceSettings } from "@/components/space/SpaceSettings";

/** Rename the space, hand it over, or close it down. */
export default function SpaceSettingsPage() {
  const { user } = useAuth();
  const { workspace, members, refresh, onGone } = useSpace();
  if (!user) return null;
  return (
    <SpaceSettings workspace={workspace} members={members} currentUserId={user.id} onChanged={refresh} onGone={onGone} />
  );
}
