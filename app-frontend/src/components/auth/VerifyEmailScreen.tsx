"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, LoaderCircle } from "@/components/ui/icons";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { ActionButton, ActionLink } from "@/components/ui/Action";
import { CenteredAuthLayout } from "./AuthLayout";

/** Each link is spent on first use, so a second render asking again would only hear that it's gone. */
const confirming = new Map<string, Promise<unknown>>();

/** Where the link in the confirmation email opens: it confirms on arrival, signed in or not. */
export function VerifyEmailScreen({ token }: { token: string | null }) {
  const t = useTranslations("auth.verify");
  const { user, hasAccount, refresh } = useAuth();
  const [state, setState] = useState<"checking" | "done" | "failed">(token ? "checking" : "failed");
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!confirming.has(token)) confirming.set(token, api.verifyEmail(token));
    let cancelled = false;
    confirming.get(token)!.then(
      () => {
        if (cancelled) return;
        setState("done");
        void refresh();
      },
      () => !cancelled && setState("failed"),
    );
    return () => {
      cancelled = true;
    };
  }, [token, refresh]);

  // An old link for an address that's confirmed already is no trouble.
  const confirmed = state === "done" || (state === "failed" && !!user?.emailVerified);

  const resend = async () => {
    setSending(true);
    try {
      const { verified } = await api.sendVerifyEmail();
      if (verified) await refresh();
      else setResent(true);
    } catch {
      setResent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <CenteredAuthLayout>
      <div className="text-center">
        {state === "checking" ? (
          <p className="flex items-center justify-center gap-2 text-[14px] text-muted-foreground" role="status">
            <LoaderCircle className="size-4 animate-spin" />
            {t("checking")}
          </p>
        ) : confirmed ? (
          <>
            <span className="mx-auto mb-5 flex size-11 items-center justify-center rounded-full bg-ok/10 text-ok">
              <Check className="size-5" />
            </span>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{t("doneTitle")}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{t("done")}</p>
            <ActionLink href="/" className="mt-8">
              {t("continue")}
            </ActionLink>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{t("failedTitle")}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {resent ? t("sent") : hasAccount ? t("failed") : t("failedSignedOut")}
            </p>
            {hasAccount ? (
              !resent && (
                <ActionButton busy={sending} onClick={resend} className="mt-8">
                  {t("sendAgain")}
                </ActionButton>
              )
            ) : (
              <ActionLink href="/auth?redirect=%2Faccount%3Fsection%3Dsignin" className="mt-8">
                {t("signIn")}
              </ActionLink>
            )}
          </>
        )}
      </div>
    </CenteredAuthLayout>
  );
}
