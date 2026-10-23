"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus } from "@/components/ui/icons";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { officePath, useSitePage } from "@/lib/links";
import { lastOffice } from "@/lib/lastOffice";
import { openOfficeAhead } from "@/lib/officeAhead";
import { Face } from "@/components/ui/Face";
import { LitFace } from "@/components/ui/LitFace";
import { ActionLink } from "@/components/ui/Action";
import { HomeFrame } from "./HomeFrame";
import { NoOffice } from "./NoOffice";
import { Introduce } from "@/components/entry/Introduce";
import { askTeamOffices, TeamOffices, useTeamOffices } from "./TeamOffices";

/**
 * The app's front door (app.tinyfloor.com). There is no dashboard: signed
 * out, the sign-in; in an office, straight onto its floor (the one you were
 * last in, else the busiest); in none yet, the way to make one or join one.
 * Leaving an office comes back here (`?left=<id>`), to the door you left by.
 */
export function AppHome() {
  const router = useRouter();
  const home = useSitePage();
  const left = useSearchParams().get("left");
  const { user, isLoading } = useAuth();
  const signedIn = !isLoading && !!user && !user.guest;
  const ready = signedIn && user.introduced !== false;
  const [offices, setOffices] = useState<OfficeSummary[] | null>(null);
  // The office you were last in is gone straight to, asked for on the way
  // (lib/officeAhead), without first reading which offices are yours: that's
  // only read when there's none to go back to, or you just left one.
  const [straight] = useState(() => (typeof window === "undefined" || left ? null : lastOffice()));
  useEffect(() => {
    if (!straight) return;
    openOfficeAhead(straight);
    router.replace(officePath(straight));
  }, [straight, router]);
  // Your offices are asked for alongside the session rather than after it. If
  // that early ask fails (signed out, as it turns out), they're asked again once signed in.
  const [early] = useState(() => {
    if (typeof window === "undefined" || straight) return null;
    // Back outside an office you left, your team's offices show too: asked for at the same time.
    if (left) askTeamOffices();
    return api.me().then(({ offices: found }) => found ?? [], () => null);
  });

  useEffect(() => {
    if (!straight && !isLoading && !signedIn) router.replace(`/auth?${new URLSearchParams({ redirect: "/" })}`);
  }, [straight, isLoading, signedIn, router]);

  useEffect(() => {
    if (!ready || straight) return;
    let cancelled = false;
    Promise.resolve(early)
      .then((found) => found ?? api.me().then(({ offices: again }) => again ?? []))
      .then(
        (found) => !cancelled && setOffices(found),
        () => !cancelled && setOffices([]),
      );
    return () => {
      cancelled = true;
    };
  }, [ready, early, straight]);

  const leftOffice = offices?.find((one) => one.id === left);

  useEffect(() => {
    if (!offices?.length || leftOffice) return;
    const last = lastOffice();
    const busiest = offices.reduce((best, one) => ((one.here ?? 0) > (best.here ?? 0) ? one : best));
    const office = offices.find((one) => one.id === last) ?? busiest;
    router.replace(officePath(office.id));
  }, [offices, leftOffice, router]);

  if (straight) return <div className="min-h-dvh bg-background" aria-busy="true" />;
  if (signedIn && user.introduced === false) return <Introduce backHref={home} />;
  if (offices && leftOffice) {
    return (
      <HomeFrame active="home">
        <Outside office={leftOffice} others={offices.filter((one) => one.id !== leftOffice.id)} />
      </HomeFrame>
    );
  }
  if (offices?.length === 0) {
    return (
      <HomeFrame active="home">
        <NoOffice />
      </HomeFrame>
    );
  }
  // Deciding, or on the way into an office: the office's own loading takes over from here.
  return <div className="min-h-dvh bg-background" aria-busy="true" />;
}

/** Just outside the office you left: its door to walk back in by, and your other offices. */
function Outside({ office, others }: { office: OfficeSummary; others: OfficeSummary[] }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const team = useTeamOffices();
  // Drawn once your team's offices are known too, so the page doesn't move when they arrive under it.
  if (team === undefined) return <div className="min-h-[50dvh]" aria-busy="true" />;
  const row =
    "flex h-12 items-center gap-3 px-4 text-[13.5px] text-foreground transition-colors hover:bg-foreground/[0.04]";
  return (
    <div className="mx-auto max-w-[400px] text-center sm:flex sm:min-h-[calc(100dvh-14rem)] sm:flex-col sm:justify-center">
      <LitFace seed={office.id} size={80} phone={64} square className="mx-auto" />
      <h1 className="mt-7 truncate text-[28px] font-semibold tracking-[-0.025em] text-foreground">{office.name}</h1>
      <p className="mt-1 text-[13.5px] text-muted-foreground">
        {ts("membersOf", { used: office.members, seats: office.seats })}
        {!!office.here && (
          <span className="ms-2 inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-ok" />
            {t("inNow", { count: office.here })}
          </span>
        )}
      </p>
      <ActionLink href={officePath(office.id)} className="mx-auto mt-7 h-12 max-w-[280px] text-[15px]">
        {t("walkIn")}
      </ActionLink>

      <div className="mt-12 overflow-hidden rounded-[20px] border border-border bg-card text-start">
        {others.length > 0 && (
          <>
            <p className="px-4 pb-1 pt-3 text-[12px] font-medium text-faint">{ts("switchTo")}</p>
            {others.map((one) => (
              <Link key={one.id} href={officePath(one.id)} className={row}>
                <Face seed={one.id} size={22} square />
                <span className="min-w-0 flex-1 truncate">{one.name}</span>
                {!!one.here && (
                  <span className="flex items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-ok" />
                    {one.here}
                  </span>
                )}
                <ArrowRight className="size-3.5 text-faint rtl:rotate-180" />
              </Link>
            ))}
            <span aria-hidden className="block h-px bg-border" />
          </>
        )}
        <Link href="/create" className={row}>
          <span className="flex size-[22px] items-center justify-center text-muted-foreground [&_svg]:size-4">
            <Plus />
          </span>
          <span className="flex-1">{ts("newOffice")}</span>
        </Link>
      </div>
      {team && <TeamOffices team={team} className="mt-4" />}
    </div>
  );
}
