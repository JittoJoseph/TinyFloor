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
import { ErrorNote } from "@/components/entry/ErrorNote";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { OfficePreview } from "@/components/app/OfficePreview";
import { OfficeSteps } from "@/components/auth/OfficeSteps";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { forgetOffice as forget, pendingOffice as pending, rememberOffice as remember } from "@/lib/pendingOffice";

/**
 * Setting up an office: name it first, sign in second. The name waits in this
 * browser while they make an account, so coming back finishes the job by
 * itself. Beside the form, on a desktop, the
 * office they're making, wearing the name as it's typed.
 */
export default function CreateSpacePage() {
  const t = useTranslations("create");
  const router = useRouter();
  const explain = useErrorMessage();
  const { user, isLoading } = useAuth();
  const account = !!user && !user.guest;

  const [typed, setTyped] = useState<string | null>(null);
  // One office per name, however many times this effect is run.
  const making = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // A name typed before signing up waits in this browser.
  const waiting = isLoading ? "" : pending();
  const name = typed ?? waiting;
  const wanted = name.trim();
  // Signed in with a name already waiting: the office is being set up right now.
  const finishing = !isLoading && account && !!waiting && !error;
  const busy = submitting || finishing;

  // Whenever a name is waiting and there's an account to own it, the office is
  // made. Typing one and signing up both end here.
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
        {!account && <OfficeSteps at={0} className="mb-8" />}

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

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          {account ? (
            t("freePlan")
          ) : (
            t.rich("justLooking", {
              link: (chunks) => (
                <Link href="/lobby" className="font-medium text-foreground underline-offset-2 hover:underline">
                  {chunks}
                </Link>
              ),
            })
          )}
        </p>
      </div>
    </AuthLayout>
  );
}
