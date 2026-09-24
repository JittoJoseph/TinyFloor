"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { officePath } from "@/lib/links";
import { forgetOffice, pendingOffice } from "@/lib/pendingOffice";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { cn } from "@/lib/utils";
import { Face } from "@/components/ui/Face";

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
 * The name, typed straight into the office as the app will show it: its mark
 * (coloured by the name), its seats, and you, its first admin. The same card
 * as the office switcher's, so what they make is what they'll see.
 */
export function OfficeNameCard({
  name,
  onName,
  autoFocus,
  className,
}: {
  name: string;
  onName: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const t = useTranslations("create");
  const tRoles = useTranslations("office.roles");
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const seed = name.trim().toLowerCase() || "your-office";

  return (
    <div className={cn("rounded-[20px] border border-border bg-background p-1.5 text-start [--face-ring:var(--ui-background)]", className)}>
      <label className="flex cursor-text items-center gap-3 px-3 py-2.5">
        <motion.span
          key={seed}
          initial={reduce ? false : { scale: 0.85, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 520, damping: 28 }}
          className="flex shrink-0"
          aria-hidden
        >
          <Face seed={seed} size={40} square />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="sr-only">{t("nameLabel")}</span>
          <input
            value={name}
            onChange={(event) => onName(event.target.value)}
            placeholder={t("namePlaceholder")}
            maxLength={48}
            autoFocus={autoFocus}
            autoComplete="organization"
            className="w-full bg-transparent text-[16.5px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-faint"
          />
          <span className="block text-[12.5px] text-muted-foreground">{t("seatsFree")}</span>
        </span>
      </label>
      {user && (
        <>
          <div className="mx-3 border-t border-border" />
          <div className="flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-muted-foreground">
            <Face seed={user.id} size={20} />
            <span className="min-w-0 flex-1 truncate">{t("firstIn", { name: user.displayName })}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{tRoles("admin")}</span>
          </div>
        </>
      )}
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
      <div className="flex h-11 items-center gap-1 rounded-full border border-border bg-background p-1 ps-4 transition-colors focus-within:border-foreground/35">
        <Link2 className="size-4 shrink-0 text-muted-foreground" />
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
          className="h-9 shrink-0 cursor-pointer rounded-full border border-border bg-card px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("join")}
        </button>
      </div>
      {error && <p className="mt-2 ps-4 text-[12.5px] text-destructive">{error}</p>}
    </form>
  );
}
