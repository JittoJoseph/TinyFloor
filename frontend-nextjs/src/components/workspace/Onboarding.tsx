"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { OfficeScene } from "@/components/OfficeScene";
import { inputClass, primaryButtonClass } from "@/components/entry/EntryShell";
import { Card, ErrorText, Label } from "./ui";
import { useErrorMessage } from "./useErrorMessage";

/** No workspace yet: name your office, and it comes with a first room to walk into. */
export function Onboarding({ onCreated }: { onCreated: (workspaceId: string) => void }) {
  const t = useTranslations("workspace.onboarding");
  const { user } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const { workspace } = await api.createWorkspace(name.trim());
      // A first room to walk into. If this fails, the workspace is still there to add one to.
      await api.createRoom(workspace.id, { name: t("firstRoom") }).catch(() => undefined);
      onCreated(workspace.id);
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  return (
    <Card className="!p-2.5 sm:!p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-2">
      <OfficeScene
        className="aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[22rem] rounded-[1.15rem] border border-black/10"
        zoom="auto max(470px, 100%)"
        focus="42% 79%"
        occupants={user ? [{ character: user.character, left: "50%", top: "79%", name: user.displayName, width: 44 }] : []}
      />
      <form onSubmit={create} className="entry-rise px-2 sm:px-3 pt-5 pb-2 lg:p-6 lg:self-center">
        <h1 className="font-body text-[1.6rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-1.5">
          {t("title")}
        </h1>
        <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-5">{t("subtitle")}</p>
        <Label htmlFor="workspace-name">{t("nameLabel")}</Label>
        <input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("namePlaceholder")}
          maxLength={48}
          autoFocus
          className={inputClass}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <button type="submit" disabled={!name.trim() || busy} className={`${primaryButtonClass} mt-5`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("create")}
          {!busy && <ArrowRight className="w-4 h-4 rtl:rotate-180" />}
        </button>
        <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-45 text-center mt-4">{t("freePlan")}</p>
      </form>
    </Card>
  );
}
