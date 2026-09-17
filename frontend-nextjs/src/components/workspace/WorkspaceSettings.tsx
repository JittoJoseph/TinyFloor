"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, type Member, type Workspace } from "@/lib/api";
import { Button, Dialog, ErrorText, fieldClass, Label } from "./ui";
import { useErrorMessage } from "./useErrorMessage";

/** Rename, hand over, leave or delete a workspace. What shows depends on your role. */
export function WorkspaceSettings({
  open,
  workspace,
  members,
  currentUserId,
  onClose,
  onRenamed,
  onGone,
}: {
  open: boolean;
  workspace: Workspace;
  members: Member[];
  currentUserId: string;
  onClose: () => void;
  onRenamed: () => Promise<void>;
  onGone: () => void;
}) {
  const t = useTranslations("workspace.settings");
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [newOwner, setNewOwner] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOwner = workspace.role === "owner";
  const canRename = isOwner || workspace.role === "admin";
  const currentName = name ?? workspace.name;
  const others = members.filter((member) => member.id !== currentUserId);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    setName(null);
    setNewOwner("");
    setConfirmDelete("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} title={t("title")} onClose={close}>
      <div className="space-y-6">
        {canRename && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!currentName.trim()) return;
              void run("rename", async () => {
                await api.renameWorkspace(workspace.id, currentName.trim());
                await onRenamed();
                setName(null);
              });
            }}
          >
            <Label htmlFor="workspace-rename">{t("name")}</Label>
            <div className="flex gap-2">
              <input
                id="workspace-rename"
                value={currentName}
                onChange={(event) => setName(event.target.value)}
                maxLength={48}
                className={fieldClass}
              />
              <Button type="submit" variant="primary" busy={busy === "rename"} disabled={!currentName.trim() || currentName.trim() === workspace.name}>
                {t("save")}
              </Button>
            </div>
          </form>
        )}

        {isOwner && others.length > 0 && (
          <div>
            <Label htmlFor="workspace-owner">{t("transfer")}</Label>
            <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-55 mb-2">{t("transferHint")}</p>
            <div className="flex gap-2">
              <select
                id="workspace-owner"
                value={newOwner}
                onChange={(event) => setNewOwner(event.target.value)}
                className={`${fieldClass} cursor-pointer`}
              >
                <option value="">{t("choosePerson")}</option>
                {others.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <Button
                busy={busy === "transfer"}
                disabled={!newOwner}
                onClick={() =>
                  run("transfer", async () => {
                    await api.transferOwnership(workspace.id, newOwner);
                    await onRenamed();
                    close();
                  })
                }
              >
                {t("transferButton")}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-red-100 bg-red-50/40 p-4">
          {isOwner ? (
            <>
              <p className="font-body text-[14px] font-semibold text-red-700">{t("deleteTitle")}</p>
              <p className="font-body text-[12px] text-red-700/75 mt-1 mb-3">{t("deleteBody", { name: workspace.name })}</p>
              <input
                aria-label={t("deleteConfirmLabel")}
                value={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.value)}
                placeholder={workspace.name}
                className={fieldClass}
              />
              <Button
                variant="danger"
                className="mt-3 w-full"
                busy={busy === "delete"}
                disabled={confirmDelete.trim() !== workspace.name}
                onClick={() =>
                  run("delete", async () => {
                    await api.deleteWorkspace(workspace.id);
                    close();
                    onGone();
                  })
                }
              >
                {t("deleteButton")}
              </Button>
            </>
          ) : (
            <>
              <p className="font-body text-[14px] font-semibold text-red-700">{t("leaveTitle")}</p>
              <p className="font-body text-[12px] text-red-700/75 mt-1 mb-3">{t("leaveBody", { name: workspace.name })}</p>
              <Button
                variant="danger"
                className="w-full"
                busy={busy === "leave"}
                onClick={() =>
                  run("leave", async () => {
                    await api.removeMember(workspace.id, currentUserId);
                    close();
                    onGone();
                  })
                }
              >
                {t("leaveButton")}
              </Button>
            </>
          )}
        </div>

        {error && <ErrorText>{error}</ErrorText>}
      </div>
    </Dialog>
  );
}
