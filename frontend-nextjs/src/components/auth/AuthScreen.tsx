"use client";

import React, { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff } from "lucide-react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/entry/EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { CenteredAuthLayout } from "./AuthLayout";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { Turnstile, useTurnstileToken } from "./Turnstile";
import { GoogleButton, googleAvailable } from "./GoogleButton";
import { Agree } from "@/components/legal/Agree";

export type AuthMode = "signin" | "signup";

const PASSWORD_MIN_LENGTH = 8;
type FieldName = "email" | "password";

/** Only paths on this site, so a crafted link can't bounce someone elsewhere after signing in. */
export function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/dashboard";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-2 text-[12px] text-destructive">
      {message}
    </p>
  ) : null;
}

export function AuthScreen({ initialMode, redirect }: { initialMode: AuthMode; redirect: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { user, isLoading, hasAccount, signIn, signUp, signInWithGoogle } = useAuth();
  const ids = useId();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googling, setGoogling] = useState(false);
  const turnstile = useTurnstileToken();

  const signingUp = mode === "signup";
  // Only an email and a password: the name people see and the character are
  // asked at the first door. A guest who signs up keeps the ones they chose.

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

  const validate = (): Partial<Record<FieldName, string>> => {
    const errors: Partial<Record<FieldName, string>> = {};
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
      slow_down: t("errors.too_many_attempts"),
      bad_email: t("errors.bad_email"),
      email_required: t("errors.email_required"),
      password_too_short: t("errors.password_too_short"),
      password_too_long: t("errors.password_too_long"),
      password_blank: t("errors.password_blank"),
      google_failed: t("errors.google_failed"),
      google_unverified: t("errors.google_unverified"),
      google_mismatch: t("errors.google_mismatch"),
      network: t("errors.network"),
    };
    const message = code.startsWith("turnstile") ? t("errors.turnstile") : (messages[code] ?? t("errors.generic"));

    if (field && ["email", "password"].includes(field)) {
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
    const first = (["email", "password"] as FieldName[]).find((field) => errors[field]);
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
        await signUp({ email: email.trim(), password, turnstileToken: token });
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

  /** Google's popup came back with a code: the API signs in, links or makes the account, and the effect above moves on. */
  const withGoogle = async (code: string) => {
    setFormError(null);
    setGoogling(true);
    try {
      await signInWithGoogle({ code });
    } catch (error) {
      explain(error);
    } finally {
      setGoogling(false);
    }
  };

  const trackCapsLock = (event: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(event.getModifierState?.("CapsLock") ?? false);

  const describedBy = (field: FieldName, extra?: string) =>
    [fieldErrors[field] ? `${ids}-${field}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  const fieldClass = (field: FieldName) =>
    `${inputClass} ${field in fieldErrors ? "!border-destructive/50 focus:!ring-destructive/15" : ""}`;

  const passwordLongEnough = password.length >= PASSWORD_MIN_LENGTH;

  return (
    <CenteredAuthLayout>
      <div className="text-center">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {signingUp ? t("signUpTitle") : t("signInTitle")}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{signingUp ? t("signUpSubtitle") : t("signInSubtitle")}</p>
      </div>

      <div className="mt-8">
        {googleAvailable && (
          <>
            <GoogleButton
              label={t("continueWithGoogle")}
              busy={googling}
              onCode={withGoogle}
              onError={() => setFormError(t("errors.google_failed"))}
            />
            <p className="my-6 flex items-center gap-3 text-[12px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              {t("or")}
            </p>
          </>
        )}

        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label={t("email")} htmlFor={`${ids}-email`}>
            <input
              id={`${ids}-email`}
              type="email"
              inputMode="email"
              autoComplete={signingUp ? "email" : "username"}
              autoCapitalize="none"
              spellCheck={false}
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
                className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError id={`${ids}-password-error`} message={fieldErrors.password} />
            {capsLock && (
              <p className="mt-2 text-[12px] text-warn" role="status">
                {t("capsLock")}
              </p>
            )}
            {signingUp && !fieldErrors.password && (
              <p
                id={`${ids}-password-rule`}
                className={`mt-2 flex items-center gap-1.5 text-[12px] transition-colors duration-200 ${
                  passwordLongEnough ? "text-ok" : "text-muted-foreground"
                }`}
              >
                <Check className={`size-3.5 transition-opacity ${passwordLongEnough ? "opacity-100" : "opacity-30"}`} />
                {t("passwordRule")}
              </p>
            )}
          </Field>

          {signingUp && <Turnstile controller={turnstile} action="signup" className="flex justify-center" />}

          {formError && <ErrorNote>{formError}</ErrorNote>}

          <ActionButton type="submit" busy={submitting} busyLabel={signingUp ? t("creatingAccount") : t("signingIn")} className="!mt-6">
            {signingUp ? t("createAccount") : t("signIn")}
          </ActionButton>
        </form>

        {signingUp && <Agree className="mt-4 text-center" />}
      </div>

      <p className="mt-8 text-center text-[13.5px] text-foreground">
        <span className="text-muted-foreground">{signingUp ? t("haveAccount") : t("noAccount")}</span>{" "}
        <button
          type="button"
          onClick={() => switchMode(signingUp ? "signin" : "signup")}
          className="cursor-pointer font-medium underline-offset-2 hover:underline"
        >
          {signingUp ? t("signInInstead") : t("createOne")}
        </button>
      </p>

      {!user && (
        <p className="mt-3 text-center text-[12.5px]">
          <Link href="/lobby" className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline">
            {t("continueGuest")}
          </Link>
        </p>
      )}
    </CenteredAuthLayout>
  );
}

