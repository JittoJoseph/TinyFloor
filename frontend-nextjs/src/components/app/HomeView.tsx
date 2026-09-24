"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, ChevronRight, DoorOpen, Plus, Settings, UserPlus } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Member, type OfficeSummary } from "@/lib/api";
import { lobbyPath, officePath, officePeoplePath } from "@/lib/links";
import { cn } from "@/lib/utils";
import { FloorScene, type Sitter } from "@/components/floor/FloorScene";
import { Face } from "@/components/ui/Face";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { Group } from "./SettingsView";
import { JoinByLink, OfficeNameCard, useCreateOffice } from "./CreateOffice";

/** Desks near the middle of the big room, in the order people are drawn at them. */
const DESKS: Array<[number, number]> = [
  [26, 8],
  [20, 8],
  [26, 11],
  [20, 11],
  [34, 13],
  [34, 16],
];

/** A team list this long is enough; the People view has everyone. */
const TEAM_SHOWN = 8;

const buttonClass = {
  primary:
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-foreground/90",
  secondary:
    "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted",
  quiet:
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground",
};

/**
 * Home: your office, since most people have one. Who is in it now and where
 * they sit, your team, and the way in. With a few offices a switcher picks
 * between them; with none, it shows how to make one.
 */
/** Your offices, and the one on show: picked, or else the one with the most people in it (the first, when nobody is in). */
export function useMyOffices() {
  const [offices, setOffices] = useState<OfficeSummary[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.me().then(
      ({ offices: mine }) => !cancelled && setOffices(mine ?? []),
      () => !cancelled && setOffices([]),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const busiest = offices?.reduce<OfficeSummary | undefined>((best, one) => (!best || (one.here ?? 0) > (best.here ?? 0) ? one : best), undefined);
  const office = offices?.find((one) => one.id === picked) ?? busiest;
  return { offices, office, pick: setPicked };
}

export function HomeView() {
  const t = useTranslations("dashboard");
  const { offices, office, pick } = useMyOffices();
  const several = !!offices && offices.length > 1;

  return (
    <>
      {several && office && (
        <div className="mb-8 flex items-center gap-2">
          <OfficeMenu offices={offices} office={office} onPick={pick} />
          <Link href="/create" className={cn(buttonClass.quiet, "ms-auto")}>
            <Plus className="size-3.5" />
            {t("newOffice")}
          </Link>
        </div>
      )}
      {!offices ? <Loading /> : office ? <Overview key={office.id} office={office} /> : <NoOffice />}
      {offices?.length === 1 && (
        <Link
          href="/create"
          className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" />
          {t("anotherOffice")}
        </Link>
      )}
    </>
  );
}

export function OfficeMenu({ offices, office, onPick }: { offices: OfficeSummary[]; office: OfficeSummary; onPick: (id: string) => void }) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  return (
    <Menu
      align="start"
      width={264}
      trigger={
        <button
          type="button"
          className="-ms-2 flex h-9 min-w-0 cursor-pointer items-center gap-2 rounded-lg px-2 text-[15px] font-semibold text-foreground outline-none transition-colors hover:bg-foreground/[0.05] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Face seed={office.id} size={20} square />
          <span className="truncate">{office.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      }
    >
      <MenuLabel>{t("yourOffices")}</MenuLabel>
      {offices.map((one) => (
        <MenuItem key={one.id} checked={one.id === office.id} icon={<Face seed={one.id} size={16} square />} onSelect={() => onPick(one.id)}>
          <span className="flex w-full items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{one.name}</span>
            {!!one.here && (
              <span className="flex items-center gap-1 text-[12px] tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-ok" />
                {one.here}
              </span>
            )}
          </span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem icon={<Plus />} onSelect={() => router.push("/create")}>
        {t("newOffice")}
      </MenuItem>
    </Menu>
  );
}

/** One office at a glance: the way in, its floor with whoever is in, and its people. */
export function Overview({ office }: { office: OfficeSummary }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("shell");
  const tRoles = useTranslations("office.roles");
  const tStatus = useTranslations("status");
  const { user } = useAuth();
  const [team, setTeam] = useState<Member[] | null>(null);
  const admin = office.role === "admin";
  const inNow = office.inNow ?? [];
  const here = new Map(inNow.map((one) => [one.id, one.status]));

  useEffect(() => {
    let cancelled = false;
    api.overview(office.id).then(
      ({ members }) => !cancelled && setTeam(members),
      () => !cancelled && setTeam([]),
    );
    return () => {
      cancelled = true;
    };
  }, [office.id]);

  const sitting: Sitter[] = inNow.slice(0, DESKS.length).map((one, index) => ({
    character: one.character,
    chair: DESKS[index],
    name: one.name.split(" ")[0],
    status: one.status,
  }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <Face seed={office.id} size={44} square />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-semibold tracking-tight text-foreground">{office.name}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {ts("membersOf", { used: office.members, seats: office.seats })} · {tRoles(office.role)}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {admin && (
            <Link href={officePeoplePath(office.id)} className={cn(buttonClass.secondary, "flex-1 sm:flex-none")}>
              <UserPlus className="size-4" />
              {t("invite")}
            </Link>
          )}
          <Link href={officePath(office.id)} className={cn(buttonClass.primary, "flex-1 sm:flex-none")}>
            {t("walkIn")}
            <ArrowRight className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <Link
        href={officePath(office.id)}
        aria-label={t("walkIn")}
        className="group relative mt-6 block h-44 overflow-hidden rounded-2xl border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-60"
      >
        <FloorScene view={[16.5, 3.4, 24, 11]} sitting={sitting} priority className="absolute inset-0" />
        <span className="absolute start-3 top-3 flex h-7 items-center gap-1.5 rounded-full border border-border bg-card/95 px-2.5 text-[12px] font-medium text-foreground shadow-float backdrop-blur-md">
          <span className={cn("size-1.5 rounded-full", inNow.length ? "bg-ok" : "bg-faint")} />
          {t("inNow", { count: inNow.length })}
        </span>
      </Link>

      <div className="mt-8">
        <Group title={t("inOffice")}>
          {inNow.length ? (
            inNow.map((one) => (
              <PersonRow key={one.id} id={one.id} name={one.name} you={one.id === user?.id} presence={one.status}>
                <span className="text-[12.5px] text-muted-foreground">{tStatus(`${one.status}.label`)}</span>
              </PersonRow>
            ))
          ) : (
            <p className="px-4 py-3.5 text-[13px] text-muted-foreground">{t("firstIn")}</p>
          )}
        </Group>

        <Group
          title={t("team")}
          note={t("seats", { used: office.members, seats: office.seats })}
          action={
            <Link href={officePeoplePath(office.id)} className={cn(buttonClass.quiet, "-me-2.5")}>
              {admin && <Settings className="size-3.5" />}
              {admin ? t("manage") : t("seeAll")}
            </Link>
          }
        >
          {!team
            ? Array.from({ length: Math.min(office.members, 3) }, (_, index) => (
                <div key={index} className="flex h-12 items-center gap-3 px-4">
                  <span className="size-[26px] animate-pulse rounded-full bg-muted" />
                  <span className="h-3 w-32 animate-pulse rounded-full bg-muted" />
                </div>
              ))
            : team.slice(0, TEAM_SHOWN).map((member) => (
                <PersonRow key={member.id} id={member.id} name={member.displayName} you={member.id === user?.id} presence={here.get(member.id) ?? null}>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{tRoles(member.role)}</span>
                </PersonRow>
              ))}
          {!!team && team.length > TEAM_SHOWN && (
            <Link
              href={officePeoplePath(office.id)}
              className="flex h-11 items-center gap-1 px-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("seeAll")}
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Link>
          )}
        </Group>
      </div>
    </>
  );
}

function PersonRow({
  id,
  name,
  you,
  presence,
  children,
}: {
  id: string;
  name: string;
  you: boolean;
  presence: "available" | "busy" | "away" | "in_call" | null;
  children?: React.ReactNode;
}) {
  const ts = useTranslations("shell");
  return (
    <div className="flex h-12 items-center gap-3 px-4">
      <Face seed={id} size={26} presence={presence} />
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">
        {name}
        {you && <span className="text-muted-foreground"> · {ts("youLower")}</span>}
      </span>
      {children}
    </div>
  );
}

/**
 * No office yet, just after signing up: three steps to a floor of their own,
 * the first one right here. Someone who was invited pastes the link instead,
 * and the lobby is there in the meantime.
 */
export function NoOffice() {
  const t = useTranslations("dashboard");
  const tc = useTranslations("create");
  const { user } = useAuth();
  const { name, setName, typed, busy, error, create } = useCreateOffice();
  const later = [
    { title: t("stepInvite"), body: t("stepInviteBody") },
    { title: t("stepWalk"), body: t("stepWalkBody") },
  ];

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        {user ? t("welcome", { name: user.displayName.split(" ")[0] }) : t("welcomeAnonymous")}
      </h1>
      <p className="mt-1.5 text-[14.5px] text-muted-foreground">{t("welcomeBody")}</p>

      <ol className="mt-8 space-y-3">
        <li className="rounded-[22px] border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[12px] font-semibold text-background">1</span>
            <h2 className="text-[15px] font-semibold text-foreground">{t("stepName")}</h2>
          </div>
          <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <OfficeNameCard name={name} onName={setName} />
            <button
              type="submit"
              disabled={!typed || busy}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? tc("creating") : t("makeIt")}
              {!busy && <ArrowRight className="size-4 rtl:rotate-180" />}
            </button>
          </form>
          {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
          <p className="mt-3 text-[12.5px] text-muted-foreground">{tc("freePlan")}</p>
        </li>
        {later.map((step, index) => (
          <li key={step.title} className="flex items-start gap-3 rounded-[22px] border border-border px-4 py-4 sm:px-5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-[12px] font-semibold text-muted-foreground">
              {index + 2}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold text-muted-foreground">{step.title}</h2>
              <p className="mt-0.5 text-[13px] text-faint">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:items-center">
        <div>
          <p className="text-[14px] font-medium text-foreground">{t("invited")}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{t("invitedBody")}</p>
        </div>
        <JoinByLink />
      </div>

      <div className="mt-10 border-t border-border pt-6">
        <Link href={lobbyPath} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground">
          <DoorOpen className="size-4 rtl:-scale-x-100" />
          {t("lobbyNote")}
          <ChevronRight className="size-3.5 rtl:rotate-180" />
        </Link>
      </div>
    </>
  );
}

export function Loading() {
  return (
    <div aria-hidden>
      <div className="flex items-center gap-4">
        <span className="size-11 animate-pulse rounded-[30%] bg-muted" />
        <span className="flex-1 space-y-2">
          <span className="block h-4 w-44 animate-pulse rounded-full bg-muted" />
          <span className="block h-3 w-28 animate-pulse rounded-full bg-muted" />
        </span>
      </div>
      <div className="mt-6 h-44 animate-pulse rounded-2xl bg-muted sm:h-60" />
    </div>
  );
}
