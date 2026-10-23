"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, KeyRound, Palette, Search, UserRound } from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { allZones, browserZone, offsetLabel, timeIn, zoneCity, zoneLabel } from "@/lib/timeZone";
import { useSitePage } from "@/lib/links";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { Button } from "@/components/motion/button/base";
import { Dialog, fieldClass } from "@/components/ui/forms";
import { LitFace } from "@/components/ui/LitFace";
import { CharacterStage } from "@/components/character/CharacterStage";
import { isPreset } from "@shared/character";
import { openCharacterCreator, warmCharacterCreator } from "@/components/character/creatorOpen";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { CodeField, CODE_LENGTH } from "@/components/auth/CodeField";
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
          {user.email && (
            <p data-ph-mask className="truncate text-[13.5px] text-muted-foreground">
              {user.email}
            </p>
          )}
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
  const tLook = useTranslations("look");
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
    <>
      <Group>
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
        {/* You as you walk in, the way the floor shows you, and the creator to change it (CharacterCreator, which saves it). */}
        <div className="flex items-center gap-4 px-4 py-3">
          <CharacterStage character={user.character} scale={2} ground={10} still className="h-28 w-[5.5rem] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-foreground">{isPreset(user.character) ? user.character : tLook("own")}</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{tLook(isPreset(user.character) ? "presetNote" : "ownNote")}</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={openCharacterCreator} onPointerEnter={warmCharacterCreator} className="h-8 px-3.5 text-[13px]">
            {tLook("change")}
          </Button>
        </div>
      </Group>

      <TimeZone />
    </>
  );
}

/** Your time zone, for the local time people see on your profile: your browser's, unless you pick one. */
function TimeZone() {
  const t = useTranslations("office.profile");
  const locale = useLocale();
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  if (!user) return null;

  const auto = user.timeZoneAuto !== false;
  const zone = (auto ? browserZone() : user.timeZone) ?? user.timeZone ?? null;
  const pick = async (next: string | null) => {
    setOpen(false);
    setError("");
    try {
      await updateProfile(next ? { timeZone: next } : { timeZone: null, ...(browserZone() ? { detectedZone: browserZone()! } : {}) });
    } catch (err) {
      setError(explain(err));
    }
  };

  return (
    <Group title={t("timeZone")} note={t("timeZoneNote")}>
      <Row
        title={auto ? t("timeZoneAuto") : zone ? zoneCity(zone) : t("timeZoneAuto")}
        description={zone ? [auto ? zoneCity(zone) : null, offsetLabel(zone), timeIn(zone, locale)].filter(Boolean).join(" · ") : undefined}
        control={
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="h-8 px-3.5 text-[13px]">
            {t("timeZoneChange")}
          </Button>
        }
      />
      {error && <p className="px-4 py-3 text-[12.5px] text-destructive">{error}</p>}
      {open && <ZonePicker current={auto ? null : zone} onPick={pick} onClose={() => setOpen(false)} />}
    </Group>
  );
}

/** Every zone, found by typing a city, with Automatic first. Only built while it's open. */
function ZonePicker({
  current,
  onPick,
  onClose,
}: {
  current: string | null;
  onPick: (zone: string | null) => void;
  onClose: () => void;
}) {
  const t = useTranslations("office.profile");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [zones] = useState(allZones);
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().replace(/\s+/g, "_");
    return words ? zones.filter((zone) => `${zone} ${zoneLabel(zone)}`.toLowerCase().replace(/\s+/g, "_").includes(words)) : zones;
  }, [zones, query]);
  const now = new Date();
  const here = browserZone();

  const option = (zone: string | null, title: string, detail: string, key: string) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => onPick(zone)}
        aria-pressed={zone === current}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-start transition-colors hover:bg-muted",
          zone === current && "bg-muted",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-[13.5px] text-foreground">{title}</span>
        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{detail}</span>
        <Check className={cn("size-3.5 shrink-0", zone === current ? "text-foreground" : "invisible")} />
      </button>
    </li>
  );

  return (
    <Dialog open title={t("timeZone")} description={t("timeZoneNote")} onClose={onClose}>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("timeZoneSearch")}
          aria-label={t("timeZoneSearch")}
          autoComplete="off"
          spellCheck={false}
          className={cn(fieldClass, "ps-10")}
        />
      </div>
      <ul className="-mx-2 mt-3 max-h-[min(20rem,50dvh)] overflow-y-auto overscroll-contain px-2">
        {!query.trim() && option(null, t("timeZoneAuto"), here ? `${zoneCity(here)} · ${timeIn(here, locale, now)}` : "", "auto")}
        {shown.map((zone) =>
          option(zone, zoneLabel(zone), `${offsetLabel(zone, now)} · ${timeIn(zone, locale, now)}`, zone),
        )}
        {!shown.length && <li className="px-2.5 py-6 text-center text-[13px] text-muted-foreground">{t("timeZoneNone")}</li>}
      </ul>
    </Dialog>
  );
}

/** The ways into your account, and the way out of it. */
export function SignIn() {
  const t = useTranslations("office.profile");
  const ts = useTranslations("shell");
  const home = useSitePage();
  const { user, refresh, signOut } = useAuth();
  const explain = useErrorMessage();
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
      <Group title={t("methods")} note={user.email ? <span data-ph-mask>{user.email}</span> : undefined}>
        {user.email &&
          (user.emailVerified === false ? (
            <ConfirmEmail email={user.email} />
          ) : (
            <Row title={t("emailCode")} description={t("emailCodeNote")} control={null} />
          ))}
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

      <Group title={t("thisBrowser")}>
        <Row
          title={t("signedInAs", { name: user.displayName })}
          description={t("signOutNote")}
          control={
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await signOut();
                window.location.assign(home);
              }}
              className="h-8 px-3.5 text-[13px] text-destructive"
            >
              {ts("signOut")}
            </Button>
          }
        />
      </Group>
    </>
  );
}

/**
 * An address never confirmed (accounts from before sign-in moved to email
 * codes): a code sent to it, typed in here, confirms it without signing in again.
 */
function ConfirmEmail({ email }: { email: string }) {
  const t = useTranslations("office.profile");
  const { refresh } = useAuth();
  const explain = useErrorMessage();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    setBusy(true);
    setError("");
    try {
      await api.sendMyCode();
      setSent(true);
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (value = code) => {
    if (busy || value.length !== CODE_LENGTH) return;
    setBusy(true);
    setError("");
    try {
      await api.verifyCode({ email, code: value });
      await refresh();
    } catch (err) {
      setError(explain(err));
      setCode("");
      // A spent code can't be tried again: the button to send a new one comes back.
      if (err instanceof ApiError && err.code === "code_expired") setSent(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Row
        title={t("confirmEmail")}
        description={sent ? t("confirmEmailSent") : t("confirmEmailNote")}
        control={
          sent ? null : (
            <Button variant="secondary" size="sm" disabled={busy} onClick={send} className="h-8 px-3.5 text-[13px]">
              {t("sendCode")}
            </Button>
          )
        }
      />
      {sent && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
          className="flex items-center gap-2 px-4 pb-4"
        >
          <CodeField
            value={code}
            onChange={(next) => {
              setCode(next);
              setError("");
            }}
            onComplete={(complete) => void confirm(complete)}
            invalid={!!error}
            disabled={busy}
            className="max-w-[220px] !h-10"
          />
          <Button type="submit" size="sm" disabled={busy || code.length !== CODE_LENGTH} className="h-10 px-4 text-[13px]">
            {t("confirm")}
          </Button>
        </form>
      )}
      {error && <p className="px-4 pb-3 text-[12.5px] text-destructive">{error}</p>}
    </div>
  );
}
