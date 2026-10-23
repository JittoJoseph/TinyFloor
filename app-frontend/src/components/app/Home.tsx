"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { homePath, officePath } from "@/lib/links";
import { forgetOffice, lastOffice } from "@/lib/lastOffice";
import { openOfficeAhead } from "@/lib/officeAhead";
import { hadSession } from "@/lib/session-hint";

/**
 * Your offices, asked for once per visit: the front door can be drawn twice
 * on the way in (its query waits on Suspense), and both draws want the same
 * answer. A few seconds later it's a new visit, and asked again.
 */
let asked: { at: number; offices: Promise<OfficeSummary[] | null> } | null = null;
function askOffices() {
  if (!asked || Date.now() - asked.at > 5000) {
    asked = { at: Date.now(), offices: api.me().then(({ offices }) => offices ?? [], () => null) };
  }
  return asked.offices;
}

/**
 * The app's front door (/home): nothing to look at, only a way on. Signed
 * out, the sign-in, which comes back here; in an office, straight onto its
 * floor (the one you were last in, else the busiest); in none yet, making
 * one, which also offers your team's office if it has one. Everything else
 * (your profile, how you sign in) is in an office's settings. Leaving an
 * office comes here as `?left=<id>`, and that one isn't gone back to.
 */
export function Home() {
  const router = useRouter();
  const params = useSearchParams();
  const left = params.get("left");
  // Came to start (the site's "Get started"): the sign-in says so.
  const signingUp = params.get("mode") === "signup";
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;
  // The office you were last in is gone straight to, asked for on the way
  // (lib/officeAhead), without first reading which offices are yours; only
  // while this browser is signed in, as the page's first script does (lib/lastOffice).
  const [straight] = useState(() => (typeof window === "undefined" || left || !hadSession() ? null : lastOffice()));
  useEffect(() => {
    if (!straight) return;
    openOfficeAhead(straight);
    router.replace(officePath(straight));
  }, [straight, router]);
  // Otherwise your offices are asked for alongside the session rather than after it.
  // If that early ask fails (signed out, as it turns out), they're asked again once signed in.
  const [early] = useState(() => (typeof window === "undefined" || straight ? null : askOffices()));

  useEffect(() => {
    if (straight || isLoading || signedIn) return;
    router.replace(`/auth?${new URLSearchParams({ redirect: homePath, ...(signingUp ? { mode: "signup" } : {}) })}`);
  }, [straight, isLoading, signedIn, signingUp, router]);

  useEffect(() => {
    if (straight || !signedIn) return;
    let cancelled = false;
    Promise.resolve(early)
      .then((found) => found ?? api.me().then(({ offices }) => offices ?? []))
      .catch(() => [] as OfficeSummary[])
      .then((found) => {
        if (cancelled) return;
        if (left) forgetOffice(left);
        const offices = found.filter((one) => one.id !== left);
        if (!offices.length) {
          router.replace("/create");
          return;
        }
        const last = lastOffice();
        const busiest = offices.reduce((best, one) => ((one.here ?? 0) > (best.here ?? 0) ? one : best));
        router.replace(officePath((offices.find((one) => one.id === last) ?? busiest).id));
      });
    return () => {
      cancelled = true;
    };
  }, [straight, signedIn, early, left, router]);

  // On the way: the office's own loading, or the sign-in's, takes over from here.
  return <div className="min-h-dvh bg-background" aria-busy="true" />;
}
