"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Invite, type Member, type RoomSummary, type Workspace, type WorkspaceSummary } from "@/lib/api";
import { spacePath } from "@/lib/links";
import { Badge } from "@/components/workspace/ui";
import { AppHeader } from "./AppHeader";

interface SpaceData {
  workspace: Workspace;
  rooms: RoomSummary[];
  members: Member[];
  invites: Invite[];
  /** Everything again from the server, after a change. */
  refresh: () => Promise<void>;
  /** After leaving or deleting: back to wherever makes sense. */
  onGone: () => void;
}

const SpaceContext = createContext<SpaceData | null>(null);

/** The space this part of the app is about. Only used under a SpaceShell. */
export function useSpace(): SpaceData {
  const space = useContext(SpaceContext);
  if (!space) throw new Error("useSpace outside a space page");
  return space;
}

/**
 * One space, with its own header and tabs. Rooms, people and settings are
 * separate pages under it rather than one long dashboard.
 */
export function SpaceShell({ workspaceId, children }: { workspaceId: string; children: React.ReactNode }) {
  const t = useTranslations("workspace");
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [spaces, setSpaces] = useState<WorkspaceSummary[] | null>(null);
  const [data, setData] = useState<Omit<SpaceData, "refresh" | "onGone"> | null>(null);
  const [gone, setGone] = useState(false);

  const signedIn = !isLoading && !!user && !user.guest;

  const load = useCallback(async () => {
    const [{ workspaces }, overview] = await Promise.all([api.me(), api.overview(workspaceId)]);
    setSpaces(workspaces);
    setData(overview);
  }, [workspaceId]);

  useEffect(() => {
    if (isLoading) return;
    if (!signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: spacePath(workspaceId) })}`);
      return;
    }
    let cancelled = false;
    Promise.all([api.me(), api.overview(workspaceId)]).then(
      ([{ workspaces }, overview]) => {
        if (cancelled) return;
        setSpaces(workspaces);
        setData(overview);
      },
      () => !cancelled && setGone(true),
    );
    return () => {
      cancelled = true;
    };
  }, [isLoading, signedIn, load, router, workspaceId]);

  // Headcounts go stale while the tab is in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  useEffect(() => {
    if (gone) router.replace("/dashboard");
  }, [gone, router]);

  const tabs = [
    { href: spacePath(workspaceId), label: t("tabs.rooms") },
    { href: `${spacePath(workspaceId)}/people`, label: t("tabs.people") },
    { href: `${spacePath(workspaceId)}/settings`, label: t("tabs.settings") },
  ];

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)]">
      <AppHeader />

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {!data || !user ? (
          <div className="space-y-4">
            <div className="h-20 rounded-[1.5rem] bg-black/[0.04] animate-pulse" />
            <div className="h-64 rounded-[1.5rem] bg-black/[0.04] animate-pulse" />
          </div>
        ) : (
          <SpaceContext.Provider
            value={{
              ...data,
              refresh: load,
              onGone: () => router.replace("/dashboard"),
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                {spaces && spaces.length > 1 ? (
                  <div className="relative inline-flex items-center max-w-full">
                    <select
                      aria-label={t("switchWorkspace")}
                      value={workspaceId}
                      onChange={(event) => router.push(spacePath(event.target.value))}
                      className="cursor-pointer appearance-none bg-transparent pe-7 font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)] outline-none truncate max-w-full"
                    >
                      {spaces.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute end-0 w-5 h-5 text-[var(--color-braun-text)] opacity-50" />
                  </div>
                ) : (
                  <h1 className="font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)] truncate">
                    {data.workspace.name}
                  </h1>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge tone="accent">{t(`plans.${planKey(data.workspace.plan)}`)}</Badge>
                  <Badge>{t(`roles.${data.workspace.role}`)}</Badge>
                  {inside(data.rooms) > 0 && (
                    <Badge tone="live">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t("peopleInside", { count: inside(data.rooms) })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <nav aria-label={t("tabs.label")} className="flex items-center gap-1 mb-4 border-b border-black/8">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    aria-current={active ? "page" : undefined}
                    className={`cursor-pointer -mb-px px-3.5 py-2.5 font-body text-[14px] border-b-2 transition-[color,border-color] ${
                      active
                        ? "border-[var(--color-braun-text)] text-[var(--color-braun-text)] font-semibold"
                        : "border-transparent text-[var(--color-braun-text)] opacity-55 hover:opacity-90"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>

            {children}
          </SpaceContext.Provider>
        )}
      </main>
    </div>
  );
}

const inside = (rooms: RoomSummary[]) => rooms.reduce((sum, room) => sum + room.people, 0);

function planKey(plan: string): "free" | "team10" | "team25" | "team50" {
  return plan === "team10" || plan === "team25" || plan === "team50" ? plan : "free";
}
