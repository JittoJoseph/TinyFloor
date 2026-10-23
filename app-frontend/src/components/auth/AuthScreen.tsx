"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { homePath } from "@/lib/links";
import { Field, inputClass } from "@/components/entry/EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { CenteredAuthLayout } from "./AuthLayout";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { Turnstile, useTurnstileToken } from "./Turnstile";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { CodeField, CODE_LENGTH } from "./CodeField";
import { Agree } from "@/components/legal/Agree";

export type AuthMode = "signin" | "signup";

/** How long after a code is sent before another can be asked for: the API sends nothing new sooner. */
const RESEND_AFTER_MS = 60_000;

/** Only paths on this site, so a crafted link can't bounce someone elsewhere after signing in. */
export function safeRedirect(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : homePath;
}

/**
 * Signing in and up are the same: Google, or an email and the code sent to it,
 * which makes the account the first time (docs/product.md). The mode only
 * changes the words, for people who came to make an account.
 */
export function AuthScreen({ initialMode, redirect }: { initialMode: AuthMode; redirect: string }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const { user, isLoading, hasAccount, signInWithCode, signInWithGoogle } = useAuth();
  const ids = useId();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [codeWrong, setCodeWrong] = useState(false);
  const [formError, setFormError] = useState<React.ReactNode>(null);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googling, setGoogling] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // Google is the way in we'd like most people to take (docs/product.md): the email form waits behind a button.
  const [withEmail, setWithEmail] = useState(!googleAvailable);
  const turnstile = useTurnstileToken();
  const codeRef = useRef<HTMLInputElement>(null);

  const signingUp = mode === "signup";
  const onCode = step === "code";

  // Already signed in with an account (or just did): carry on.
  useEffect(() => {
    if (!isLoading && hasAccount) router.replace(redirect);
  }, [isLoading, hasAccount, redirect, router]);

  // The countdown to sending another code, while there is one.
  useEffect(() => {
    if (!onCode || resendAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [onCode, resendAt]);

  useEffect(() => {
    if (onCode) codeRef.current?.focus();
  }, [onCode]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    setMode(next);
    setEmailError("");
    setFormError(null);
    const params = new URLSearchParams(window.location.search);
    if (next === "signup") params.set("mode", "signup");
    else params.delete("mode");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  };

  const explain = (error: unknown) => {
    const code = error instanceof ApiError ? error.code : "generic";
    const messages: Record<string, string> = {
      wrong_code: t("errors.wrong_code"),
      code_expired: t("errors.code_expired"),
      too_many_codes: t("errors.too_many_codes"),
      email_failed: t("errors.email_failed"),
      too_many_attempts: t("errors.too_many_attempts"),
      slow_down: t("errors.too_many_attempts"),
      bad_email: t("errors.bad_email"),
      email_required: t("errors.email_required"),
      google_failed: t("errors.google_failed"),
      google_unverified: t("errors.google_unverified"),
      google_mismatch: t("errors.google_mismatch"),
      network: t("errors.network"),
    };
    const message = code.startsWith("turnstile") ? t("errors.turnstile") : (messages[code] ?? t("errors.generic"));
    if (code === "bad_email" || code === "email_required") {
      setEmailError(message);
      document.getElementById(`${ids}-email`)?.focus();
      return;
    }
    if (code === "wrong_code" || code === "code_expired") {
      setCodeWrong(true);
      setCode("");
      codeRef.current?.focus();
    }
    setFormError(message);
  };

  /** Asks for a code to the address: the first, or another. Turnstile's token is used once, so a new one is made after. */
  const sendCode = async () => {
    const token = await turnstile.waitForToken();
    if (!token) throw new ApiError(0, "turnstile_failed", "");
    try {
      await api.sendCode({ email: email.trim(), turnstileToken: token });
    } finally {
      turnstile.reset();
    }
    setResendAt(Date.now() + RESEND_AFTER_MS);
    setNow(Date.now());
  };

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);
    const address = email.trim();
    const problem = !address ? t("errors.email_required") : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? t("errors.bad_email") : "";
    setEmailError(problem);
    if (problem) {
      document.getElementById(`${ids}-email`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await sendCode();
      setCode("");
      setCodeWrong(false);
      setNotice("");
      setStep("code");
    } catch (error) {
      explain(error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (value = code) => {
    if (submitting) return;
    setFormError(null);
    setNotice("");
    if (value.length !== CODE_LENGTH) {
      setCodeWrong(true);
      setFormError(t("errors.code_required"));
      codeRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await signInWithCode(email.trim(), value);
      // The effect above moves on once the session is in place.
    } catch (error) {
      explain(error);
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    if (submitting || now < resendAt) return;
    setFormError(null);
    setNotice("");
    setSubmitting(true);
    try {
      await sendCode();
      setCode("");
      setCodeWrong(false);
      setNotice(t("codeSentAgain"));
      codeRef.current?.focus();
    } catch (error) {
      explain(error);
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    setStep("email");
    setCode("");
    setCodeWrong(false);
    setFormError(null);
    setNotice("");
    window.setTimeout(() => document.getElementById(`${ids}-email`)?.focus());
  };

  /** Google's popup came back with a code: the API signs in, links or makes the account, and the effect above moves on. */
  const withGoogle = async (googleCode: string) => {
    setFormError(null);
    setGoogling(true);
    try {
      await signInWithGoogle({ code: googleCode });
    } catch (error) {
      explain(error);
    } finally {
      setGoogling(false);
    }
  };

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000));

  return (
    <CenteredAuthLayout>
      <div className="text-center">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">
          {onCode ? t("codeTitle") : signingUp ? t("signUpTitle") : t("signInTitle")}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {onCode
            ? t.rich("codeSubtitle", { email: email.trim(), strong: (chunks) => <span className="font-medium text-foreground">{chunks}</span> })
            : signingUp
              ? t("signUpSubtitle")
              : t("signInSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        {googleAvailable && !onCode && (
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
            {!withEmail && (
              <ActionButton tone="secondary" icon={null} onClick={() => setWithEmail(true)}>
                {t("continueWithEmail")}
              </ActionButton>
            )}
          </>
        )}

        {withEmail && !onCode && (
          <form onSubmit={submitEmail} noValidate className="space-y-4">
            <Field label={t("email")} htmlFor={`${ids}-email`}>
              <input
                id={`${ids}-email`}
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailError("");
                }}
                placeholder={t("emailPlaceholder")}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? `${ids}-email-error` : undefined}
                className={`${inputClass} ${emailError ? "!border-destructive/50 focus:!ring-destructive/15" : ""}`}
              />
              {emailError && (
                <p id={`${ids}-email-error`} className="mt-2 text-[12px] text-destructive">
                  {emailError}
                </p>
              )}
            </Field>

            {formError && <ErrorNote>{formError}</ErrorNote>}

            <ActionButton type="submit" busy={submitting} busyLabel={t("sendingCode")} className="!mt-6">
              {t("continue")}
            </ActionButton>
          </form>
        )}

        {onCode && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitCode();
            }}
            noValidate
            className="space-y-4"
          >
            <Field label={t("code")} htmlFor={`${ids}-code`}>
              <CodeField
                ref={codeRef}
                id={`${ids}-code`}
                value={code}
                onChange={(next) => {
                  setCode(next);
                  setCodeWrong(false);
                }}
                onComplete={(complete) => void submitCode(complete)}
                invalid={codeWrong}
              />
              <p className="mt-2 text-[12px] text-muted-foreground">{t("codeHint")}</p>
            </Field>

            {formError && <ErrorNote>{formError}</ErrorNote>}
            {notice && !formError && (
              <p className="text-center text-[12.5px] text-ok" role="status">
                {notice}
              </p>
            )}

            <ActionButton type="submit" busy={submitting} busyLabel={t("signingIn")} className="!mt-6">
              {t("continue")}
            </ActionButton>

            <div className="flex flex-col items-center gap-2 pt-2 text-[13px]">
              <button
                type="button"
                onClick={resend}
                disabled={submitting || waitSeconds > 0}
                className="cursor-pointer font-medium text-foreground underline-offset-2 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
              >
                {waitSeconds > 0 ? t("resendIn", { seconds: waitSeconds }) : t("resend")}
              </button>
              <button
                type="button"
                onClick={changeEmail}
                className="cursor-pointer text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
              >
                {t("differentEmail")}
              </button>
            </div>
          </form>
        )}

        {/* Kept across both steps: sending another code needs a token too. */}
        {withEmail && <Turnstile controller={turnstile} action="code" className="mt-4 flex justify-center" />}

        {!onCode && <Agree className="mt-4 text-center" />}
      </div>

      {!onCode && (
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
      )}

      {!user && !onCode && (
        <p className="mt-3 text-center text-[12.5px]">
          <Link href="/lobby" className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline">
            {t("continueGuest")}
          </Link>
        </p>
      )}
    </CenteredAuthLayout>
  );
}
