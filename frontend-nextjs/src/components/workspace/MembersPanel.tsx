"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { MoreHorizontal, UserPlus } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";
import { api, type Invite, type Member, type Workspace } from "@/lib/api";
import { invitePath, shareUrl } from "@/lib/links";
import { Badge, Button, Card, CardTitle, CopyField, Dialog, ErrorText, fieldClass, Label } from "./ui";
import { useErrorMessage } from "./useErrorMessage";

export function MembersPanel({
  workspace,
  members,
  invites,
  currentUserId,
  onChanged,
  onLeft,
}: {
  workspace: Workspace;
  members: Member[];
  /** Invites that can still be used; empty unless you manage the workspace. */
  invites: Invite[];
  currentUserId: string;
  onChanged: () => Promise<void>;
  onLeft: () => void;
}) {
  const t = useTranslations("workspace.members");
  const format = useFormatter();
  const explain = useErrorMessage();
  const manages = workspace.role === "owner" || workspace.role === "admin";
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const full = workspace.members >= workspace.memberLimit;

  const act = async (action: () => Promise<unknown>, after?: () => void) => {
    setError("");
    try {
      await action();
      if (after) after();
      else await onChanged();
    } catch (err) {
      setError(explain(err));
    }
  };

  return (
    <Card>
      <CardTitle
        title={t("title")}
        detail={full ? t("full", { limit: workspace.memberLimit }) : t("detail", { count: workspace.members, limit: workspace.memberLimit })}
        action={
          manages && (
            <Button variant="primary" onClick={() => setInviting(true)} disabled={full}>
              <UserPlus className="w-4 h-4" />
              {t("invite")}
            </Button>
          )
        }
      />

      <ul className="divide-y divide-black/5">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isYou={member.id === currentUserId}
            viewerRole={workspace.role}
            onRole={(role) => act(() => api.setRole(workspace.id, member.id, role))}
            onRemove={() =>
              act(
                () => api.removeMember(workspace.id, member.id),
                member.id === currentUserId ? onLeft : undefined,
              )
            }
          />
        ))}
      </ul>

      {manages && invites.length > 0 && (
        <div className="mt-5">
          <Label>{t("pending")}</Label>
          <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="font-body text-[13px] text-[var(--color-braun-text)] truncate">
                    {invite.email ?? t("anyoneWithLink")}
                  </p>
                  <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-50">
                    {t("inviteMeta", {
                      role: t(`roleNames.${invite.role}`),
                      date: format.dateTime(new Date(invite.expiresAt), { dateStyle: "medium" }),
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="h-8 px-3 text-red-600"
                  onClick={() => act(() => api.revokeInvite(workspace.id, invite.id))}
                >
                  {t("revoke")}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <ErrorText>{error}</ErrorText>}

      <InviteDialog
        open={inviting}
        workspace={workspace}
        onClose={() => {
          setInviting(false);
          void onChanged();
        }}
      />
    </Card>
  );
}

function MemberRow({
  member,
  isYou,
  viewerRole,
  onRole,
  onRemove,
}: {
  member: Member;
  isYou: boolean;
  viewerRole: Workspace["role"];
  onRole: (role: "admin" | "member") => void;
  onRemove: () => void;
}) {
  const t = useTranslations("workspace.members");
  const [menuOpen, setMenuOpen] = useState(false);

  // Owners manage everyone; admins can remove members; anyone but the owner can leave.
  const canChangeRole = viewerRole === "owner" && member.role !== "owner";
  const canRemove =
    member.role !== "owner" && (isYou || viewerRole === "owner" || (viewerRole === "admin" && member.role === "member"));
  const hasMenu = canChangeRole || canRemove;
  const item =
    "cursor-pointer w-full px-3 py-2 rounded-lg font-body text-[13px] text-start hover:bg-black/[0.04] transition-colors";

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="relative w-10 h-10 rounded-xl bg-[#f0f0eb] overflow-hidden shrink-0" style={{ containerType: "size" }}>
        <PixelAvatar character={member.character} width="60cqw" style={{ left: "50%", top: "92%" }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-body text-[14px] font-medium text-[var(--color-braun-text)] truncate">
          {member.displayName}
          {isYou && <span className="opacity-45 font-normal"> ({t("you")})</span>}
        </p>
      </div>
      <Badge tone={member.role === "owner" ? "accent" : "neutral"}>{t(`roleNames.${member.role}`)}</Badge>
      {hasMenu ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t("options", { name: member.displayName })}
            aria-expanded={menuOpen}
            className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.05] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute end-0 top-9 z-40 w-44 rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
                {canChangeRole && (
                  <button
                    type="button"
                    className={`${item} text-[var(--color-braun-text)]`}
                    onClick={() => {
                      setMenuOpen(false);
                      onRole(member.role === "admin" ? "member" : "admin");
                    }}
                  >
                    {member.role === "admin" ? t("makeMember") : t("makeAdmin")}
                  </button>
                )}
                {canRemove && (
                  <button
                    type="button"
                    className={`${item} text-red-600`}
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove();
                    }}
                  >
                    {isYou ? t("leave") : t("remove")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <span className="w-8" />
      )}
    </li>
  );
}

function InviteDialog({ open, workspace, onClose }: { open: boolean; workspace: Workspace; onClose: () => void }) {
  const t = useTranslations("workspace.members");
  const explain = useErrorMessage();
  const [role, setRole] = useState<"member" | "admin">("member");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setLink(null);
    setEmail("");
    setRole("member");
    setError("");
    onClose();
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { invite } = await api.createInvite(workspace.id, { role, ...(email.trim() ? { email: email.trim() } : {}) });
      setLink(shareUrl(invitePath(invite.token)));
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} title={t("inviteTitle", { workspace: workspace.name })} description={t("inviteDescription")} onClose={close}>
      {link ? (
        <div className="space-y-3">
          <CopyField value={link} />
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-55">
            {email.trim() ? t("linkForEmail", { email: email.trim() }) : t("linkForAnyone")}
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close}>
              {t("done")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={create} className="space-y-4">
          {workspace.role === "owner" && (
            <div>
              <Label>{t("roleLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["member", "admin"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={role === option}
                    onClick={() => setRole(option)}
                    className={`cursor-pointer rounded-xl border p-3 text-start transition-colors ${
                      role === option ? "border-[var(--color-braun-text)]/40 bg-white shadow-sm" : "border-black/10 bg-[#fbfbf9] hover:bg-white"
                    }`}
                  >
                    <span className="block font-body text-[13px] font-semibold text-[var(--color-braun-text)]">
                      {t(`roleNames.${option}`)}
                    </span>
                    <span className="block font-body text-[12px] text-[var(--color-braun-text)] opacity-55 mt-0.5">
                      {t(`roleHints.${option}`)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="invite-email">{t("emailLabel")}</Label>
            <input
              id="invite-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("emailPlaceholder")}
              className={fieldClass}
            />
            <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-50 mt-2">{t("emailHint")}</p>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={close}>{t("cancel")}</Button>
            <Button type="submit" variant="primary" busy={busy}>
              {t("createLink")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
