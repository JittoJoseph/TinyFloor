"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, KeyRound, Palette, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { saveIdentity } from "@/lib/identity";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Button } from "@/components/motion/button/base";
import { Dialog, ErrorText, fieldClass, Label } from "@/components/ui/forms";
import { LitFace } from "@/components/ui/LitFace";
import { CharacterPicker } from "@/components/entry/CharacterPicker";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { General, Group, Row } from "@/components/app/SettingsView";

type Section = "profile" | "signin" | "appearance";

const ICONS: Record<Section, ReactNode> = {
  profile: <UserRound />,
  signin: <KeyRound />,
  appearance: <Palette />,
};

const SECTIONS: Section[] = ["profile", "signin", "appearance"];

/**
 * Your account: who you are to everyone else, how you sign in, and how the
 * app looks to you, one section at a time under its title. The section is in
 * the address, so a link can open the right one.
 */
export function AccountView() {
  const t = useTranslations("office.profile");
  const td = useTranslations("dashboard");
  const reduce = useReducedMotion();
  const [section, setSection] = useState<Section>("profile");

  // Read once the page is in the browser, so the first render matches the server's.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("section") as Section | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted && SECTIONS.includes(wanted)) setSection(wanted);
  }, []);

  const open = (next: Section) => {
    setSection(next);
    const url = new URL(window.location.href);
    if (next === "profile") url.searchParams.delete("section");
    else url.searchParams.set("section", next);
    window.history.replaceState(null, "", url);
  };

  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-[640px]">
      {/* You, the way everyone else sees you: centered where there is room, beside your name on a phone. */}
      <div className="flex items-center gap-4 sm:flex-col sm:gap-0 sm:text-center">
        <LitFace seed={user.id} size={80} phone={60} />
        <div className="min-w-0 sm:mt-7">
          <p className="text-[13px] font-medium text-muted-foreground">{td("yourAccount")}</p>
          <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em] text-foreground sm:mt-0.5 sm:text-[30px] sm:tracking-[-0.025em]">
            {user.displayName}
          </h1>
          {user.email && <p className="truncate text-[13.5px] text-muted-foreground">{user.email}</p>}
        </div>
      </div>

      <div className="mt-8 flex sm:justify-center">
        <div role="tablist" className="grid w-full grid-cols-3 gap-1 rounded-full border border-border bg-card/60 p-1 sm:w-auto">
          {SECTIONS.map((one) => (
            <button
              key={one}
              type="button"
              role="tab"
              aria-selected={section === one}
              onClick={() => open(one)}
              className={cn(
                "relative flex h-9 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-[13.5px] transition-colors sm:px-4 [&_svg]:size-4",
                section === one ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {section === one && (
                <motion.span
                  layoutId="account-tab"
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                  className="absolute inset-0 rounded-full bg-foreground/[0.08]"
                />
              )}
              <span className="relative hidden sm:inline-flex">{ICONS[one]}</span>
              <span className="relative truncate">{t(`sections.${one}`)}</span>
            </button>
          ))}
        </div>
      </div>
      <div role="tabpanel" className="mt-10">
        {section === "profile" && <Profile />}
        {section === "signin" && <SignIn />}
        {section === "appearance" && <General />}
      </div>
    </div>
  );
}

/** A setting with a text field: side by side where there is room, stacked on a phone. */
function FieldRow({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-[13.5px] font-medium text-foreground">
          {title}
        </label>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="w-full sm:w-64">{children}</div>
    </div>
  );
}

const field =
  "h-9 w-full rounded-lg border border-border bg-card px-3 text-[16px] text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-faint focus:border-foreground/35 focus:ring-4 focus:ring-foreground/[0.06] sm:text-[13.5px]";

/** Who you are to everyone else: your name, your link, and who you walk in as. */
export function Profile() {
  const t = useTranslations("office.profile");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [name, setName] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [characterError, setCharacterError] = useState("");
  if (!user) return null;

  const currentName = name ?? user.displayName;
  const currentLink = link ?? user.link ?? "";
  const changed = currentName.trim() !== user.displayName || currentLink.trim() !== (user.link ?? "");

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

  // Saved the moment it's picked, and remembered in this browser for the doors that ask.
  const pick = async (character: string) => {
    if (character === user.character) return;
    setCharacterError("");
    try {
      await updateProfile({ character });
      saveIdentity({ name: user.displayName, character });
    } catch (err) {
      setCharacterError(explain(err));
    }
  };

  return (
    <>
      <Group title={t("sections.profile")} note={t("profileNote")}>
        <form onSubmit={save}>
          <div>
            <FieldRow id="profile-name" title={t("name")}>
              <input
                id="profile-name"
                value={currentName}
                onChange={(event) => setName(event.target.value)}
                maxLength={32}
                autoComplete="name"
                className={field}
              />
            </FieldRow>
          </div>
          <div className="border-t border-border">
            <FieldRow id="profile-link" title={t("link")} description={t("linkNote")}>
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
                className={field}
              />
            </FieldRow>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3">
            {error && <p className="me-auto text-[12.5px] text-destructive">{error}</p>}
            <Button type="submit" size="sm" disabled={busy || !changed || !currentName.trim()} className="h-8 gap-1.5 px-4 text-[13px]">
              {saved && <Check className="size-3.5" />}
              {saved ? t("saved") : t("save")}
            </Button>
          </div>
        </form>
      </Group>

      <Group title={t("character")} note={t("characterNote")}>
        <div className="p-3">
          <CharacterPicker value={user.character} onChange={pick} className="sm:grid-cols-8" />
          {characterError && <ErrorText>{characterError}</ErrorText>}
        </div>
      </Group>
    </>
  );
}

/** The ways into your account, and the way out of it. */
export function SignIn() {
  const t = useTranslations("office.profile");
  const ts = useTranslations("shell");
  const router = useRouter();
  const { user, refresh, signOut } = useAuth();
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
    <>
      <Group title={t("sections.signin")} note={user.email ?? undefined}>
        <Row
          title={t("password")}
          description={user.password ? t("passwordSet") : t("setPasswordDescription")}
          control={
            <Button variant="secondary" size="sm" onClick={() => setPasswordOpen(true)} className="h-8 px-3.5 text-[13px]">
              {user.password ? t("changePassword") : t("setPassword")}
            </Button>
          }
        />
        {(googleAvailable || user.google) && (
          <Row
            title={t("google")}
            description={t("googleNote")}
            control={
              user.google ? (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-ok/10 px-2.5 text-[12px] font-medium text-ok">
                  <Check className="size-3.5" />
                  {t("googleConnected")}
                </span>
              ) : (
                <div className="w-44">
                  <GoogleButton
                    label={t("connectGoogle")}
                    busy={busy}
                    onCode={connect}
                    onError={() => setError(explain(new ApiError(0, "google_failed", "")))}
                  />
                </div>
              )
            }
          />
        )}
        {error && <p className="px-4 py-3 text-[12.5px] text-destructive">{error}</p>}
      </Group>

      <Group title={ts("signOut")}>
        <Row
          title={ts("signOut")}
          description={t("signOutNote")}
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await signOut();
                router.replace("/");
              }}
              className="h-8 px-3.5 text-[13px] text-destructive"
            >
              {ts("signOut")}
            </Button>
          }
        />
      </Group>

      <PasswordDialog
        open={passwordOpen}
        first={!user.password}
        onClose={() => {
          setPasswordOpen(false);
          // A first password changes what the account can do; the session says so again.
          void refresh();
        }}
      />
    </>
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
            <Button size="sm" onClick={close} className="h-9 px-4 text-[13px]">
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
            <Button type="button" variant="secondary" size="sm" onClick={close} className="h-9 px-4 text-[13px]">
              {t("cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={busy || !ready} className="h-9 px-4 text-[13px]">
              {first ? t("setPassword") : t("changePassword")}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
