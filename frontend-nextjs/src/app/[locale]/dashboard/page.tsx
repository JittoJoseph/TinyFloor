"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type WorkspaceSummary } from "@/lib/api";
import { DashboardHeader } from "@/components/workspace/DashboardHeader";
import { Onboarding } from "@/components/workspace/Onboarding";
import { WorkspaceView } from "@/components/workspace/WorkspaceView";
import { ProfilePanel } from "@/components/workspace/ProfilePanel";

function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
      <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[] | null>(null);

  const load = useCallback(async () => {
    try {
      setWorkspaces((await api.me()).workspaces);
    } catch {
      setWorkspaces([]);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.guest) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/dashboard" })}`);
      return;
    }
    void load();
  }, [isLoading, user, router, load]);

  if (!user || user.guest || workspaces === null) return <Loading />;

  const requested = searchParams.get("w");
  const current = workspaces.find((workspace) => workspace.id === requested) ?? workspaces[0];
  const select = (id: string) => router.replace(`/dashboard?w=${encodeURIComponent(id)}`);

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)]">
      <DashboardHeader />
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {current ? (
          <WorkspaceView
            key={current.id}
            workspaceId={current.id}
            workspaces={workspaces}
            onSelect={select}
            onChanged={load}
            onGone={async () => {
              await load();
              router.replace("/dashboard");
            }}
          />
        ) : (
          <Onboarding
            onCreated={async (id) => {
              await load();
              select(id);
            }}
          />
        )}
        <div className="mt-4">
          <ProfilePanel />
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
