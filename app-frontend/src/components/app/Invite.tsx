"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Check, Copy, Mail, MessageSquare, Share } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { useUpgrade } from "@/components/billing/Upgrade";
import { track, withPostHog } from "@/lib/analytics";
import { resetInviteLink, useInviteLink } from "@/lib/inviteLink";
import { shareUrl } from "@/lib/links";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";
import { useOfficeMaybe } from "./OfficeShell";

/**
 * Bringing people in (docs/product.md). One dialog, opened from wherever someone
 * invites: the floor, People, the office menu. The link first, with one
 * button to copy it; then the other ways people actually send it, as plain
 * rows: a message to paste into the team's chat, an email from their own
 * address, the phone's share sheet. An office with no room says so instead,
 * with the way to more.
 */
const Context = createContext<(() => void) | null>(null);

/** Opens the invite dialog; null outside an office, and for members where only admins invite. */
export function useInvite(): (() => void) | null {
  return useContext(Context);
}

export function InviteProvider({ children }: { children: ReactNode }) {
  const context = useOfficeMaybe();
  const [open, setOpen] = useState(false);
  // Opened, against invite_sent: whether the dialog brings the team or loses them.
  const show = useCallback(() => {
    setOpen(true);
    track("invite_opened");
  }, []);
  // Every way to invite (the office menu, People, the chip on an empty floor) goes through here.
  const allowed = !!context && (context.office.invitePolicy !== "admins" || context.office.role === "admin");
  return (
    <Context.Provider value={allowed ? show : null}>
      {children}
      {allowed && <InviteDialog open={open} onClose={() => setOpen(false)} />}
    </Context.Provider>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("invite");
  const tc = useTranslations("common");
  const context = useOfficeMaybe();
  const { open: upgrade } = useUpgrade();
  if (!context) return null;
  const { office, overview } = context;
  const admin = office.role === "admin";
  const used = overview.members.length;
  const full = used >= office.seats;

  return (
    <Modal open={open} onClose={onClose} label={t("title", { office: office.name })} closeLabel={tc("close")} className="sm:max-w-[27rem]">
      <div className="px-5 pb-5 pt-6 sm:px-6">
        <h2 className="pe-10 text-[18px] font-semibold leading-snug tracking-tight text-foreground">{t("title", { office: office.name })}</h2>
        {!full && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{t("body")}</p>}

        {full ? (
          // No room: the link would only turn them away, so the way to more takes its place.
          <div className="mt-5 rounded-xl bg-muted/70 p-4">
            <p className="text-[13px] leading-relaxed text-foreground">{t("full", { office: office.name, seats: office.seats })}</p>
            {admin && upgrade ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  upgrade(office.plan === "free" && used > office.seats ? "over" : "full");
                }}
                className="mt-3 h-9 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85"
              >
                {t("keepPro")}
              </button>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">{t("fullMember")}</p>
            )}
          </div>
        ) : (
          <InviteActions officeId={office.id} officeName={office.name} className="mt-5" />
        )}

        {!full && <LinkFooter officeId={office.id} admin={admin} />}
      </div>
    </Modal>
  );
}

type Sent = "link" | "message" | null;

/**
 * The link and the ways to send it. Also the invite step when an office is
 * made, so the two never drift apart.
 */
export function InviteActions({ officeId, officeName, className }: { officeId: string; officeName: string; className?: string }) {
  const t = useTranslations("invite");
  const path = useInviteLink(officeId);
  const url = path ? shareUrl(path) : null;
  const [sent, setSent] = useState<Sent>(null);
  const message = url ? t("message", { office: officeName, url }) : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const tell = (channel: string) => withPostHog((posthog) => posthog.capture("invite_sent", { channel }));
  const copy = async (what: Exclude<Sent, null>) => {
    if (!url || !(await copyText(what === "link" ? url : message))) return;
    tell(what);
    setSent(what);
    setTimeout(() => setSent((now) => (now === what ? null : now)), 2000);
  };
  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: t("emailSubject", { office: officeName }), text: message.replace(url, "").trim(), url });
      tell("share");
    } catch {
      // Closing the sheet isn't a failure.
    }
  };
  const email = url
    ? `mailto:?${new URLSearchParams({ subject: t("emailSubject", { office: officeName }), body: message }).toString().replace(/\+/g, "%20")}`
    : undefined;

  return (
    <div className={className}>
      <p className="text-[12px] font-medium text-muted-foreground">{t("linkLabel")}</p>
      <div className="mt-1.5 flex gap-2">
        <span
          data-ph-mask
          dir="ltr"
          className="flex h-10 min-w-0 flex-1 items-center rounded-xl border border-border bg-background px-3 text-[13px] text-foreground"
        >
          {url ? (
            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
          ) : (
            <span className="inline-block h-3 w-40 animate-pulse rounded-full bg-muted" />
          )}
        </span>
        <button
          type="button"
          disabled={!url}
          onClick={() => copy("link")}
          className="flex h-10 w-[7.5rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/85 disabled:opacity-50"
        >
          {sent === "link" && <Check className="size-4" />}
          {sent === "link" ? t("copied") : t("copyLink")}
        </button>
      </div>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
        <Way
          icon={<MessageSquare />}
          title={t("copyMessage")}
          note={t("messageNote")}
          onClick={() => copy("message")}
          disabled={!url}
          end={sent === "message" ? <Check className="size-4 shrink-0 text-ok" /> : <Copy className="size-4 shrink-0 text-faint transition-colors group-hover:text-foreground" />}
        />
        <Way icon={<Mail />} title={t("email")} note={t("emailNote")} href={email} onClick={() => tell("email")} disabled={!url} />
        {canShare && <Way icon={<Share />} title={t("share")} note={t("shareNote")} onClick={share} disabled={!url} />}
      </div>
    </div>
  );
}

/** One way to send it: what it is, and a line on what it does. */
function Way({
  icon,
  title,
  note,
  href,
  onClick,
  disabled,
  end,
}: {
  icon: ReactNode;
  title: string;
  note: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  end?: ReactNode;
}) {
  const body = (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{note}</span>
      </span>
      {end ?? <ArrowUpRight className="size-4 shrink-0 text-faint transition-colors group-hover:text-foreground" />}
    </>
  );
  const style = cn(
    "group flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-muted/60",
    disabled && "pointer-events-none opacity-50",
  );
  return href ? (
    <a href={href} onClick={onClick} className={style}>
      {body}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={style}>
      {body}
    </button>
  );
}

/** What the link is, and for an admin the way to stop it working: asked first, in place. */
function LinkFooter({ officeId, admin }: { officeId: string; admin: boolean }) {
  const t = useTranslations("invite");
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try {
      await resetInviteLink(officeId);
      setAsking(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex min-h-8 items-center justify-between gap-3 text-[12px] text-muted-foreground">
      <span className="min-w-0">{asking ? t("resetAsk") : t("linkNote")}</span>
      {admin &&
        (asking ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="h-8 cursor-pointer rounded-full px-3 font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("keep")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={reset}
              className="h-8 cursor-pointer rounded-full bg-destructive/10 px-3 font-medium text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
            >
              {t("resetConfirm")}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            className="h-8 shrink-0 cursor-pointer rounded-full px-2.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {t("reset")}
          </button>
        ))}
    </div>
  );
}
