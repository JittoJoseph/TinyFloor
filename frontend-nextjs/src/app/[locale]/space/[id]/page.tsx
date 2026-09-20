"use client";

import { useSpace } from "@/components/space/SpaceShell";
import { RoomsPanel } from "@/components/workspace/RoomsPanel";

/** The rooms in this space, and the way into each of them. */
export default function SpaceRoomsPage() {
  const { workspace, rooms, refresh } = useSpace();
  const manages = workspace.role === "owner" || workspace.role === "admin";
  return <RoomsPanel workspaceId={workspace.id} rooms={rooms} manages={manages} onChanged={refresh} />;
}
