"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSpace } from "@/components/space/SpaceShell";
import { MembersPanel } from "@/components/workspace/MembersPanel";

/** Who is in this space, and who has been invited. */
export default function SpacePeoplePage() {
  const { user } = useAuth();
  const { workspace, members, invites, refresh, onGone } = useSpace();
  if (!user) return null;
  return (
    <MembersPanel
      workspace={workspace}
      members={members}
      invites={invites}
      currentUserId={user.id}
      onChanged={refresh}
      onLeft={onGone}
    />
  );
}
