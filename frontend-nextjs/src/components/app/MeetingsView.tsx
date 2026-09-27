"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Loader2, Phone, Video } from "lucide-react";
import { api, ApiError, type MeetGrant, type MeetingLive, type MeetingPerson, type MeetingRoom } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { withPostHog } from "@/lib/analytics";
import { CLIENT_ID, loadGoogle } from "@/components/auth/GoogleButton";
import { Button } from "@/components/motion/button/base";
import { Dialog } from "@/components/ui/Dialog";
import { Empty } from "@/components/ui/Empty";
import { useOffice } from "./OfficeShell";

const MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
/** How often the view asks who is in the meeting, while it is on screen. */
const POLL_MS = 15_000;
/** Meet opens here, so a second Join brings the same tab back rather than another. */
const MEET_TAB = "tinyfloor-meet";

type OAuth2 = Awaited<ReturnType<typeof loadGoogle>>["oauth2"];
type Meeting = Awaited<ReturnType<typeof api.meeting>>;

/**
 * Meetings: the office's Google Meet room, and who is in it right now
 * (docs/10-calls-and-meetings.md). Meet can't be framed, so Join opens it in
 * its own tab. Making the room needs the admin's Google permission for Meet,
 * asked for here and only here; if it is missing, or Google took it back, the
 * same button asks again.
 */
export function MeetingsView() {
  const t = useTranslations("office.meetings");
  const tc = useTranslations("common");
  const { office } = useOffice();
  const { user } = useAuth();
  const admin = office.role === "admin";

  const [room, setRoom] = useState<MeetingRoom | null>(null);
  const [live, setLive] = useState<MeetingLive | null>(null);
  const [google, setGoogle] = useState<MeetGrant>({ granted: false, email: null });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<"remove" | "replace" | null>(null);

  const show = useCallback((found: Meeting) => {
    setRoom(found.room);
    setLive(found.live);
    setGoogle(found.google);
    setLoaded(true);
    setFailed(false);
  }, []);
  const read = useCallback(() => api.meeting(office.id).then(show), [office.id, show]);

  // Read now, then keep "who's in it" fresh while the page is visible.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.meeting(office.id).then(
        (found) => !cancelled && show(found),
        () => {
          if (cancelled) return;
          setLoaded(true);
          setFailed(true);
        },
      );
    void load();
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [office.id, show]);

  // Google's script, ready before anyone presses Allow: the popup has to open
  // in the click itself, or the browser blocks it.
  const oauth2 = useRef<OAuth2 | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogle().then(
      (accounts) => {
        if (cancelled) return;
        oauth2.current = accounts.oauth2;
        setGoogleReady(true);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const explain = useCallback(
    (problem: unknown) => {
      const code = problem instanceof ApiError ? problem.code : "";
      const messages: Record<string, string> = {
        meet_permission_needed: t("needPermission"),
        meet_not_granted: t("notTicked"),
        meet_permission_reset: t("askAgain"),
        google_failed: t("googleFailed"),
        google_busy: t("googleBusy"),
        meet_failed: t("meetFailed"),
        meet_unavailable: t("unavailable"),
        network: t("offline"),
      };
      setError(messages[code] ?? t("wrong"));
    },
    [t],
  );

  const makeRoom = useCallback(
    async (replace: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const made = await api.createMeeting(office.id, replace);
        setRoom(made.room);
        withPostHog((posthog) => posthog.capture("meeting_room_created", { replaced: replace }));
        await read().catch(() => {});
      } catch (problem) {
        explain(problem);
        // The grant is gone: show the Allow button rather than a room we can't make.
        if (problem instanceof ApiError && problem.code === "meet_permission_needed") setGoogle({ granted: false, email: null });
      } finally {
        setBusy(false);
      }
    },
    [office.id, read, explain],
  );

  /**
   * Google's popup, asking only for Meet on top of what they already agreed to.
   * With the code, the API keeps the grant; then whatever was waiting on it runs.
   * Called straight from a click, so the popup isn't blocked.
   */
  const askGoogle = (then?: () => Promise<void>) => {
    if (!oauth2.current || !CLIENT_ID) return setError(t("googleBlocked"));
    setError(null);
    withPostHog((posthog) => posthog.capture("meet_permission_requested"));
    oauth2.current
      .initCodeClient({
        client_id: CLIENT_ID,
        scope: `openid email ${MEET_SCOPE}`,
        ux_mode: "popup",
        include_granted_scopes: true,
        login_hint: google.email ?? user?.email ?? undefined,
        callback: async (response) => {
          if (!response.code) {
            withPostHog((posthog) => posthog.capture("meet_permission_declined"));
            return setError(t("declined"));
          }
          setBusy(true);
          try {
            const allowed = await api.allowMeet(response.code);
            setGoogle(allowed.google);
            withPostHog((posthog) => posthog.capture("meet_permission_granted"));
            setBusy(false);
            if (then) await then();
            else await read().catch(() => {});
          } catch (problem) {
            setBusy(false);
            explain(problem);
          }
        },
        error_callback: (problem) => {
          if (problem.type !== "popup_closed") setError(t("googleBlocked"));
        },
      })
      .requestCode();
  };

  /** Make (or replace) the room; without a grant, one press asks Google first. */
  const make = (replace: boolean) => (google.granted ? void makeRoom(replace) : askGoogle(() => makeRoom(replace)));

  const join = () => {
    if (!room) return;
    withPostHog((posthog) => posthog.capture("meeting_joined"));
    window.open(room.uri, MEET_TAB)?.focus();
  };

  const copy = async () => {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(room.uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyFailed"));
    }
  };

  const remove = async () => {
    setConfirm(null);
    setBusy(true);
    setError(null);
    try {
      await api.forgetMeeting(office.id);
      setRoom(null);
      setLive(null);
    } catch (problem) {
      explain(problem);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    setError(null);
    try {
      setGoogle((await api.disallowMeet()).google);
      withPostHog((posthog) => posthog.capture("meet_permission_revoked"));
      await read().catch(() => {});
    } catch (problem) {
      explain(problem);
    } finally {
      setBusy(false);
    }
  };

  const madeIt = !!room?.createdBy && room.createdBy.id === user?.id;
  const creatorName = room?.createdBy?.displayName ?? "";

  return (
    <div className="absolute inset-0 z-[60] overflow-y-auto bg-card">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10">
        <header>
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">{t("subtitle", { office: office.name })}</p>
        </header>

        {error && (
          <p role="alert" className="mt-4 text-[13px] text-destructive">
            {error}
          </p>
        )}

        {!loaded ? (
          <div className="mt-10 flex justify-center text-muted-foreground" aria-busy>
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : failed && !room ? (
          <Empty className="mt-6" icon={<Video />} title={t("loadFailed")} actions={
            <Button size="sm" variant="secondary" onClick={() => void read().catch(() => setFailed(true))}>
              {t("retry")}
            </Button>
          } />
        ) : room ? (
          <section className="mt-6 grid gap-3">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-muted-foreground">{t("room")}</p>
                  <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{room.uri.replace(/^https:\/\//, "")}</p>
                  {room.createdBy && (
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {madeIt ? t("madeByYou") : t("madeBy", { name: creatorName })}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="md" variant="secondary" onClick={copy} className="h-10 gap-2 px-4 text-[13px]">
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied ? t("copied") : t("copy")}
                  </Button>
                  <Button size="md" onClick={join} className="h-10 gap-2 px-4 text-[13px]">
                    <Video className="size-4" />
                    {t("join")}
                    <ExternalLink className="size-3.5 opacity-70" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-5" aria-live="polite">
              <p className="text-[13px] font-medium text-muted-foreground">{t("inNow")}</p>
              <LiveBody
                live={live}
                madeIt={madeIt}
                creatorName={creatorName}
                admin={admin}
                busy={busy}
                onAllow={() => askGoogle()}
                onReplace={() => setConfirm("replace")}
              />
            </div>

            {admin && (
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-muted-foreground">
                <button type="button" disabled={busy} onClick={() => setConfirm("replace")} className="cursor-pointer hover:text-foreground hover:underline">
                  {t("replace")}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirm("remove")} className="cursor-pointer hover:text-foreground hover:underline">
                  {t("remove")}
                </button>
              </div>
            )}
          </section>
        ) : (
          <Empty
            className="mt-6"
            icon={<Video />}
            title={t("noRoomTitle")}
            body={
              admin ? (
                <>
                  {t("noRoomAdmin", { office: office.name })} {!google.granted && t("noRoomAdminPermission")}
                </>
              ) : (
                t("noRoomMember", { office: office.name })
              )
            }
            actions={
              admin ? (
                <Button size="md" disabled={busy || (!google.granted && !googleReady)} onClick={() => make(false)} className="h-10 gap-2 px-4 text-[13px]">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
                  {busy ? t("creating") : t("create")}
                </Button>
              ) : null
            }
          />
        )}

        {loaded && (admin || google.granted) && (
          <div className="mt-10 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-muted-foreground">
              <span>
                <span className="font-medium text-foreground">{t("yourGoogle")}</span>{" "}
                {google.granted ? t("allowedAs", { email: google.email ?? "" }) : t("notAllowed")}
              </span>
              {google.granted ? (
                <button type="button" disabled={busy} onClick={revoke} className="cursor-pointer hover:text-foreground hover:underline">
                  {t("revoke")}
                </button>
              ) : (
                <button type="button" disabled={busy || !googleReady} onClick={() => askGoogle()} className="cursor-pointer hover:text-foreground hover:underline">
                  {t("allow")}
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{t("permissionNote")}</p>
          </div>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "replace" ? t("replaceTitle") : t("removeTitle")}
        description={confirm === "replace" ? t("replaceBody") : t("removeBody")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setConfirm(null)}>
              {tc("cancel")}
            </Button>
            {confirm === "replace" ? (
              <Button
                size="sm"
                disabled={busy || (!google.granted && !googleReady)}
                className="h-9 px-4"
                onClick={() => {
                  setConfirm(null);
                  make(true);
                }}
              >
                {t("replaceIt")}
              </Button>
            ) : (
              <Button size="sm" disabled={busy} className="h-9 bg-destructive px-4 text-white hover:bg-destructive/90" onClick={remove}>
                {t("removeIt")}
              </Button>
            )}
          </>
        }
      />
    </div>
  );
}

/** Who is in the meeting, or why we can't tell and what would fix it. */
function LiveBody({
  live,
  madeIt,
  creatorName,
  admin,
  busy,
  onAllow,
  onReplace,
}: {
  live: MeetingLive | null;
  madeIt: boolean;
  creatorName: string;
  admin: boolean;
  busy: boolean;
  onAllow: () => void;
  onReplace: () => void;
}) {
  const t = useTranslations("office.meetings");
  const note = (text: string, action?: React.ReactNode) => (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <p className="text-[13.5px] text-muted-foreground">{text}</p>
      {action}
    </div>
  );

  if (!live || live.status === "unavailable") return note(t("cantSee"));
  if (live.status === "creator_gone") {
    return note(
      t("creatorGone"),
      admin && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onReplace}>
          {t("replace")}
        </Button>
      ),
    );
  }
  if (live.status === "creator_permission") {
    if (madeIt) {
      return note(
        t("yourPermissionGone"),
        <Button size="sm" variant="secondary" disabled={busy} onClick={onAllow}>
          {t("allow")}
        </Button>,
      );
    }
    return note(
      t("creatorPermissionGone", { name: creatorName }),
      admin && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={onReplace}>
          {t("replace")}
        </Button>
      ),
    );
  }
  if (live.status !== "live") return note(t("cantSee"));
  if (live.people.length === 0) return note(t("nobody"));
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {live.people.map((person, index) => (
        <Person key={`${person.name}-${person.since}-${index}`} person={person} />
      ))}
    </ul>
  );
}

function Person({ person }: { person: MeetingPerson }) {
  const t = useTranslations("office.meetings");
  const format = useFormatter();
  const now = useNow({ updateInterval: 30_000 });
  const since = person.since ? new Date(person.since) : null;
  return (
    <li className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] text-foreground">
      {person.kind === "phone" && <Phone className="size-3.5 text-muted-foreground" aria-hidden />}
      <span className="max-w-[16rem] truncate">{person.name || t("unnamed")}</span>
      {person.kind !== "signed_in" && <span className="text-[11.5px] text-muted-foreground">{t(person.kind === "guest" ? "guest" : "phone")}</span>}
      {since && !Number.isNaN(since.getTime()) && (
        <span className="text-[11.5px] text-muted-foreground">· {format.relativeTime(since, now)}</span>
      )}
    </li>
  );
}
