"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ExternalLink, Eye, EyeOff, KeyRound, Monitor, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { Button, Card, CardTitle, Dialog, ErrorText, fieldClass, Label } from "@/components/ui/forms";
import { Bust } from "@/components/ui/Bust";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { saveIdentity } from "@/lib/identity";
import { CharacterPicker } from "@/components/entry/CharacterPicker";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { cn } from "@/lib/utils";

/** The account page's sections, in order: the rail lists them, and each is a card with this id. */
export const ACCOUNT_SECTIONS = ["profile", "character", "signin", "appearance"] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

/** Your name and link, beside how people see them when they open your name in chat. */
export function ProfileSection() {
  const t = useTranslations("office.profile");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;
  const currentName = name ?? user.displayName;
  const currentLink = link ?? user.link ?? "";
  const changed = currentName.trim() !== user.displayName || currentLink.trim() !== (user.link ?? "");
  const shownLink = currentLink.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || !currentName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await updateProfile({ displayName: currentName.trim(), link: currentLink.trim() });
      setName(null);
      setLink(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="profile">
      <CardTitle title={t("sections.profile")} detail={t("profileNote")} />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]">
        <form onSubmit={save}>
          <Label htmlFor="profile-name">{t("name")}</Label>
          <input
            id="profile-name"
            value={currentName}
            onChange={(event) => setName(event.target.value)}
            maxLength={32}
            autoComplete="name"
            className={fieldClass}
          />
          <div className="mt-4">
            <Label htmlFor="profile-link">{t("link")}</Label>
          </div>
          <input
            id="profile-link"
            // Text rather than url: "yoursite.com" is how people write it, and the API adds the https://.
            type="text"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="off"
            spellCheck={false}
            value={currentLink}
            onChange={(event) => setLink(event.target.value)}
            placeholder={t("linkPlaceholder")}
            maxLength={200}
            className={fieldClass}
          />
          <p className="mt-1.5 text-[12px] text-muted-foreground">{t("linkNote")}</p>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" variant="primary" busy={busy} disabled={!changed || !currentName.trim()} className="mt-4">
            {saved ? <Check className="size-4" /> : null}
            {saved ? t("saved") : t("save")}
          </Button>
        </form>

        {/* As the card that opens from your name in chat has it, with what's typed so far. */}
        <div className="self-start rounded-2xl border border-border bg-background p-4 [--face-ring:var(--ui-background)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{t("preview")}</p>
          <div className="mt-3 flex items-center gap-3">
            <Bust character={user.character} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-foreground">{currentName.trim() || user.displayName}</p>
              {shownLink ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{shownLink}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-[12.5px] text-faint">{t("noLink")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Who you walk in as, everywhere: saved on the account the moment it's
 * picked, and remembered in this browser for the doors that ask.
 */
export function CharacterSection() {
  const t = useTranslations("office.profile");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [error, setError] = useState("");
  if (!user) return null;

  const pick = async (character: string) => {
    if (character === user.character) return;
    setError("");
    try {
      await updateProfile({ character });
      saveIdentity({ name: user.displayName, character });
    } catch (err) {
      setError(explain(err));
    }
  };

  return (
    <Card id="character">
      <CardTitle title={t("character")} detail={t("characterNote")} />
      <CharacterPicker value={user.character} onChange={pick} className="sm:grid-cols-8" />
      {error && <ErrorText>{error}</ErrorText>}
    </Card>
  );
}

/** The ways into your account: your password, and Google. */
export function SignInSection() {
  const t = useTranslations("office.profile");
  const { user, refresh } = useAuth();
  const explain = useErrorMessage();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;

  const connect = async (code: string) => {
    setBusy(true);
    setError("");
    try {
      await api.connectGoogle(code);
      await refresh();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="signin">
      <CardTitle title={t("sections.signin")} detail={user.email} />
      <ul className="divide-y divide-border rounded-2xl border border-border">
        <li className="flex flex-wrap items-center gap-3 p-4">
          <KeyRound className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-foreground">{t("password")}</span>
            <span className="block text-[12.5px] text-muted-foreground">{user.password ? t("passwordSet") : t("setPasswordDescription")}</span>
          </span>
          <Button onClick={() => setPasswordOpen(true)}>{user.password ? t("changePassword") : t("setPassword")}</Button>
        </li>
        {(googleAvailable || user.google) && (
          <li className="flex flex-wrap items-center gap-3 p-4">
            <GoogleMark />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-foreground">{t("google")}</span>
              <span className="block text-[12.5px] text-muted-foreground">{t("googleNote")}</span>
            </span>
            {user.google ? (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ok/10 px-3 text-[12.5px] font-medium text-ok">
                <Check className="size-3.5" />
                {t("googleConnected")}
              </span>
            ) : (
              <div className="w-full sm:w-56">
                <GoogleButton
                  label={t("connectGoogle")}
                  busy={busy}
                  onCode={connect}
                  onError={() => setError(explain(new ApiError(0, "google_failed", "")))}
                />
              </div>
            )}
          </li>
        )}
      </ul>
      {error && <ErrorText>{error}</ErrorText>}
      <PasswordDialog
        open={passwordOpen}
        first={!user.password}
        onClose={() => {
          setPasswordOpen(false);
          // A first password changes what the account can do; the session says so again.
          void refresh();
        }}
      />
    </Card>
  );
}

/** How the app looks to you, in this browser. */
export function AppearanceSection() {
  const t = useTranslations("office.profile");
  const ts = useTranslations("shell");
  const theme = useTheme();
  const themes: Array<{ value: ThemeChoice; icon: React.ReactNode }> = [
    { value: "system", icon: <Monitor className="size-4" /> },
    { value: "light", icon: <Sun className="size-4" /> },
    { value: "dark", icon: <Moon className="size-4" /> },
  ];
  return (
    <Card id="appearance">
      <CardTitle title={t("sections.appearance")} detail={t("themeNote")} />
      <div className="grid max-w-sm grid-cols-3 gap-2">
        {themes.map((one) => (
          <button
            key={one.value}
            type="button"
            aria-pressed={theme === one.value}
            onClick={() => setTheme(one.value)}
            className={cn(
              "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border text-[13px] transition-colors",
              theme === one.value
                ? "border-foreground/25 bg-muted font-medium text-foreground"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {one.icon}
            {ts(`themes.${one.value}`)}
          </button>
        ))}
      </div>
    </Card>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 shrink-0">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

/** Changing the password, or setting a first one for someone who has only used Google, which asks for no current password. */
function PasswordDialog({ open, first, onClose }: { open: boolean; first: boolean; onClose: () => void }) {
  const t = useTranslations("office.profile");
  const explain = useErrorMessage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const ready = (first || !!current) && next.length >= 8;

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
    if (!ready || busy) return;
    setBusy(true);
    setError("");
    try {
      await api.changePassword({ currentPassword: first ? "" : current, newPassword: next });
      setDone(true);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      title={first ? t("setPassword") : t("passwordTitle")}
      description={done ? undefined : first ? t("setPasswordDescription") : t("passwordDescription")}
      onClose={close}
    >
      {done ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-[14px] text-ok">
            <Check className="size-4" />
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
          {!first && (
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
          )}
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
                className="absolute end-1 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center text-foreground opacity-45 hover:opacity-80"
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className={`mt-2 flex items-center gap-1.5 text-[12px] ${next.length >= 8 ? "text-ok" : "text-foreground opacity-50"}`}>
              <Check className="size-3.5" />
              {t("passwordRule")}
            </p>
          </div>
          <p className="text-[12px] text-foreground opacity-55">{t("signsOutOthers")}</p>
          {error && <ErrorText>{error}</ErrorText>}
          <div className="flex justify-end gap-2">
            <Button onClick={close}>{t("cancel")}</Button>
            <Button type="submit" variant="primary" busy={busy} disabled={!ready}>
              {first ? t("setPassword") : t("changePassword")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
