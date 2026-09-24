"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Plus, Settings, UserPlus } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type OfficeSummary } from "@/lib/api";
import { officePath, officePeoplePath, officeSettingsPath } from "@/lib/links";
import { cn } from "@/lib/utils";
import { AppTopBar } from "@/components/app/AppTopBar";
import { YouRail } from "@/components/account/YouRail";
import { FloorScene, type Sitter } from "@/components/floor/FloorScene";
import { Bust } from "@/components/ui/Bust";
import { Face } from "@/components/ui/Face";

/*
 * Home: you beside your office. Most people have one office, so it is the page:
 * a window onto its floor with whoever is in right now, as they look, and the
 * way in. Someone with a few switches between them; someone with none is shown
 * how to make one. The rail is the same one the account page has.
 */

/** Desks on the big room's floor, in the order people are drawn at them. */
const DESKS: Array<[number, number]> = [
  [26, 8],
  [20, 8],
  [26, 11],
  [20, 11],
  [34, 13],
  [34, 16],
];
/** The desks around the middle of the room, for a wide window; the first cluster alone, for a phone's. */
const WIDE_VIEW: [number, number, number, number] = [16.5, 4.4, 24, 11];
const NARROW_VIEW: [number, number, number, number] = [16.5, 4.8, 14, 9];

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [offices, setOffices] = useState<OfficeSummary[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const signedIn = !isLoading && !!user && !user.guest;

  useEffect(() => {
    if (isLoading) return;
    if (!signedIn) {
      router.replace(`/auth?${new URLSearchParams({ redirect: "/dashboard" })}`);
      return;
    }
    let cancelled = false;
    api.me().then(
      ({ offices: mine }) => !cancelled && setOffices(mine),
      () => !cancelled && setOffices([]),
    );
    return () => {
      cancelled = true;
    };
  }, [isLoading, signedIn, router]);

  // Until one is picked, the office with the most people in it (the first, when none has anyone).
  const busiest = offices?.reduce<OfficeSummary | undefined>((best, one) => (!best || (one.here ?? 0) > (best.here ?? 0) ? one : best), undefined);
  const office = offices?.find((one) => one.id === picked) ?? busiest;
  const several = !!offices && offices.length > 1;

  return (
    <div className="min-h-dvh bg-background">
      <AppTopBar section="home" />
      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-4 pb-20 pt-5 sm:px-6 sm:pt-10 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-6">
        <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <YouRail
            action={
              <Link
                href="/account"
                className="flex h-9 items-center justify-center rounded-full bg-muted px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.08] lg:w-full"
              >
                {t("editProfile")}
              </Link>
            }
          >
            {several && (
              <nav className="hidden border-t border-border p-2 lg:block">
                <p className="px-3 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-faint">{t("yourOffices")}</p>
                {offices.map((one) => (
                  <button
                    key={one.id}
                    type="button"
                    aria-current={one.id === office?.id ? "true" : undefined}
                    onClick={() => setPicked(one.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors",
                      one.id === office?.id ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <Face seed={one.id} size={26} square />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">{one.name}</span>
                    {!!one.here && (
                      <span className="flex items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                        <span className="size-1.5 rounded-full bg-ok" />
                        {one.here}
                      </span>
                    )}
                  </button>
                ))}
                <Link
                  href="/create"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <span className="flex size-[26px] items-center justify-center">
                    <Plus className="size-4" />
                  </span>
                  {t("newOffice")}
                </Link>
              </nav>
            )}
          </YouRail>
        </aside>

        <div className="min-w-0">
          {several && (
            <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden">
              {offices.map((one) => (
                <button
                  key={one.id}
                  type="button"
                  onClick={() => setPicked(one.id)}
                  className={cn(
                    "flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border ps-1.5 pe-3.5 text-[13px] font-medium transition-colors",
                    one.id === office?.id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground",
                  )}
                >
                  <Face seed={one.id} size={22} square />
                  {one.name}
                  {!!one.here && <span className="size-1.5 rounded-full bg-ok" />}
                </button>
              ))}
              <Link
                href="/create"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3.5 text-[13px] text-muted-foreground"
              >
                <Plus className="size-3.5" />
                {t("newOffice")}
              </Link>
            </div>
          )}

          {!offices ? (
            <div className="h-[430px] animate-pulse rounded-[24px] bg-muted" />
          ) : office ? (
            <OfficeCard key={office.id} office={office} />
          ) : (
            <NoOffice character={user?.character ?? "Adam"} />
          )}

          <Link
            href="/lobby"
            className="group mt-5 flex items-center gap-4 rounded-[22px] border border-border bg-card p-3 pe-5 transition-colors hover:border-border-strong"
          >
            <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-[14px]">
              <FloorScene view={[0, 18, 15, 12]} className="absolute inset-0" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-foreground">{t("lobby")}</span>
              <span className="block truncate text-[13px] text-muted-foreground">{t("lobbyBody")}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}

/** One office: its name, a window onto its floor with whoever is in, and the way in. */
function OfficeCard({ office }: { office: OfficeSummary }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const tRoles = useTranslations("office.roles");
  const tStatus = useTranslations("status");
  const inNow = office.inNow ?? [];
  const admin = office.role === "admin";
  const sitting: Sitter[] = inNow.slice(0, DESKS.length).map((one, index) => ({
    character: one.character,
    chair: DESKS[index],
    name: one.name.split(" ")[0],
    status: one.status,
  }));
  // Teammates who aren't in, drawn faded; the rest of the team is only counted.
  const away = (office.faces ?? []).filter((one) => !inNow.some((inside) => inside.id === one.id));
  const notIn = Math.max(0, office.members - inNow.length);

  const actions = (
    <div className="flex items-center gap-2">
      {admin && (
        <>
          <Link
            href={officePeoplePath(office.id)}
            aria-label={t("invite")}
            title={t("invite")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted sm:size-10"
          >
            <UserPlus className="size-4" />
          </Link>
          <Link
            href={officeSettingsPath(office.id)}
            aria-label={t("officeSettings")}
            title={t("officeSettings")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted sm:size-10"
          >
            <Settings className="size-4" />
          </Link>
        </>
      )}
      <Link
        href={officePath(office.id)}
        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-[background-color,transform] hover:bg-foreground/90 active:scale-[0.98] sm:h-10 sm:flex-none"
      >
        {t("walkIn")}
        <ArrowRight className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );

  return (
    <article className="overflow-hidden rounded-[24px] border border-border bg-card [--face-ring:var(--ui-card)]">
      <div className="flex items-center gap-4 p-4 sm:p-5">
        <Face seed={office.id} size={48} square />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[20px] font-semibold tracking-tight text-foreground sm:text-[24px]">{office.name}</h1>
          <p className="truncate text-[13px] text-muted-foreground">
            {ts("membersOf", { used: office.members, seats: office.seats })} · {tRoles(office.role)}
          </p>
        </div>
        <div className="hidden sm:block">{actions}</div>
      </div>

      <div className="relative mx-2 h-52 overflow-hidden rounded-[18px] sm:h-[300px]">
        <FloorScene view={NARROW_VIEW} sitting={sitting} priority className="absolute inset-0 sm:hidden" />
        <FloorScene view={WIDE_VIEW} sitting={sitting} priority className="absolute inset-0 hidden sm:block" />
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {inNow.length === 0 ? (
            <p className="text-[13.5px] text-muted-foreground">{t("firstIn")}</p>
          ) : (
            inNow.map((one) => (
              <span key={one.id} className="flex items-center gap-2.5">
                <Bust character={one.character} size={34} status={one.status} />
                <span className="leading-tight">
                  <span className="block max-w-32 truncate text-[13.5px] font-medium text-foreground">{one.name.split(" ")[0]}</span>
                  <span className="block text-[12px] text-muted-foreground">{tStatus(`${one.status}.label`)}</span>
                </span>
              </span>
            ))
          )}
          {notIn > 0 && (
            <span className="flex items-center gap-2 text-[12.5px] text-muted-foreground sm:ms-auto">
              {away.length > 0 && (
                <span className="flex">
                  {away.slice(0, 3).map((one, index) => (
                    <span key={one.id} className="rounded-full ring-2 ring-card" style={{ marginInlineStart: index ? -8 : 0 }}>
                      <Bust character={one.character} size={24} className="opacity-60 grayscale" />
                    </span>
                  ))}
                </span>
              )}
              {t("notIn", { count: notIn })}
            </span>
          )}
          {admin && office.members === 1 && (
            <Link href={officePeoplePath(office.id)} className="text-[13px] font-medium text-foreground underline-offset-2 hover:underline sm:ms-auto">
              {t("inviteTeam")}
            </Link>
          )}
        </div>
        <div className="mt-4 sm:hidden">{actions}</div>
      </div>
    </article>
  );
}

/** No office yet: your character on an empty floor, and how to make one. */
function NoOffice({ character }: { character: string }) {
  const t = useTranslations("dashboard");
  return (
    <article className="grid overflow-hidden rounded-[24px] border border-border bg-card md:grid-cols-[1.25fr_1fr]">
      <div className="relative m-2 h-48 overflow-hidden rounded-[18px] md:mb-2 md:h-auto md:min-h-72">
        <FloorScene view={[16, 4, 18, 11]} standing={[{ character, at: [24, 13], face: "down" }]} className="absolute inset-0" />
      </div>
      <div className="flex flex-col justify-center p-5 sm:p-8">
        <h1 className="text-[21px] font-semibold tracking-tight text-foreground">{t("emptyTitle")}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t("emptyBody")}</p>
        <Link
          href="/create"
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/90 sm:w-fit"
        >
          <Plus className="size-4" />
          {t("makeOffice")}
        </Link>
      </div>
    </article>
  );
}
