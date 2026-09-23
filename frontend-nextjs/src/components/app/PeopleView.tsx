"use client";

import { PlansSoon } from "@/components/ui/PlansSoon";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowRight, Check, Link2, Send, MoreHorizontal, Shield, ShieldOff, UserMinus, UserPlus, X } from "lucide-react";
import { dmChannelId } from "@shared/chat";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type GuestLink, type Invite, type OfficeOverview } from "@/lib/api";
import { guestLinkPath, invitePath, lobbyPath, officeChatPath, officePath, shareUrl } from "@/lib/links";
import { shareLink } from "@/lib/share";
import { useFloor, useFloorStatus, walkToPerson } from "@/lib/floor";
import { Button } from "@/components/motion/button/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Face } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";
import { Chip, Empty } from "@/components/ui/Empty";
import { useOffice } from "./OfficeShell";
import { usePlace } from "./place";
import { MemberCard } from "./MemberCard";
import { Link } from "@/lib/i18n/navigation";

/** People: an office's members and who can come in, or who is in the lobby now. */
export function PeopleView() {
  const place = usePlace();
  return place.kind === "office" ? <OfficePeople /> : <LobbyPeople />;
}

/** Who is in the office, who has been asked, and who can be let in as a guest. */
function OfficePeople() {
  const t = useTranslations("office.people");
  const format = useFormatter();
  const router = useRouter();
  const { user } = useAuth();
  const { office, refresh } = useOffice();
  const floor = useFloorStatus();
  const [data, setData] = useState<OfficeOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState("members");

  const load = useCallback(async () => setData(await api.overview(office.id)), [office.id]);

  useEffect(() => {
    let cancelled = false;
    api.overview(office.id).then((found) => !cancelled && setData(found));
    return () => {
      cancelled = true;
    };
  }, [office.id]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      await refresh();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    } finally {
      setBusy(false);
    }
  };

  const share = async (path: string, key: string) => {
    const result = await shareLink(shareUrl(path));
    if (result !== "copied") return;
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const admin = office.role === "admin";
  const members = data?.members ?? [];
  const used = data?.members.length ?? office.members;
  const full = used >= office.seats;
  const expires = (at: number) => t("expires", { date: format.dateTime(new Date(at), { dateStyle: "medium" }) });

  const newGuestLink = () =>
    run(async () => {
      const { guestLink } = await api.createGuestLink(office.id, "7d");
      await share(guestLinkPath(guestLink.token), "guest");
    });

  const invite = () =>
    run(async () => {
      const { invite: made } = await api.createInvite(office.id, { role: "member" });
      await share(invitePath(made.token), "invite");
      setTab("invitations");
    });

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
            <p className="mt-1 text-[14px] text-muted-foreground">{t("subtitle", { office: office.name })}</p>
          </div>
          {admin && (
            <Button size="md" disabled={busy} onClick={invite} className="h-10 gap-2 px-4 text-[13px]">
              {copied === "invite" ? <Check className="size-4" /> : <UserPlus className="size-4" />}
              {copied === "invite" ? t("linkCopied") : t("invite")}
            </Button>
          )}
        </header>

        <div className="mt-6 grid gap-3 md:grid-cols-[minmax(0,20rem)_1fr]">
          <Seats used={used} seats={office.seats} full={full} />
          <OnTheFloor
            people={members.filter((one) => floor.has(one.id))}
            alone={members.filter((one) => floor.has(one.id) && one.id !== user?.id).length === 0}
            status={floor}
            empty={t("nobodyOnFloor")}
            action={
              admin ? (
                <Chip icon={<UserPlus />} onClick={invite}>
                  {t("invite")}
                </Chip>
              ) : null
            }
            title={t("onFloorNow", { count: members.filter((one) => floor.has(one.id)).length })}
          />
        </div>

        {error && <p className="mt-4 text-[13px] text-destructive">{error}</p>}

        <Tabs value={tab} onValueChange={setTab} variant="underline" className="mt-8">
          <TabsList className="w-full gap-2">
            <TabsTrigger value="members">
              {t("members")} <TabCount value={members.length} />
            </TabsTrigger>
            {admin && (
              <TabsTrigger value="invitations">
                {t("invitations")} <TabCount value={data?.invites.length ?? 0} />
              </TabsTrigger>
            )}
            {admin && (
              <TabsTrigger value="guests">
                {t("guests")} <TabCount value={data?.guestLinks.length ?? 0} />
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="members" className="mt-5">
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
              {admin && full && (
                <li>
                  <div className="flex h-full min-h-[132px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border-strong px-4 text-center">
                    <p className="text-[13.5px] font-medium text-foreground">{t("allSeatsTaken")}</p>
                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">{t("allSeatsTakenBody")}</p>
                  </div>
                </li>
              )}
              {admin && !full && (
                <li>
                  <button
                    type="button"
                    onClick={invite}
                    disabled={busy}
                    className="flex h-full min-h-[132px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <UserPlus className="size-5" />
                    {t("seatsLeft", { count: office.seats - used })}
                  </button>
                </li>
              )}
            </ul>
          </TabsContent>

          {admin && (
            <TabsContent value="invitations" className="mt-5">
              <p className="mb-4 max-w-2xl text-[13px] text-muted-foreground">{t("invitationsNote")}</p>
              <LinkList
                empty={
                  <Empty
                    icon={<Send />}
                    title={t("noInvitations")}
                    body={t("noInvitationsBody")}
                    actions={
                      <Chip solid icon={<UserPlus />} onClick={invite}>
                        {t("invite")}
                      </Chip>
                    }
                  />
                }
                items={(data?.invites ?? []).map((one: Invite) => ({
                  id: one.id,
                  icon: <UserPlus className="size-4" />,
                  title: one.email ?? t("anyoneWithLink"),
                  detail: expires(one.expiresAt),
                  onRevoke: () => run(() => api.revokeInvite(office.id, one.id).then()),
                }))}
                revoke={t("revoke")}
              />
            </TabsContent>
          )}

          {admin && (
            <TabsContent value="guests" className="mt-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-2xl text-[13px] text-muted-foreground">{t("guestsNote")}</p>
                {!!data?.guestLinks.length && <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  className="h-9 gap-2 px-3.5 text-[13px]"
                  onClick={newGuestLink}
                >
                  {copied === "guest" ? <Check className="size-4" /> : <Link2 className="size-4" />}
                  {copied === "guest" ? t("copied") : t("newGuestLink")}
                </Button>}
              </div>
              <LinkList
                empty={
                  <Empty
                    icon={<Link2 />}
                    title={t("noGuestLinks")}
                    body={t("noGuestLinksBody")}
                    actions={
                      <Chip solid icon={<Link2 />} onClick={newGuestLink}>
                        {t("newGuestLink")}
                      </Chip>
                    }
                  />
                }
                items={(data?.guestLinks ?? []).map((one: GuestLink) => ({
                  id: one.id,
                  icon: <Link2 className="size-4" />,
                  title: t("guestLink"),
                  detail: expires(one.expiresAt),
                  onRevoke: () => run(() => api.revokeGuestLink(office.id, one.id).then()),
                }))}
                revoke={t("revoke")}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function TabCount({ value }: { value: number }) {
  return (
    <span className="ms-1.5 rounded-full bg-muted px-1.5 text-[11px] font-medium leading-[18px] tabular-nums text-muted-foreground">
      {value}
    </span>
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

function LinkList({
  items,
  empty,
  revoke,
}: {
  items: Array<{ id: string; icon: ReactNode; title: string; detail: string; onRevoke: () => void }>;
  empty: ReactNode;
  revoke: string;
}) {
  if (!items.length) return <>{empty}</>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3 ps-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-foreground">{item.title}</span>
            <span className="block truncate text-[12px] text-muted-foreground">{item.detail}</span>
          </span>
          <IconButton label={revoke} size="sm" icon={<X />} onClick={item.onRevoke} />
        </li>
      ))}
    </ul>
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
