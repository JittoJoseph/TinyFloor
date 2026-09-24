"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Link2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { api } from "@/lib/api";
import { officePath } from "@/lib/links";
import { forgetOffice, pendingOffice } from "@/lib/pendingOffice";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { LitFace } from "@/components/ui/LitFace";
import { cn } from "@/lib/utils";

/**
 * Making an office, wherever it starts: a name, then straight onto its floor.
 * A name typed in the lobby before signing up is waiting here, filled in, for
 * them to confirm; it is never made on its own.
 */
export function useCreateOffice() {
  const router = useRouter();
  const explain = useErrorMessage();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Read once the page is in the browser, so the first render matches the server's.
  useEffect(() => {
    const waiting = pendingOffice();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (waiting) setName(waiting);
  }, []);

  const typed = name.trim();
  const create = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!typed || busy) return;
    setBusy(true);
    setError("");
    try {
      const { office } = await api.createOffice(typed);
      forgetOffice();
      // The office is its floor, so there is nothing else to set up.
      router.replace(officePath(office.id));
    } catch (err) {
      setError(explain(err));
      setBusy(false);
    }
  };

  return { name, setName: (value: string) => setName(value), typed, busy, error, create };
}

/**
 * Making an office: its mark, lit softly in its own colour, and the name
 * written out large as they type, the way it will read at the top of the
 * rail. Centered where there is room; on a phone it reads down one edge.
 */
export function MakeOffice({ greeting, children }: { greeting: string; children?: ReactNode }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("create");
  const reduce = useReducedMotion();
  const { name, setName, typed, busy, error, create } = useCreateOffice();

  return (
    <div className="mx-auto max-w-[440px] sm:flex sm:min-h-[calc(100dvh-14rem)] sm:flex-col sm:items-center sm:justify-center sm:pb-6 sm:text-center">
      <LitFace seed={typed.toLowerCase() || "your-office"} size={80} phone={60} square />
      <motion.p
        key={typed ? "named" : "greeting"}
        initial={reduce ? false : { opacity: 0, y: 3 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-7 text-[13px] font-medium text-muted-foreground sm:mt-9"
      >
        {typed ? t("yourNewOffice") : greeting}
      </motion.p>
      <h1 className="mt-1 line-clamp-2 w-full break-words text-[30px] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:mt-1.5 sm:line-clamp-1 sm:text-[34px] sm:leading-tight sm:tracking-[-0.025em]">
        {typed || t("makeTitle")}
      </h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-muted-foreground sm:text-balance sm:text-[14.5px]">{t("welcomeBody")}</p>

      <form onSubmit={create} className="mt-7 w-full sm:mt-8">
        <div className="flex h-14 items-center gap-1 rounded-full border border-border bg-card p-1.5 ps-5 shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-24px_rgb(0_0_0/0.5)] transition-[border-color] focus-within:border-foreground/25 sm:h-[52px]">
          <label htmlFor="office-name" className="sr-only">
            {tc("nameLabel")}
          </label>
          <input
            id="office-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("stepName")}
            maxLength={48}
            autoComplete="organization"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[15px]"
          />
          <button
            type="submit"
            disabled={!typed || busy}
            className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-foreground px-4 text-[14px] font-medium text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-30 sm:h-10 sm:text-[13.5px]"
          >
            {busy ? tc("creating") : t("makeIt")}
            {!busy && <ArrowRight className="size-4 rtl:rotate-180" />}
          </button>
        </div>
        <p className={cn("mt-3 ps-5 text-[12.5px] sm:ps-0", error ? "text-destructive" : "text-faint")}>{error || t("freeRename")}</p>
      </form>
      {children}
    </div>
  );
}

/** Pasting the link a team sent: it opens that invitation (or guest link) as if it had been clicked. */
export function JoinByLink() {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const join = (event: React.FormEvent) => {
    event.preventDefault();
    const found = link.trim().match(/\/(invite|join)\/([^/?#\s]+)/);
    if (!found) {
      setError(t("badLink"));
      return;
    }
    router.push(`/${found[1]}/${found[2]}`);
  };

  return (
    <form onSubmit={join}>
      <div className="flex h-11 items-center gap-1 rounded-full border border-border p-1 ps-4 transition-colors focus-within:border-foreground/25">
        <Link2 className="size-4 shrink-0 text-faint" />
        <label className="sr-only" htmlFor="invite-link">
          {t("invitePlaceholder")}
        </label>
        <input
          id="invite-link"
          value={link}
          onChange={(event) => {
            setLink(event.target.value);
            setError("");
          }}
          placeholder={t("invitePlaceholder")}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent ps-1.5 text-[16px] text-foreground outline-none placeholder:text-faint sm:text-[13.5px]"
        />
        <button
          type="submit"
          disabled={!link.trim()}
          className="h-9 shrink-0 cursor-pointer rounded-full px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("join")}
        </button>
      </div>
      {error && <p className="mt-2 ps-4 text-[12.5px] text-destructive">{error}</p>}
    </form>
  );
}
