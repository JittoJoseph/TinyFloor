"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Settings } from "lucide-react";
import { api, type Member, type RoomSummary, type Workspace, type WorkspaceSummary } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge, Button, Card } from "./ui";
import { RoomsPanel } from "./RoomsPanel";
import { MembersPanel } from "./MembersPanel";
import { WorkspaceSettings } from "./WorkspaceSettings";

export function WorkspaceView({
  workspaceId,
  workspaces,
  onSelect,
  onChanged,
  onGone,
}: {
  workspaceId: string;
  workspaces: WorkspaceSummary[];
  onSelect: (id: string) => void;
  onChanged: () => void;
  onGone: () => void;
}) {
  const t = useTranslations("workspace");
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [details, roomList, memberList] = await Promise.all([
      api.workspace(workspaceId),
      api.rooms(workspaceId),
      api.members(workspaceId),
    ]);
    setWorkspace(details.workspace);
    setRooms(roomList.rooms);
    setMembers(memberList.members);
  }, [workspaceId]);

  useEffect(() => {
    refresh().catch(() => onGone());
  }, [refresh, onGone]);

  // Room headcounts are fetched when the dashboard opens and when you come back to the tab.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") api.rooms(workspaceId).then(({ rooms: next }) => setRooms(next), () => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [workspaceId]);

  if (!workspace || !rooms || !members || !user) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-[1.5rem] bg-black/[0.04] animate-pulse" />
        <div className="h-64 rounded-[1.5rem] bg-black/[0.04] animate-pulse" />
      </div>
    );
  }

  const manages = workspace.role === "owner" || workspace.role === "admin";
  const peopleInside = rooms.reduce((sum, room) => sum + room.people, 0);

  return (
    <div className="space-y-4">
      <Card className="!py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            {workspaces.length > 1 ? (
              <div className="relative inline-flex items-center max-w-full">
                <select
                  aria-label={t("switchWorkspace")}
                  value={workspace.id}
                  onChange={(event) => onSelect(event.target.value)}
                  className="cursor-pointer appearance-none bg-transparent pe-7 font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)] outline-none truncate max-w-full"
                >
                  {workspaces.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute end-0 w-5 h-5 text-[var(--color-braun-text)] opacity-50" />
              </div>
            ) : (
              <h1 className="font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)] truncate">
                {workspace.name}
              </h1>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge tone="accent">{t(`plans.${planKey(workspace.plan)}`)}</Badge>
              <Badge>{t("memberCount", { count: workspace.members, limit: workspace.memberLimit })}</Badge>
              <Badge>{t(`roles.${workspace.role}`)}</Badge>
              {peopleInside > 0 && (
                <Badge tone="live">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t("peopleInside", { count: peopleInside })}
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={() => setSettingsOpen(true)} className="self-start sm:self-auto">
            <Settings className="w-4 h-4" />
            {t("settings.button")}
          </Button>
        </div>
      </Card>

      <RoomsPanel workspaceId={workspace.id} rooms={rooms} manages={manages} onChanged={refresh} />

      <MembersPanel workspace={workspace} members={members} currentUserId={user.id} onChanged={refresh} onLeft={onGone} />

      <WorkspaceSettings
        open={settingsOpen}
        workspace={workspace}
        members={members}
        currentUserId={user.id}
        onClose={() => setSettingsOpen(false)}
        onRenamed={async () => {
          await refresh();
          onChanged();
        }}
        onGone={onGone}
      />
    </div>
  );
}

function planKey(plan: string): "free" | "team10" | "team25" | "team50" {
  return plan === "team10" || plan === "team25" || plan === "team50" ? plan : "free";
}
