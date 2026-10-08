"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { officePath, useSitePage } from "@/lib/links";
import { lastOffice } from "@/lib/lastOffice";
import { HomeFrame } from "./HomeFrame";
import { HomeView } from "./HomeView";
import { Introduce } from "@/components/entry/Introduce";

/**
 * The app's front door (app.tinyfloor.com): signed out, the sign-in; in an
 * office, straight into it (the one you were last in, else the busiest);
 * in none yet, the way to make one or join one.
 */
export function AppHome() {
  const router = useRouter();
  const home = useSitePage();
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;
  const ready = signedIn && user.introduced !== false;
  const [offices, setOffices] = useState<OfficeSummary[] | null>(null);

  useEffect(() => {
    if (!isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/" })}`);
  }, [isLoading, signedIn, router]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    api.me().then(
      ({ offices: mine }) => !cancelled && setOffices(mine ?? []),
      () => !cancelled && setOffices([]),
    );
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    if (!offices?.length) return;
    const last = lastOffice();
    const busiest = offices.reduce((best, one) => ((one.here ?? 0) > (best.here ?? 0) ? one : best));
    const office = offices.find((one) => one.id === last) ?? busiest;
    router.replace(officePath(office.id));
  }, [offices, router]);

  if (signedIn && user.introduced === false) return <Introduce backHref={home} />;
  if (offices?.length === 0) {
    return (
      <HomeFrame active="home">
        <HomeView />
      </HomeFrame>
    );
  }
  // Deciding, or on the way into an office: the office's own loading takes over from here.
  return <div className="min-h-dvh bg-background" aria-busy="true" />;
}
