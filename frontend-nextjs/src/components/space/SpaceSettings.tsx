"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, type Member, type Workspace } from "@/lib/api";
import { Button, Card, CardTitle, ErrorText, fieldClass } from "@/components/workspace/ui";
import { useErrorMessage } from "@/components/workspace/useErrorMessage";

/** Rename, hand over, leave or close a space. What shows depends on your role. */
export function SpaceSettings({
  workspace,
  members,
  currentUserId,
  onChanged,
  onGone,
}: {
  workspace: Workspace;
  members: Member[];
  currentUserId: string;
  onChanged: () => Promise<void>;
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

  return (
    <div className="space-y-4">
      {canRename && (
        <Card>
          <CardTitle title={t("name")} detail={t("nameDetail")} />
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!currentName.trim()) return;
              void run("rename", async () => {
                await api.renameWorkspace(workspace.id, currentName.trim());
                await onChanged();
                setName(null);
              });
            }}
          >
            <input
              aria-label={t("name")}
              value={currentName}
              onChange={(event) => setName(event.target.value)}
              maxLength={48}
              className={fieldClass}
            />
            <Button
              type="submit"
              variant="primary"
              busy={busy === "rename"}
              disabled={!currentName.trim() || currentName.trim() === workspace.name}
            >
              {t("save")}
            </Button>
          </form>
        </Card>
      )}

      {isOwner && others.length > 0 && (
        <Card>
          <CardTitle title={t("transfer")} detail={t("transferHint")} />
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="sr-only" htmlFor="space-owner">
              {t("choosePerson")}
            </label>
            <select
              id="space-owner"
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
                  await onChanged();
                  setNewOwner("");
                })
              }
            >
              {t("transferButton")}
            </Button>
          </div>
        </Card>
      )}

      <div className="rounded-[1.5rem] border border-red-100 bg-red-50/40 p-5">
        {isOwner ? (
          <>
            <p className="font-body text-[15px] font-semibold text-red-700">{t("deleteTitle")}</p>
            <p className="font-body text-[13px] text-red-700/75 mt-1 mb-3">{t("deleteBody", { name: workspace.name })}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                aria-label={t("deleteConfirmLabel")}
                value={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.value)}
                placeholder={workspace.name}
                className={fieldClass}
              />
              <Button
                variant="danger"
                busy={busy === "delete"}
                disabled={confirmDelete.trim() !== workspace.name}
                onClick={() =>
                  run("delete", async () => {
                    await api.deleteWorkspace(workspace.id);
                    onGone();
                  })
                }
              >
                {t("deleteButton")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="font-body text-[15px] font-semibold text-red-700">{t("leaveTitle")}</p>
            <p className="font-body text-[13px] text-red-700/75 mt-1 mb-3">{t("leaveBody", { name: workspace.name })}</p>
            <Button
              variant="danger"
              busy={busy === "leave"}
              onClick={() =>
                run("leave", async () => {
                  await api.removeMember(workspace.id, currentUserId);
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
  );
}
