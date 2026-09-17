"use client";

import React, { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { EntryShell, Field, inputClass, primaryButtonClass } from "@/components/entry/EntryShell";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { CharacterPicker, CHARACTER_IDS } from "@/components/entry/CharacterPicker";
import { ErrorNote } from "@/components/entry/IdentityFields";
import { Turnstile, useTurnstileToken } from "./Turnstile";

export type AuthMode = "signin" | "signup";

const PASSWORD_MIN_LENGTH = 8;
type FieldName = "displayName" | "email" | "password";

/** Only paths on this site, so a crafted link can't bounce someone elsewhere after signing in. */
export function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-2 font-body text-[12px] text-red-600">
      {message}
    </p>
  ) : null;
}

export function AuthScreen({ initialMode, redirect }: { initialMode: AuthMode; redirect: string }) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const router = useRouter();
  const { user, isLoading, hasAccount, signIn, signUp } = useAuth();
  const ids = useId();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [character, setCharacter] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [arriving, setArriving] = useState(false);
  const turnstile = useTurnstileToken();

  const signingUp = mode === "signup";
  // A guest's name and character carry over into the account they create.
  const guest = user?.guest ? user : null;
  const name = displayName ?? guest?.displayName ?? "";
  const chosenCharacter = character ?? guest?.character ?? "Adam";
  const validCharacter = CHARACTER_IDS.includes(chosenCharacter) ? chosenCharacter : "Adam";

  // Already signed in with an account (or just did): carry on.
  useEffect(() => {
    if (!isLoading && hasAccount) router.replace(redirect);
  }, [isLoading, hasAccount, redirect, router]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    setFieldErrors({});
    setFormError(null);
    const params = new URLSearchParams(window.location.search);
    if (next === "signup") params.set("mode", "signup");
    else params.delete("mode");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const pickCharacter = (next: string) => {
    setCharacter(next);
    setArriving(true);
    setTimeout(() => setArriving(false), 700);
  };

  const validate = (): Partial<Record<FieldName, string>> => {
    const errors: Partial<Record<FieldName, string>> = {};
    if (signingUp && !name.trim()) errors.displayName = t("errors.name_required");
    if (!email.trim()) errors.email = t("errors.email_required");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("errors.bad_email");
    if (!password) errors.password = t("errors.password_required");
    else if (signingUp && password.length < PASSWORD_MIN_LENGTH) errors.password = t("errors.password_too_short");
    return errors;
  };

  /** Typing into a field clears what was wrong with it. */
  const edited = (field: FieldName) => {
    if (field in fieldErrors) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  };

  const focusField = (field: FieldName) => document.getElementById(`${ids}-${field}`)?.focus();

  const explain = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : "generic";
    const field = error instanceof ApiError ? (error.field as FieldName | undefined) : undefined;

    if (code === "email_taken") {
      // Outline the field; the message and its way out sit below the form.
      setFieldErrors({ email: "" });
      setFormError(
        <>
          {t("errors.email_taken")}{" "}
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="cursor-pointer font-semibold underline underline-offset-2"
          >
            {t("signInInstead")}
          </button>
        </>,
      );
      focusField("email");
      return;
    }

    const messages: Record<string, string> = {
      wrong_credentials: t("errors.wrong_credentials"),
      too_many_attempts: t("errors.too_many_attempts"),
      bad_email: t("errors.bad_email"),
      email_required: t("errors.email_required"),
      password_too_short: t("errors.password_too_short"),
      password_too_long: t("errors.password_too_long"),
      password_blank: t("errors.password_blank"),
      name_required: t("errors.name_required"),
      network: t("errors.network"),
    };
    const message = code.startsWith("turnstile") ? t("errors.turnstile") : (messages[code] ?? t("errors.generic"));

    if (field && ["displayName", "email", "password"].includes(field)) {
      setFieldErrors({ [field]: message });
      focusField(field);
    } else {
      setFormError(message);
      if (code === "wrong_credentials") {
        setPassword("");
        focusField("password");
      }
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    const first = (["displayName", "email", "password"] as FieldName[]).find((field) => errors[field]);
    if (first) {
      focusField(first);
      return;
    }

    setSubmitting(true);
    try {
      if (signingUp) {
        const token = await turnstile.waitForToken();
        if (!token) {
          setFormError(t("errors.turnstile"));
          return;
        }
        await signUp({
          email: email.trim(),
          password,
          displayName: name.trim(),
          character: validCharacter,
          turnstileToken: token,
        });
      } else {
        await signIn(email.trim(), password);
      }
      // The effect above moves on once the session is in place.
    } catch (error) {
      explain(error);
      if (signingUp) turnstile.reset();
    } finally {
      setSubmitting(false);
    }
  };

  const trackCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  const describedBy = (field: FieldName, extra?: string) =>
    [fieldErrors[field] ? `${ids}-${field}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  const fieldClass = (field: FieldName) =>
    `${inputClass} ${field in fieldErrors ? "!border-red-300 focus:!ring-red-100" : ""}`;

  const passwordLongEnough = password.length >= PASSWORD_MIN_LENGTH;

  return (
    <EntryShell
      backHref="/"
      backLabel={tc("back")}
      preview={
        <EntryPreview
          occupants={[
            {
              character: validCharacter,
              left: "50%",
              top: "79%",
              name: (signingUp ? name.trim() : guest?.displayName) || tc("you"),
              width: 44,
              running: arriving,
            },
          ]}
        />
      }
    >
      <div className="entry-rise">
        {/* Two ways in, one panel. Switching keeps what was typed. */}
        <div
          role="tablist"
          aria-label={t("chooseMode")}
          className="relative grid grid-cols-2 p-1 mb-6 rounded-full bg-[#f3f3ef] border border-black/5"
        >
          <span
            aria-hidden
            className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              signingUp ? "translate-x-full rtl:-translate-x-full" : "translate-x-0"
            } start-1`}
          />
          {(["signin", "signup"] as AuthMode[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => switchMode(option)}
              className={`cursor-pointer relative h-9 rounded-full font-body text-[13px] font-semibold transition-opacity duration-200 ${
                mode === option ? "text-[var(--color-braun-text)]" : "text-[var(--color-braun-text)] opacity-45 hover:opacity-75"
              }`}
            >
              {option === "signin" ? t("tabSignIn") : t("tabSignUp")}
            </button>
          ))}
        </div>

        <h1 className="font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-1.5">
          {signingUp ? t("signUpTitle") : t("signInTitle")}
        </h1>
        <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">
          {signingUp ? t("signUpSubtitle") : t("signInSubtitle")}
        </p>

        {signingUp && guest && (
          <p className="mb-5 flex items-start gap-2.5 rounded-xl bg-[#f6f5f0] border border-black/5 px-4 py-3 font-body text-[13px] text-[var(--color-braun-text)]">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            <span className="opacity-75">{t("guestCarryOver", { name: guest.displayName })}</span>
          </p>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          {signingUp && (
            <Field label={t("name")} htmlFor={`${ids}-displayName`}>
              <input
                id={`${ids}-displayName`}
                type="text"
                autoComplete="nickname"
                value={name}
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  edited("displayName");
                }}
                placeholder={t("namePlaceholder")}
                maxLength={32}
                aria-invalid={"displayName" in fieldErrors}
                aria-describedby={describedBy("displayName")}
                className={fieldClass("displayName")}
              />
              <FieldError id={`${ids}-displayName-error`} message={fieldErrors.displayName} />
            </Field>
          )}

          <Field label={t("email")} htmlFor={`${ids}-email`}>
            <input
              id={`${ids}-email`}
              type="email"
              inputMode="email"
              autoComplete={signingUp ? "email" : "username"}
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={!signingUp}
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                edited("email");
              }}
              placeholder={t("emailPlaceholder")}
              aria-invalid={"email" in fieldErrors}
              aria-describedby={describedBy("email")}
              className={fieldClass("email")}
            />
            <FieldError id={`${ids}-email-error`} message={fieldErrors.email} />
          </Field>

          <Field label={t("password")} htmlFor={`${ids}-password`}>
            <div className="relative">
              <input
                id={`${ids}-password`}
                type={showPassword ? "text" : "password"}
                autoComplete={signingUp ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  edited("password");
                }}
                onKeyDown={trackCapsLock}
                onKeyUp={trackCapsLock}
                onBlur={() => setCapsLock(false)}
                placeholder={signingUp ? t("newPasswordPlaceholder") : t("passwordPlaceholder")}
                aria-invalid={"password" in fieldErrors}
                aria-describedby={describedBy("password", signingUp ? `${ids}-password-rule` : undefined)}
                className={`${fieldClass("password")} pe-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
                className="cursor-pointer absolute end-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-[var(--color-braun-text)] opacity-45 hover:opacity-80 transition-opacity"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError id={`${ids}-password-error`} message={fieldErrors.password} />
            {capsLock && (
              <p className="mt-2 font-body text-[12px] text-amber-700" role="status">
                {t("capsLock")}
              </p>
            )}
            {signingUp && !fieldErrors.password && (
              <p
                id={`${ids}-password-rule`}
                className={`mt-2 flex items-center gap-1.5 font-body text-[12px] transition-colors duration-200 ${
                  passwordLongEnough ? "text-emerald-700" : "text-[var(--color-braun-text)] opacity-50"
                }`}
              >
                <Check className={`w-3.5 h-3.5 transition-opacity ${passwordLongEnough ? "opacity-100" : "opacity-30"}`} />
                {t("passwordRule")}
              </p>
            )}
          </Field>

          {signingUp && (
            <Field label={t("character")}>
              <CharacterPicker value={validCharacter} onChange={pickCharacter} />
            </Field>
          )}

          {signingUp && <Turnstile controller={turnstile} action="signup" className="flex justify-center" />}

          {formError && <ErrorNote>{formError}</ErrorNote>}

          <button type="submit" disabled={submitting} className={`${primaryButtonClass} !mt-6`}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {signingUp ? t("creatingAccount") : t("signingIn")}
              </>
            ) : (
              <>
                {signingUp ? t("createAccount") : t("signIn")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        <p className="font-body text-[13px] text-[var(--color-braun-text)] text-center mt-6">
          <span className="opacity-55">{signingUp ? t("haveAccount") : t("noAccount")}</span>{" "}
          <button
            type="button"
            onClick={() => switchMode(signingUp ? "signin" : "signup")}
            className="cursor-pointer font-semibold underline-offset-2 hover:underline"
          >
            {signingUp ? t("signInInstead") : t("createOne")}
          </button>
        </p>

        {!user && (
          <p className="font-body text-[12px] text-center mt-3">
            <Link
              href="/lobby"
              className="cursor-pointer text-[var(--color-braun-text)] opacity-45 hover:opacity-80 underline-offset-2 hover:underline transition-opacity"
            >
              {t("continueGuest")}
            </Link>
          </p>
        )}
      </div>
    </EntryShell>
  );
}
