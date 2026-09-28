"use client";

import { PlansSoon } from "@/components/ui/PlansSoon";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Copy, Link2, MoreHorizontal, RotateCcw, Shield, ShieldOff, UserMinus, UserPlus } from "lucide-react";
import { dmChannelId } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { lobbyPath, officeChatPath, officePath, shareUrl } from "@/lib/links";
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
import { MemberCard } from "./MemberCard";
import { Link } from "@/lib/i18n/navigation";
import { withPostHog } from "@/lib/analytics";
import { usePlans } from "@/lib/billing";

/** People: an office's members and who can come in, or who is in the lobby now. */
export function PeopleView() {
  const place = usePlace();
  return place.kind === "office" ? <OfficePeople /> : <LobbyPeople />;
}

/** Who is in the office, and the one link that brings more people in. */
function OfficePeople() {
  const t = useTranslations("office.people");
  const router = useRouter();
  const { user } = useAuth();
  const { office, overview: data, readAt, refresh } = useOffice();
  const floor = useFloorStatus();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
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

  const admin = office.role === "admin";
  const members = data.members;
  const used = data.members.length;
  const full = used >= office.seats;

  // The same link every time: on a phone the share sheet, on a desktop the clipboard.
  const invite = () => {
    if (!link) return;
    withPostHog((posthog) => posthog.capture("office_invite_shared"));
    void share(link, "invite");
  };

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("subtitle", { office: office.name })}</p>
          </div>
          <Button size="md" disabled={!link} onClick={invite} className="h-10 gap-2 px-4 text-[13px]">
            {copied === "invite" ? <Check className="size-4" /> : <UserPlus className="size-4" />}
            {copied === "invite" ? t("linkCopied") : t("invite")}
          </Button>
        </header>

        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr]">
          <Seats used={used} seats={office.seats} full={full} />
          <OnTheFloor
            people={members.filter((one) => floor.has(one.id))}
            alone={members.filter((one) => floor.has(one.id) && one.id !== user?.id).length === 0}
            status={floor}
            empty={t("nobodyOnFloor")}
            action={
              <Chip icon={<UserPlus />} onClick={invite}>
                {t("invite")}
              </Chip>
            }
            title={t("onFloorNow", { count: members.filter((one) => floor.has(one.id)).length })}
          />
        </div>

        {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

        <InviteLink link={link} admin={admin} officeId={office.id} onShare={invite} copied={copied === "invite"} />

        <h2 className="mb-4 mt-10 flex items-baseline gap-2 text-[15px] font-semibold text-foreground">
          {t("members")}
          <span className="text-[13px] font-normal tabular-nums text-muted-foreground">{members.length}</span>
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => {
            const isMe = member.id === user?.id;
            const owner = member.id === office.owner;
            return (
              <MemberCard
                key={member.id}
                id={member.id}
                name={member.displayName}
                detail={member.email ?? t("noEmail")}
                presence={floor.get(member.id) ?? null}
                role={owner ? t("owner") : t(member.role)}
                joinedAt={member.joinedAt}
                isMe={isMe}
                onProfile={() => router.push("/account")}
                onMessage={() => user && router.push(officeChatPath(office.id, dmChannelId(user.id, member.id)))}
                onWalk={() => {
                  router.push(officePath(office.id));
                  walkToPerson(member.id);
                }}
                menu={
                  admin && !owner ? (
                    <Menu
                      align="end"
                      width={208}
                      trigger={<IconButton label={t("more")} size="sm" icon={<MoreHorizontal />} bare />}
                    >
                      <MenuItem
                        icon={member.role === "admin" ? <ShieldOff /> : <Shield />}
                        onSelect={() =>
                          run(() => api.setRole(office.id, member.id, member.role === "admin" ? "member" : "admin").then())
                        }
                      >
                        {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                      </MenuItem>
                      <MenuSeparator />
                      <MenuItem
                        danger
                        icon={<UserMinus />}
                        onSelect={() => run(() => api.removeMember(office.id, member.id).then())}
                      >
                        {isMe ? t("leave") : t("remove")}
                      </MenuItem>
                    </Menu>
                  ) : undefined
                }
              />
            );
          })}
          {admin && full && <OfficeFull />}
          {admin && !full && (
            <li>
              <button
                type="button"
                onClick={invite}
                disabled={!link}
                className="flex h-full min-h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <UserPlus className="size-5" />
                {t("seatsLeft", { count: office.seats - used })}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** Seats as a meter: how many are taken, and whether there is room. */
function Seats({ used, seats, full }: { used: number; seats: number; full: boolean }) {
  const t = useTranslations("office.people");
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-foreground">{t("seats", { used, seats })}</p>
        <p className={cn("text-[12px]", full ? "text-warn" : "text-muted-foreground")}>
          {full ? t("seatsFull") : t("seatsFree")}
        </p>
      </div>
      {/* One segment a seat while they are countable; a bar once they are not. */}
      {seats <= 20 ? (
        <div className="mt-3 flex gap-1" aria-hidden>
          {Array.from({ length: seats }, (_, index) => (
            <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < used ? "bg-foreground" : "bg-muted")} />
          ))}
        </div>
      ) : (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, (used / seats) * 100)}%` }} />
        </div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{t("seatsNote")}</p>
      <PlansSoon className="mt-2" />
    </div>
  );
}

function OnTheFloor({
  people,
  status,
  title,
  empty,
  action,
  alone,
}: {
  alone: boolean;
  people: Array<{ id: string; displayName: string }>;
  status: Map<string, string>;
  title: string;
  empty: string;
  action: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4 [--face-ring:var(--ui-muted)]">
      <p className="text-[14px] font-semibold text-foreground">{title}</p>
      {people.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {people.map((one) => (
            <span key={one.id} className="flex items-center gap-2 rounded-full bg-muted py-1 ps-1 pe-3">
              <Face seed={one.id} size={24} presence={(status.get(one.id) as never) ?? null} />
              <span className="text-[13px] text-foreground">{one.displayName}</span>
            </span>
          ))}
          {alone && (
            <>
              <span className="text-[13px] text-muted-foreground">{empty}</span>
              <span className="ms-auto">{action}</span>
            </>
          )}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted-foreground">{empty}</p>
          {action}
        </div>
      )}
    </div>
  );
}

/**
 * The lobby's people: whoever is on this floor right now, as the same cards an
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
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {here.map((one) => (
              <MemberCard
                key={one.id}
                id={one.id}
                name={one.name}
                presence={one.status}
                isMe={one.id === user?.id}
                onProfile={user?.guest ? undefined : () => router.push("/account")}
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
 * Every seat taken, as its admins see it: where paid plans are on, the way to
 * more seats; until then, that more are coming.
 */
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
    <section className="mt-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Link2 className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">{t("linkTitle")}</p>
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("linkBody")}</p>
        </div>
      </div>
      <div className="mt-3.5 flex items-center gap-2">
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
        {admin && (
          <IconButton label={t("resetLink")} size="md" icon={<RotateCcw />} onClick={() => setConfirming(true)} disabled={!link} />
        )}
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

function OfficeFull() {
  const t = useTranslations("office.people");
  const settingsPath = usePlace().paths.settings;
  const tb = useTranslations("billing");
  const plans = usePlans();
  return (
    <li>
      <div className="flex h-full min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong px-4 text-center">
        <p className="text-[13.5px] font-medium text-foreground">{t("allSeatsTaken")}</p>
        {plans?.billing ? (
          <Link
            href={`${settingsPath}#plan`}
            className="mt-1.5 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85"
          >
            {tb("moreSeats")}
          </Link>
        ) : (
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("allSeatsTakenBody")}</p>
        )}
      </div>
    </li>
  );
}
