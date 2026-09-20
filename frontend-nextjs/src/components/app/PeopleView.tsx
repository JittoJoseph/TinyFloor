"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Check, Link2, MessageSquare, MoreHorizontal, UserPlus, X } from "lucide-react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError, type OfficeOverview } from "@/lib/api";
import { chat } from "@/lib/ChatSocket";
import { guestLinkPath, invitePath, officeChatPath, shareUrl } from "@/lib/links";
import { shareLink } from "@/lib/share";
import { label, quietLabel } from "@/components/room/ui";
import { OfficeView, useOffice } from "./OfficeShell";

/** Who is in the office, who has been asked, and who can be let in as a guest. */
export function PeopleView() {
  const t = useTranslations("office.people");
  const format = useFormatter();
  const router = useRouter();
  const { user } = useAuth();
  const { office, refresh } = useOffice();
  const [data, setData] = useState<OfficeOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(await api.overview(office.id));
  }, [office.id]);

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
      setMenu(null);
    }
  };

  const admin = office.role === "admin";
  const full = (data?.members.length ?? office.members) >= office.seats;

  const share = async (path: string, key: string) => {
    const result = await shareLink(shareUrl(path));
    if (result !== "copied") return;
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <OfficeView
      title={t("title")}
      column={
        <div className="px-1 py-2 space-y-4">
          <div className="rounded-2xl bg-[var(--color-braun-text)]/[0.04] px-3.5 py-3">
            <p className={`${label} text-[var(--color-braun-text)]`}>
              {t("seats", { used: data?.members.length ?? office.members, seats: office.seats })}
            </p>
            <p className={quietLabel}>{full ? t("seatsFull") : t("seatsFree")}</p>
          </div>

          {data && data.people > 0 && (
            <p className={`${quietLabel} px-1`}>{t("onFloorNow", { count: data.people })}</p>
          )}

          {admin && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const { invite } = await api.createInvite(office.id, { role: "member" });
                  await share(invitePath(invite.token), `invite-${invite.id}`);
                })
              }
              className="cursor-pointer w-full h-10 rounded-full bg-[var(--color-braun-text)] text-white font-body text-[13px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {t("invite")}
            </button>
          )}
        </div>
      }
    >
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {error && <p className="font-body text-[13px] text-[var(--color-braun-orange)] mb-4">{error}</p>}

        <h3 className={`${label} text-[var(--color-braun-text)] mb-2`}>{t("members")}</h3>
        <ul className="rounded-2xl border border-black/[0.06] bg-[#fbfbf9] divide-y divide-black/[0.05] mb-8">
          {(data?.members ?? []).map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-9 h-9 rounded-full bg-[var(--color-braun-text)]/[0.06] flex items-center justify-center font-body text-[13px] font-semibold shrink-0">
                {member.displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block ${label} text-[var(--color-braun-text)] truncate`}>
                  {member.displayName}
                  {member.id === user?.id && <span className="opacity-45"> · {t("you")}</span>}
                </span>
                <span className={`block ${quietLabel} truncate`}>{member.email ?? t("noEmail")}</span>
              </span>

              <span className="hidden sm:block font-body text-[12px] text-[var(--color-braun-text)] opacity-55">
                {member.id === office.owner ? t("owner") : t(member.role)}
              </span>

              {member.id !== user?.id && (
                <button
                  type="button"
                  title={t("message")}
                  aria-label={t("message")}
                  onClick={() => router.push(officeChatPath(office.id, chat.openDm(member.id)))}
                  className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05]"
                >
                  <MessageSquare className="w-4 h-4 opacity-60" />
                </button>
              )}

              {admin && member.id !== office.owner && (
                <div className="relative">
                  <button
                    type="button"
                    title={t("more")}
                    aria-label={t("more")}
                    onClick={() => setMenu(menu === member.id ? null : member.id)}
                    className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05]"
                  >
                    <MoreHorizontal className="w-4 h-4 opacity-60" />
                  </button>
                  {menu === member.id && (
                    <div className="absolute end-0 top-9 z-10 w-48 rounded-2xl bg-white border border-black/[0.08] shadow-[0_18px_44px_-18px_rgba(0,0,0,0.35)] p-1.5">
                      <MenuItem
                        onClick={() =>
                          run(() =>
                            api.setRole(office.id, member.id, member.role === "admin" ? "member" : "admin").then(),
                          )
                        }
                      >
                        {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                      </MenuItem>
                      {member.id === user?.id ? (
                        <MenuItem danger onClick={() => run(() => api.removeMember(office.id, member.id).then())}>
                          {t("leave")}
                        </MenuItem>
                      ) : (
                        <MenuItem danger onClick={() => run(() => api.removeMember(office.id, member.id).then())}>
                          {t("remove")}
                        </MenuItem>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {admin && (
          <>
            <h3 className={`${label} text-[var(--color-braun-text)] mb-2`}>{t("invitations")}</h3>
            {data?.invites.length ? (
              <ul className="rounded-2xl border border-black/[0.06] bg-[#fbfbf9] divide-y divide-black/[0.05] mb-8">
                {data.invites.map((invitation) => (
                  <li key={invitation.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className={`block ${label} text-[var(--color-braun-text)] truncate`}>
                        {invitation.email ?? t("anyoneWithLink")}
                      </span>
                      <span className={`block ${quietLabel}`}>
                        {t("expires", { date: format.dateTime(new Date(invitation.expiresAt), { dateStyle: "medium" }) })}
                      </span>
                    </span>
                    <button
                      type="button"
                      title={t("revoke")}
                      aria-label={t("revoke")}
                      onClick={() => run(() => api.revokeInvite(office.id, invitation.id).then())}
                      className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05]"
                    >
                      <X className="w-4 h-4 opacity-60" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`${quietLabel} mb-8`}>{t("noInvitations")}</p>
            )}

            <h3 className={`${label} text-[var(--color-braun-text)] mb-2`}>{t("guests")}</h3>
            <p className={`${quietLabel} mb-3`}>{t("guestsNote")}</p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const { guestLink } = await api.createGuestLink(office.id, "7d");
                    await share(guestLinkPath(guestLink.token), `guest-${guestLink.id}`);
                  })
                }
                className="cursor-pointer h-10 px-4 rounded-full bg-white border border-black/[0.06] shadow-sm font-body text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50"
              >
                {copied?.startsWith("guest") ? (
                  <Check className="w-4 h-4 text-[var(--color-braun-green)]" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                {copied?.startsWith("guest") ? t("copied") : t("newGuestLink")}
              </button>
            </div>
            {data?.guestLinks.length ? (
              <ul className="rounded-2xl border border-black/[0.06] bg-[#fbfbf9] divide-y divide-black/[0.05]">
                {data.guestLinks.map((link) => (
                  <li key={link.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={`${quietLabel} flex-1`}>
                      {t("expires", { date: format.dateTime(new Date(link.expiresAt), { dateStyle: "medium" }) })}
                    </span>
                    <button
                      type="button"
                      title={t("revoke")}
                      aria-label={t("revoke")}
                      onClick={() => run(() => api.revokeGuestLink(office.id, link.id).then())}
                      className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05]"
                    >
                      <X className="w-4 h-4 opacity-60" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={quietLabel}>{t("noGuestLinks")}</p>
            )}
          </>
        )}
      </div>
    </OfficeView>
  );
}

function MenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer w-full text-start px-2.5 py-2 rounded-xl font-body text-[13px] font-semibold hover:bg-[#f5f5f2] ${
        danger ? "text-[var(--color-braun-orange)]" : "text-[var(--color-braun-text)]"
      }`}
    >
      {children}
    </button>
  );
}
