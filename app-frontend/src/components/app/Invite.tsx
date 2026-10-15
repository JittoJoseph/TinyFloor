"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Link2, Mail, MessageSquare, Refresh, Share, UserPlus, Zap } from "@/components/ui/icons";
import { FaceStack } from "@/components/ui/Face";
import { Modal } from "@/components/ui/Modal";
import { track, withPostHog } from "@/lib/analytics";
import { usePlans } from "@/lib/billing";
import { resetInviteLink, useInviteLink } from "@/lib/inviteLink";
import { shareUrl } from "@/lib/links";
import { copyText } from "@/lib/share";
import { cn } from "@/lib/utils";
import { PLAN_NAMES } from "@/components/billing/PlanCards";
import { useOfficeMaybe } from "./OfficeShell";

/**
 * Bringing people in (docs/product.md). One dialog, opened from wherever someone
 * invites: the floor, People, the office menu. A link alone isn't an invite,
 * so it comes ready to send the ways people actually do it: a message to
 * paste into the team's chat, an email from their own address, the phone's
 * share sheet. The faces of who's here, with places waiting, say what it's for.
 */
const Context = createContext<(() => void) | null>(null);

/** Opens the invite dialog; null outside an office. */
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
  return (
    <Context.Provider value={context ? show : null}>
      {children}
      {context && <InviteDialog open={open} onClose={() => setOpen(false)} />}
    </Context.Provider>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("invite");
  const tb = useTranslations("billing");
  const tc = useTranslations("common");
  const context = useOfficeMaybe();
  const plans = usePlans();
  if (!context) return null;
  const { office, overview } = context;
  const members = overview.members;
  const trial = office.plan === "free" && !!office.trialOpen && !!plans?.billing && !!plans.trialDays;

  return (
    <Modal open={open} onClose={onClose} label={t("title")} closeLabel={tc("close")} className="sm:max-w-[30rem]">
      <div className="px-6 pb-5 pt-7 sm:px-7">
        <Gathering ids={members.map((one) => one.id)} />
        <h2 className="mt-4 text-[20px] font-semibold leading-tight tracking-tight text-foreground">{t("title")}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{t("body", { office: office.name })}</p>

        <InviteActions officeId={office.id} officeName={office.name} className="mt-5" />

        {trial && (
          <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-muted px-3.5 py-2.5 text-[12.5px] leading-relaxed text-foreground">
            <Zap className="mt-0.5 size-3.5 shrink-0 text-brand" />
            {tb("trialWaiting", { free: office.seats, plan: PLAN_NAMES[plans?.trialPlan ?? "pro"], days: plans?.trialDays ?? 14 })}
          </p>
        )}

        <LinkFooter officeId={office.id} admin={office.role === "admin"} />
      </div>
    </Modal>
  );
}

/**
 * Who's here already, as one stack, and the next seat in it, empty: the
 * office filling up. The seat overlaps the last face like another face would.
 */
function Gathering({ ids }: { ids: string[] }) {
  return (
    <span className="flex items-center [--face-ring:var(--ui-card)]" aria-hidden>
      <FaceStack seeds={ids} size={40} max={4} />
      <span className="relative -ms-[13px] flex size-10 items-center justify-center rounded-full border-[1.5px] border-dashed border-border-strong bg-card text-faint ring-2 ring-[var(--ui-card)]">
        <UserPlus className="size-4" />
      </span>
    </span>
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
      <div className="flex h-12 items-center gap-1 rounded-full border border-border bg-background p-1 ps-4">
        <Link2 className="size-4 shrink-0 text-faint" />
        <span data-ph-mask className="min-w-0 flex-1 truncate ps-1.5 text-[13.5px] text-foreground" dir="ltr">
          {url ? url.replace(/^https?:\/\//, "") : <span className="inline-block h-3 w-40 animate-pulse rounded-full bg-muted" />}
        </span>
        <button
          type="button"
          disabled={!url}
          onClick={() => copy("link")}
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-colors hover:bg-foreground/85 disabled:opacity-50"
        >
          {sent === "link" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {sent === "link" ? t("copied") : t("copyLink")}
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Channel onClick={() => copy("message")} disabled={!url} icon={sent === "message" ? <Check /> : <MessageSquare />}>
          {sent === "message" ? t("copied") : t("copyMessage")}
        </Channel>
        <Channel href={email} onClick={() => tell("email")} disabled={!url} icon={<Mail />}>
          {t("email")}
        </Channel>
        {canShare && (
          <Channel onClick={share} disabled={!url} icon={<Share />}>
            {t("share")}
          </Channel>
        )}
      </div>
    </div>
  );
}

function Channel({
  href,
  onClick,
  disabled,
  icon,
  children,
}: {
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  const style = cn(
    "flex h-10 flex-auto cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border px-3.5 text-[12.5px] font-medium text-foreground transition-colors hover:bg-muted [&_svg]:size-3.5 [&_svg]:shrink-0",
    disabled && "pointer-events-none opacity-50",
  );
  return href ? (
    <a href={href} onClick={onClick} className={style}>
      {icon}
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={style}>
      {icon}
      {children}
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
  const note = asking ? t("resetAsk") : t("linkNote");

  return (
    <div className="mt-5 flex min-h-8 items-center justify-between gap-3 border-t border-border pt-4 text-[12px] text-muted-foreground">
      <span className="min-w-0">{note}</span>
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
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-2.5 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Refresh className="size-3.5" />
            {t("reset")}
          </button>
        ))}
    </div>
  );
}
