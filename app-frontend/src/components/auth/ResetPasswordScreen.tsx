"use client";

import React, { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, EyeOff, Mail } from "@/components/ui/icons";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { Field, inputClass } from "@/components/entry/EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { CenteredAuthLayout } from "./AuthLayout";
import { Turnstile, useTurnstileToken } from "./Turnstile";

const PASSWORD_MIN_LENGTH = 8;

function Heading({ title, subtitle }: { title: string; subtitle: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Forgot your password: ask for a link by email, or, opened from that link, choose the new one. */
export function ResetPasswordScreen({ token }: { token: string | null }) {
  return <CenteredAuthLayout backHref="/auth">{token ? <ChoosePassword token={token} /> : <AskForLink />}</CenteredAuthLayout>;
}

function AskForLink() {
  const t = useTranslations("auth");
  const ids = useId();
  const turnstile = useTurnstileToken();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(address ? t("errors.bad_email") : t("errors.email_required"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      const turnstileToken = await turnstile.waitForToken();
      if (!turnstileToken) {
        setError(t("errors.turnstile"));
        return;
      }
      await api.requestPasswordReset({ email: address, turnstileToken });
      setSentTo(address);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      setError(
        code.startsWith("turnstile")
          ? t("errors.turnstile")
          : code === "too_many_attempts" || code === "slow_down"
            ? t("errors.too_many_attempts")
            : code === "network"
              ? t("errors.network")
              : t("errors.generic"),
      );
      turnstile.reset();
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <>
        <span className="mx-auto mb-5 flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground">
          <Mail className="size-5" />
        </span>
        <Heading title={t("reset.sentTitle")} subtitle={t("reset.sent", { email: sentTo })} />
        <p className="mt-8 text-center text-[13.5px]">
          <Link href="/auth" className="font-medium underline-offset-2 hover:underline">
            {t("reset.backToSignIn")}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Heading title={t("reset.askTitle")} subtitle={t("reset.askSubtitle")} />
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        <Field label={t("email")} htmlFor={`${ids}-email`}>
          <input
            id={`${ids}-email`}
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </Field>
        <Turnstile controller={turnstile} action="reset" className="flex justify-center" />
        {error && <ErrorNote>{error}</ErrorNote>}
        <ActionButton type="submit" busy={busy} busyLabel={t("reset.sending")} className="!mt-6">
          {t("reset.send")}
        </ActionButton>
      </form>
      <p className="mt-8 text-center text-[13.5px]">
        <Link href="/auth" className="font-medium underline-offset-2 hover:underline">
          {t("reset.backToSignIn")}
        </Link>
      </p>
    </>
  );
}

function ChoosePassword({ token }: { token: string }) {
  const t = useTranslations("auth");
  const ids = useId();
  const router = useRouter();
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<React.ReactNode>(null);
  const [busy, setBusy] = useState(false);
  const longEnough = password.length >= PASSWORD_MIN_LENGTH;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!longEnough) {
      setError(t("errors.password_too_short"));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.resetPassword({ token, password });
      // Signed in now, with the new password: on to the office.
      await refresh();
      router.replace("/");
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "";
      if (code === "link_invalid") {
        setError(
          <>
            {t("reset.linkInvalid")}{" "}
            <Link href="/auth/reset" className="font-semibold underline underline-offset-2">
              {t("reset.askAgain")}
            </Link>
          </>,
        );
      } else {
        const messages: Record<string, string> = {
          password_too_short: t("errors.password_too_short"),
          password_too_long: t("errors.password_too_long"),
          password_blank: t("errors.password_blank"),
          too_many_attempts: t("errors.too_many_attempts"),
          network: t("errors.network"),
        };
        setError(messages[code] ?? t("errors.generic"));
      }
      setBusy(false);
    }
  };

  return (
    <>
      <Heading title={t("reset.chooseTitle")} subtitle={t("reset.chooseSubtitle")} />
      <form onSubmit={submit} noValidate className="mt-8 space-y-4">
        {/* Lets password managers save the new one; they know whose it is from the address they filled before. */}
        <input type="email" autoComplete="username" className="hidden" readOnly tabIndex={-1} aria-hidden />
        <Field label={t("reset.newPassword")} htmlFor={`${ids}-password`}>
          <div className="relative">
            <input
              id={`${ids}-password`}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("newPasswordPlaceholder")}
              className={`${inputClass} pe-12`}
            />
            <button
              type="button"
              onClick={() => setShow((shown) => !shown)}
              aria-label={show ? t("hidePassword") : t("showPassword")}
              aria-pressed={show}
              className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className={`mt-2 flex items-center gap-1.5 text-[12px] transition-colors duration-200 ${longEnough ? "text-ok" : "text-muted-foreground"}`}>
            <Check className={`size-3.5 transition-opacity ${longEnough ? "opacity-100" : "opacity-30"}`} />
            {t("passwordRule")}
          </p>
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <ActionButton type="submit" busy={busy} busyLabel={t("reset.saving")} className="!mt-6">
          {t("reset.save")}
        </ActionButton>
      </form>
    </>
  );
}
