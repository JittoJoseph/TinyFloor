"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { officePath } from "@/lib/links";
import { EntryShell, inputClass } from "@/components/entry/EntryShell";
import { ActionButton } from "@/components/ui/Action";
import { EntryPreview } from "@/components/entry/EntryPreview";
import { ErrorNote } from "@/components/entry/ErrorNote";
import { useErrorMessage } from "@/lib/useErrorMessage";

const PENDING_KEY = "tinyfloorPendingSpace";

function remember(name: string) {
  try {
    localStorage.setItem(PENDING_KEY, name);
  } catch {}
}

function pending(): string {
  try {
    return localStorage.getItem(PENDING_KEY) ?? "";
  } catch {
    return "";
  }
}

function forget() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}

/**
 * Setting up an office: name it first, sign in second. The name waits in this
 * browser while they make an account, so coming back finishes the job by itself.
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
    const wanted = name.trim();
    if (!wanted || busy) return;
    remember(wanted);
    setError("");
    // Signed in: the effect above takes it from here. Otherwise, an account first.
    if (account) setSubmitting(true);
    else router.push(`/auth?${new URLSearchParams({ redirect: "/create", mode: "signup" })}`);
  };

  return (
    <EntryShell preview={<EntryPreview occupants={[]} />}>
      <div className="entry-rise">
        <p className="text-[11px] font-bold text-foreground opacity-45 mb-2">
          {t("eyebrow")}
        </p>
        <h1 className="text-[1.75rem] font-medium tracking-tight leading-tight text-foreground mb-1.5">
          {t("title")}
        </h1>
        <p className="text-sm text-foreground opacity-55 mb-5">{t("subtitle")}</p>

        <form onSubmit={submit}>
          <label
            htmlFor="space-name"
            className="block text-[11px] font-bold text-foreground opacity-50 mb-2.5"
          >
            {t("nameLabel")}
          </label>
          <input
            id="space-name"
            value={name}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={48}
            autoFocus
            className={inputClass}
          />

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <ActionButton type="submit" disabled={!name.trim() || isLoading} busy={busy} busyLabel={t("creating")} className="mt-5">
            {account ? t("create") : t("continue")}
          </ActionButton>
        </form>

        <p className="mt-5 text-center text-[12.5px] text-muted-foreground">
          {account ? t("freePlan") : t("accountNext")}
        </p>

        {!isLoading && !account && (
          <p className="text-[12px] text-foreground opacity-50 text-center mt-2">
            {t.rich("justLooking", {
              link: (chunks) => (
                <Link href="/lobby" className="underline underline-offset-2 hover:opacity-100">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}
      </div>
    </EntryShell>
  );
}
