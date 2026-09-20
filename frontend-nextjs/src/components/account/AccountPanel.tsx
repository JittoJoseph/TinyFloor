"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button, Card, CardTitle, Dialog, ErrorText, fieldClass, Label } from "@/components/workspace/ui";
import { useErrorMessage } from "@/components/workspace/useErrorMessage";

/**
 * Your account: the name people see, your email, and your password. Which
 * character you walk in as isn't here; that's asked at the door of each space.
 */
export function AccountPanel() {
  const t = useTranslations("workspace.profile");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;
  const currentName = name ?? user.displayName;
  const changed = currentName.trim() !== user.displayName;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || !currentName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await updateProfile({ displayName: currentName.trim() });
      setName(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardTitle
        title={t("title")}
        detail={user.email}
        action={
          <Button onClick={() => setPasswordOpen(true)}>
            <KeyRound className="w-4 h-4" />
            {t("changePassword")}
          </Button>
        }
      />
      <form onSubmit={save} className="max-w-sm">
        <Label htmlFor="profile-name">{t("name")}</Label>
        <input
          id="profile-name"
          value={currentName}
          onChange={(event) => setName(event.target.value)}
          maxLength={32}
          className={fieldClass}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" variant="primary" busy={busy} disabled={!changed || !currentName.trim()} className="mt-4">
          {saved ? <Check className="w-4 h-4" /> : null}
          {saved ? t("saved") : t("save")}
        </Button>
      </form>
      <PasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </Card>
  );
}

function PasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("workspace.profile");
  const explain = useErrorMessage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setCurrent("");
    setNext("");
    setShow(false);
    setDone(false);
    setError("");
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!current || next.length < 8 || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      setDone(true);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} title={t("passwordTitle")} description={done ? undefined : t("passwordDescription")} onClose={close}>
      {done ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-body text-[14px] text-emerald-700">
            <Check className="w-4 h-4" />
            {t("passwordChanged")}
          </p>
          <div className="flex justify-end">
            <Button variant="primary" onClick={close}>
              {t("done")}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {/* Lets password managers know whose password this is. */}
          <input type="email" autoComplete="username" className="hidden" readOnly tabIndex={-1} aria-hidden />
          <div>
            <Label htmlFor="password-current">{t("currentPassword")}</Label>
            <input
              id="password-current"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label htmlFor="password-new">{t("newPassword")}</Label>
            <div className="relative">
              <input
                id="password-new"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                value={next}
                onChange={(event) => setNext(event.target.value)}
                className={`${fieldClass} pe-11`}
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                aria-label={show ? t("hidePasswords") : t("showPasswords")}
                className="cursor-pointer absolute end-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[var(--color-braun-text)] opacity-45 hover:opacity-80"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`mt-2 flex items-center gap-1.5 font-body text-[12px] ${next.length >= 8 ? "text-emerald-700" : "text-[var(--color-braun-text)] opacity-50"}`}>
              <Check className="w-3.5 h-3.5" />
              {t("passwordRule")}
            </p>
          </div>
          <p className="font-body text-[12px] text-[var(--color-braun-text)] opacity-55">{t("signsOutOthers")}</p>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end gap-2">
            <Button onClick={close}>{t("cancel")}</Button>
            <Button type="submit" variant="primary" busy={busy} disabled={!current || next.length < 8}>
              {t("changePassword")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
