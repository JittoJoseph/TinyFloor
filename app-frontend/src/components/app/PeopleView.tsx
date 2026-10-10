"use client";

import { PlansSoon } from "@/components/ui/PlansSoon";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Copy, Link2, MoreHorizontal, RotateCcw, Search, Shield, ShieldOff, UserMinus, UserPlus } from "@/components/ui/icons";
import { dmChannelId } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { lobbyPath, officeChatPath, officePath, officeSettingsPath, shareUrl } from "@/lib/links";
import { resetInviteLink, useInviteLink } from "@/lib/inviteLink";
import { shareLink } from "@/lib/share";
import { useFloor, useFloorStatus, walkToPerson } from "@/lib/floor";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { Face } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";
import { Chip, Empty } from "@/components/ui/Empty";
import { useOffice } from "./OfficeShell";
import { usePlace } from "./place";
import { MemberRow, PRESENCE_ORDER } from "./MemberRow";
import { Link } from "@/lib/i18n/navigation";
import { withPostHog } from "@/lib/analytics";
import { useUpgrade } from "@/components/billing/Upgrade";
import { usePlans } from "@/lib/billing";
import { PLAN_NAMES } from "@/components/billing/PlanCards";
import type { PlanId } from "@/lib/api";

/** Past this many people, the list gets a search box. */
const SEARCH_FROM = 8;

/** People: an office's members and who can come in, or who is in the lobby now. */
export function PeopleView() {
  const place = usePlace();
  return place.kind === "office" ? <OfficePeople /> : <LobbyPeople />;
}

/**
 * Who is in the office, as one list (docs/22): you first, then whoever is on the
 * floor, then everyone else; searchable once it's long. Above it, the one link
 * that brings more people in, and how many seats are left.
 */
function OfficePeople() {
  const t = useTranslations("office.people");
  const router = useRouter();
  const { user } = useAuth();
  const { office, overview: data, readAt, refresh } = useOffice();
  const floor = useFloorStatus();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [onlyHere, setOnlyHere] = useState(false);
  const link = useInviteLink(office.id);

  // The shell read the office when it opened; coming back to People later reads it again.
  useEffect(() => {
    if (Date.now() - readAt > 30_000) void refresh().catch(() => {});
    // Only on arrival: after that, whatever changes here refreshes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      await refresh();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    }
  };

  const share = async (path: string, key: string) => {
    const result = await shareLink(shareUrl(path));
    if (result !== "copied") return;
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const plans = usePlans();
  const admin = office.role === "admin";
  const members = data.members;
  const used = data.members.length;
  // A free office with its trial still to give isn't full: the next person starts it (docs/22).
  const trialWaiting = !!office.trialOpen && !!plans?.billing && !!plans.trialDays;
  const full = used >= office.seats && !trialWaiting;

  // The same link every time: on a phone the share sheet, on a desktop the clipboard.
  const invite = () => {
    if (!link) return;
    withPostHog((posthog) => posthog.capture("office_invite_shared"));
    void share(link, "invite");
  };

  const here = members.filter((one) => floor.has(one.id)).length;
  const rank = (id: string) => (floor.has(id) ? (PRESENCE_ORDER[floor.get(id)!] ?? 0) : 9);
  const needle = query.trim().toLowerCase();
  const listed = members
    .filter((one) => !onlyHere || floor.has(one.id))
    .filter((one) => !needle || one.displayName.toLowerCase().includes(needle) || !!one.email?.toLowerCase().includes(needle))
    .sort(
      (a, b) =>
        Number(b.id === user?.id) - Number(a.id === user?.id) || rank(a.id) - rank(b.id) || a.displayName.localeCompare(b.displayName),
    );

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <Button size="md" disabled={!link} onClick={invite} className="h-10 gap-2 px-4 text-[13px]">
            {copied === "invite" ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            {copied === "invite" ? t("linkCopied") : t("invite")}
          </Button>
        </header>

        <div className="mt-6 grid items-start gap-3 md:grid-cols-[minmax(0,1fr)_17rem]">
          <InviteLink link={link} admin={admin} officeId={office.id} onShare={invite} copied={copied === "invite"} />
          <Seats
            used={used}
            seats={office.seats}
            full={full}
            admin={admin}
            trial={trialWaiting && used >= office.seats ? (plans?.trialDays ?? 0) : 0}
            trialPlan={plans?.trialPlan ?? null}
          />
        </div>

        {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

        <div className="mb-3 mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
            {t("members")}
            <span className="text-[13px] font-normal tabular-nums text-muted-foreground">{members.length}</span>
          </h2>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <div role="group" className="flex h-9 items-center rounded-full bg-muted p-1 text-[12.5px] font-medium">
              {[
                { on: false, label: t("everyone"), count: members.length },
                { on: true, label: t("onFloor"), count: here },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={onlyHere === option.on}
                  onClick={() => setOnlyHere(option.on)}
                  className={cn(
                    "flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 transition-colors",
                    onlyHere === option.on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                  <span className="tabular-nums text-muted-foreground">{option.count}</span>
                </button>
              ))}
            </div>
            {members.length >= SEARCH_FROM && (
              <label className="flex h-9 w-56 max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 focus-within:border-border-strong">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search")}
                  aria-label={t("search")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-faint"
                />
              </label>
            )}
          </div>
        </div>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
          {listed.map((member) => {
            const isMe = member.id === user?.id;
            const owner = member.id === office.owner;
            return (
              <MemberRow
                key={member.id}
                id={member.id}
                name={member.displayName}
                detail={member.email ?? t("noEmail")}
                presence={floor.get(member.id) ?? null}
                role={owner ? t("owner") : t(member.role)}
                joinedAt={member.joinedAt}
                isMe={isMe}
                onProfile={() => router.push(`${officeSettingsPath(office.id)}#profile`)}
                onMessage={() => user && router.push(officeChatPath(office.id, dmChannelId(user.id, member.id)))}
                onWalk={() => {
                  router.push(officePath(office.id));
                  walkToPerson(member.id);
                }}
                menu={
                  admin && !owner ? (
                    <Menu align="end" width={208} trigger={<IconButton label={t("more")} size="sm" icon={<MoreHorizontal />} bare />}>
                      <MenuItem
                        icon={member.role === "admin" ? <ShieldOff /> : <Shield />}
                        onSelect={() => run(() => api.setRole(office.id, member.id, member.role === "admin" ? "member" : "admin").then())}
                      >
                        {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem danger icon={<UserMinus />} onSelect={() => run(() => api.removeMember(office.id, member.id).then())}>
                        {isMe ? t("leave") : t("remove")}
                      </MenuItem>
                    </Menu>
                  ) : undefined
                }
              />
            );
          })}
          {listed.length === 0 && <li className="px-4 py-10 text-center text-[13px] text-muted-foreground">{t("noMatch")}</li>}
        </ul>
      </div>
    </div>
  );
}

/**
 * Seats as a meter: how many are taken and how many are left. Full, an admin
 * gets the way to more where plans are sold; a free office with its trial
 * still to give says the next person starts it.
 */
function Seats({
  used,
  seats,
  full,
  admin,
  trial,
  trialPlan,
}: {
  used: number;
  seats: number;
  full: boolean;
  admin: boolean;
  trial: number;
  trialPlan: PlanId | null;
}) {
  const t = useTranslations("office.people");
  const tb = useTranslations("billing");
  const { open } = useUpgrade();
  return (
    <section className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold tabular-nums text-foreground">{t("seats", { used, seats })}</p>
        <p className="text-[12px] text-muted-foreground">
          {full ? t("seatsFull") : t("seatsOpen", { count: Math.max(0, seats - used) })}
        </p>
      </div>
      {/* One segment a seat while they are countable; a bar once they are not. */}
      {seats <= 25 ? (
        <div className="mt-3 flex gap-[3px]" aria-hidden>
          {Array.from({ length: seats }, (_, index) => (
            <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < used ? "bg-foreground" : "bg-muted")} />
          ))}
        </div>
      ) : (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (used / seats) * 100)}%` }} />
        </div>
      )}
      {trial > 0 && (
        <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[12px] leading-relaxed text-foreground">
          {tb("trialWaiting", { free: seats, plan: PLAN_NAMES[trialPlan ?? "pro"], days: trial })}
        </p>
      )}
      {full && admin && open && (
        // The plans, right here: the one with room for everyone already marked.
        <button
          type="button"
          onClick={() => open("full")}
          className="mt-3 flex h-9 w-full cursor-pointer items-center justify-center rounded-full bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/85"
        >
          {tb("moreSeats")}
        </button>
      )}
      <PlansSoon className="mt-3" />
    </section>
  );
}

/**
 * The lobby's people: whoever is on this floor right now, as the same rows an
 * office has. Writing to someone needs an office; walking over does not.
 */
function LobbyPeople() {
  const t = useTranslations("office.people");
  const tl = useTranslations("lobby");
  const ts = useTranslations("shell");
  const tr = useTranslations("room");
  const router = useRouter();
  const { user } = useAuth();
  const place = usePlace();
  const everyone = useFloor();
  const [copied, setCopied] = useState(false);
  const here = [...everyone.filter((one) => one.id === user?.id), ...everyone.filter((one) => one.id !== user?.id)];

  const shareLobby = async () => {
    const result = await shareLink(shareUrl(lobbyPath), tl("title"), tr("inviteText", { room: tl("title") }));
    if (result !== "copied") return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{ts("hereNow")}</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{tl("peopleSubtitle")}</p>
          </div>
          <Button size="md" className="h-10 gap-2 px-4 text-[13px]" onClick={shareLobby}>
            {copied ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            {copied ? tr("linkCopied") : tr("invite")}
          </Button>
        </header>

        {/* What the lobby is for: showing what your own office would be. */}
        {place.paths.yourOffice && (
          <Link
            href={place.paths.yourOffice}
            className="group mt-6 flex items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-border-strong [--face-ring:var(--ui-background)]"
          >
            <span className="flex">
              {here.slice(0, 3).map((one, index) => (
                <span key={one.id} style={{ marginInlineStart: index ? -12 : 0 }} className="flex shrink-0 rounded-full ring-2 ring-background">
                  <Face seed={one.id} size={36} />
                </span>
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold text-foreground">{t("ownOfficeTitle")}</span>
              <span className="block text-[13px] text-muted-foreground">{t("ownOfficeBody")}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </Link>
        )}

        {here.length <= 1 ? (
          <Empty
            className="mt-6"
            art={
              <span className="flex items-center [--face-ring:var(--ui-card)]">
                {user && <Face seed={user.id} size={44} presence="available" />}
                {[0, 1].map((one) => (
                  <span
                    key={one}
                    className="-ms-2.5 flex size-11 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-card text-faint"
                  >
                    <UserPlus className="size-4" />
                  </span>
                ))}
              </span>
            }
            title={tr("aloneTitle")}
            body={tr("aloneBody")}
            actions={
              <Chip solid icon={copied ? <Check /> : <UserPlus />} onClick={shareLobby}>
                {copied ? tr("linkCopied") : tr("inviteSomeone")}
              </Chip>
            }
          />
        ) : (
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
            {here.map((one) => (
              <MemberRow
                key={one.id}
                id={one.id}
                name={one.name}
                presence={one.status}
                isMe={one.id === user?.id}
                onProfile={user?.guest ? undefined : () => router.push(`${place.paths.settings}#profile`)}
                onMessage={user && one.id !== user.id ? () => router.push(place.paths.chat(dmChannelId(user.id, one.id))) : undefined}
                onWalk={() => {
                  router.push(place.paths.floor);
                  walkToPerson(one.id);
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * The office's invite link, written out: anyone in the office can copy or
 * share it, and an admin can reset it if it went somewhere it shouldn't.
 */
function InviteLink({
  link,
  admin,
  officeId,
  onShare,
  copied,
}: {
  link: string | null;
  admin: boolean;
  officeId: string;
  onShare: () => void;
  copied: boolean;
}) {
  const t = useTranslations("office.people");
  const tc = useTranslations("common");
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const shown = link ? shareUrl(link).replace(/^https?:\/\//, "") : null;

  const reset = async () => {
    setResetting(true);
    try {
      await resetInviteLink(officeId);
      setConfirming(false);
    } finally {
      setResetting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
        <Link2 className="size-4 text-muted-foreground" />
        {t("linkTitle")}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-10 min-w-0 flex-1 items-center rounded-full bg-muted px-4">
          {shown ? (
            <span className="truncate text-[13px] text-foreground" dir="ltr">
              {shown}
            </span>
          ) : (
            <span className="h-3 w-48 animate-pulse rounded-full bg-foreground/[0.08]" />
          )}
        </div>
        <Button size="sm" variant="secondary" disabled={!link} onClick={onShare} className="h-10 shrink-0 gap-1.5 px-4 text-[13px]">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("copied") : t("copy")}
        </Button>
        {admin && <IconButton label={t("resetLink")} size="md" icon={<RotateCcw />} onClick={() => setConfirming(true)} disabled={!link} />}
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("resetTitle")}
        description={t("resetBody")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="ghost" size="sm" className="h-10 px-4" onClick={() => setConfirming(false)}>
              {tc("cancel")}
            </Button>
            <Button size="sm" className="h-10 px-5" disabled={resetting} onClick={reset}>
              {t("resetLink")}
            </Button>
          </>
        }
      />
    </section>
  );
}
