"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type WorkspaceSummary } from "@/lib/api";
import { spacePath } from "@/lib/links";
import { AppHeader } from "@/components/space/AppHeader";
import { Button, Card } from "@/components/workspace/ui";

function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-braun-bg)]">
      <div className="w-8 h-8 border-2 border-[var(--color-braun-orange)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * The way in to your spaces. With one space it steps aside and opens it; with
 * several it lists them; with none it points at setting one up.
 */
function Spaces() {
  const t = useTranslations("workspace.spaces");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [spaces, setSpaces] = useState<WorkspaceSummary[] | null>(null);
  const signedIn = !isLoading && !!user && !user.guest;
  // Older links pointed at ?w=<id>.
  const wanted = searchParams.get("w");

  useEffect(() => {
    if (isLoading) return;
    if (!signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/dashboard" })}`);
      return;
    }
    let cancelled = false;
    api.me().then(
      ({ workspaces }) => {
        if (cancelled) return;
        const only = workspaces.find((space) => space.id === wanted) ?? (workspaces.length === 1 ? workspaces[0] : null);
        if (only) router.replace(spacePath(only.id));
        else setSpaces(workspaces);
      },
      () => !cancelled && setSpaces([]),
    );
    return () => {
      cancelled = true;
    };
  }, [isLoading, signedIn, router, wanted]);

  if (!spaces) return <Loading />;

  return (
    <div className="min-h-screen w-full bg-[var(--color-braun-bg)]">
      <AppHeader />
      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h1 className="font-body text-2xl font-medium tracking-tight text-[var(--color-braun-text)]">{t("title")}</h1>
          {spaces.length > 0 && (
            <Link href="/create">
              <Button variant="primary">
                <Plus className="w-4 h-4" />
                {t("new")}
              </Button>
            </Link>
          )}
        </div>

        {spaces.length === 0 ? (
          <Card>
            <h2 className="font-body text-lg font-semibold tracking-tight text-[var(--color-braun-text)]">
              {t("emptyTitle")}
            </h2>
            <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mt-1 mb-5">{t("emptyBody")}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href="/create">
                <Button variant="primary">
                  <Plus className="w-4 h-4" />
                  {t("create")}
                </Button>
              </Link>
              <Link href="/lobby">
                <Button>{t("visitLobby")}</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ul className="space-y-2">
            {spaces.map((space) => (
              <li key={space.id}>
                <Link
                  href={spacePath(space.id)}
                  className="cursor-pointer group flex items-center gap-3 rounded-[1.25rem] border border-black/8 bg-white px-5 py-4 transition-[border-color,box-shadow] hover:border-black/15 hover:shadow-[0_12px_30px_-24px_rgba(0,0,0,0.5)]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[15px] font-semibold text-[var(--color-braun-text)] truncate">
                      {space.name}
                    </span>
                    <span className="flex items-center gap-1.5 font-body text-[12px] text-[var(--color-braun-text)] opacity-55 mt-0.5">
                      <Users className="w-3.5 h-3.5" />
                      {t(`roles.${space.role}`)}
                    </span>
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0 text-[var(--color-braun-text)] opacity-40 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Spaces />
    </Suspense>
  );
}
