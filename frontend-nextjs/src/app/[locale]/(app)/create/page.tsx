"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { officePath } from "@/lib/links";
import { readIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";
import { inputClass } from "@/components/entry/EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { Face } from "@/components/ui/Face";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GoogleButton, googleAvailable } from "@/components/auth/GoogleButton";
import { OfficePreview } from "@/components/app/OfficePreview";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { forgetOffice as forget, pendingOffice as pending, rememberOffice as remember } from "@/lib/pendingOffice";

/**
 * Setting up an office: name it first, sign in second. The name waits in this
 * browser while they make an account (or sign in with Google right here), so
 * coming back finishes the job by itself. Beside the form, on a desktop, the
 * office they're making, wearing the name as it's typed.
 */
export default function CreateSpacePage() {
  const t = useTranslations("create");
  const ta = useTranslations("auth");
  const router = useRouter();
  const explain = useErrorMessage();
  const { user, isLoading, signInWithGoogle } = useAuth();
  const account = !!user && !user.guest;

  const [typed, setTyped] = useState<string | null>(null);
  // One office per name, however many times this effect is run.
  const making = useRef(false);
  const field = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googling, setGoogling] = useState(false);
  const [error, setError] = useState("");

  // A name typed before signing up waits in this browser.
  const waiting = isLoading ? "" : pending();
  const name = typed ?? waiting;
  const wanted = name.trim();
  // Signed in with a name already waiting: the office is being set up right now.
  const finishing = !isLoading && account && !!waiting && !error;
  const busy = submitting || finishing;

  // Whenever a name is waiting and there's an account to own it, the office is
  // made. Typing one, signing up and signing in with Google all end here.
  useEffect(() => {
    if (!finishing || making.current) return;
    making.current = true;
    let cancelled = false;
    api
      .createOffice(waiting)
      .then(({ office }) => {
        // The office is the floor, so there is nothing else to make.
        forget();
        router.replace(officePath(office.id));
      })
      .catch((err) => {
        making.current = false;
        if (cancelled) return;
        setError(explain(err));
        setSubmitting(false);
      });
    return () => {
      cancelled = true;
    };
  }, [finishing, waiting, explain, router]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!wanted || busy) return;
    remember(wanted);
    setError("");
    // Signed in: the effect above takes it from here. Otherwise, an account first.
    if (account) setSubmitting(true);
    else router.push(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  };

  /** Google's popup came back: the name is kept, the account made or found, and the effect makes the office. */
  const withGoogle = async (code: string) => {
    remember(wanted);
    setError("");
    setGoogling(true);
    try {
      await signInWithGoogle(code);
    } catch {
      setError(ta("errors.google_failed"));
    } finally {
      setGoogling(false);
    }
  };

  const steps = t.raw("steps") as string[];
  // Them, at the foot of the preview's column: who they're signed in as, or the name they last walked in with.
  const remembered = isLoading ? "" : readIdentity().name;
  const person = user ? { id: user.id, name: user.displayName } : remembered ? { id: `name:${remembered.toLowerCase()}`, name: remembered } : null;

  return (
    <AuthLayout
      aside={
        <div className="w-full max-w-[620px]">
          <p className="text-[13px] font-medium text-muted-foreground">{t("eyebrow")}</p>
          <h2 className="mt-1.5 max-w-md text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">{wanted || t("asideTitle")}</h2>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">{t("asideBody")}</p>
          <OfficePreview className="mt-8" name={wanted || t("namePlaceholder")} typed={!!wanted} others={[]} person={person} />
        </div>
      }
    >
      <div className="entry-rise">
        {/* Where this goes: a name now, an account next, then the floor. */}
        {!account && (
          <ol className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px] font-medium text-muted-foreground">
            {steps.map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden className="h-px w-4 bg-border-strong" />}
                <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px]", index === 0 ? "bg-foreground text-background" : "bg-muted")}>
                  {index + 1}
                </span>
                <span className={index === 0 ? "text-foreground" : undefined}>{step}</span>
              </li>
            ))}
          </ol>
        )}

        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{t("title")}</h1>
        <p className="mb-7 mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>

        <form onSubmit={submit}>
          <label htmlFor="space-name" className="mb-2 block text-[12.5px] font-medium text-muted-foreground">
            {t("nameLabel")}
          </label>
          <div className="relative">
            {/* The office's mark, made from its name as it's typed, as it will show on the rail. */}
            <span aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 flex -translate-y-1/2 [--face-ring:var(--ui-card)]">
              <Face seed={wanted ? wanted.toLowerCase() : "your-office"} size={28} square />
            </span>
            <input
              ref={field}
              id="space-name"
              value={name}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={t("namePlaceholder")}
              maxLength={48}
              autoFocus
              autoComplete="organization"
              className={cn(inputClass, "ps-12")}
            />
          </div>

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <ActionButton type="submit" disabled={!wanted || isLoading} busy={busy} busyLabel={t("creating")} className="mt-5">
            {account ? t("create") : t("continue")}
          </ActionButton>
        </form>

        {/* Signed out: Google makes the account and the office in one go, once there's a name. */}
        {!isLoading && !account && googleAvailable && (
          <>
            <p className="my-5 flex items-center gap-3 text-[12px] text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
              {ta("or")}
            </p>
            {wanted ? (
              <GoogleButton label={ta("continueWithGoogle")} busy={googling} onCode={withGoogle} onError={() => setError(ta("errors.google_failed"))} />
            ) : (
              <button
                type="button"
                onClick={() => field.current?.focus()}
                className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-dashed border-border-strong text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nameFirst")}
              </button>
            )}
          </>
        )}

        <div className="mt-7 flex flex-col items-center gap-1.5 text-center">
          <p className="text-[12.5px] text-muted-foreground">{account ? t("freePlan") : t("accountNext")}</p>
          <PlansSoon className="justify-center" />
          {!isLoading && !account && (
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {t.rich("justLooking", {
                link: (chunks) => (
                  <Link href="/lobby" className="font-medium text-foreground underline-offset-2 hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
