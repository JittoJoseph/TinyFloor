"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { api, type TeamOffice } from "@/lib/api";
import { officePath } from "@/lib/links";
import { track } from "@/lib/analytics";
import { Face, FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

export interface Team {
  domain: string;
  offices: TeamOffice[];
}

/** How often a waiting request looks to see whether it was answered. */
const CHECK_MS = 15_000;

/**
 * The offices your colleagues are in, found by your work email (docs/product.md):
 * undefined until known, null when there are none. Someone who signed up on
 * their own, without the link, sees their team's office before "make your own".
 */
export function useTeamOffices(): Team | null | undefined {
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    api.myTeam().then(
      ({ domain, offices }) => !cancelled && setTeam(domain && offices.length > 0 ? { domain, offices } : null),
      () => !cancelled && setTeam(null),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return team;
}

/**
 * Your team's offices: each one's mark and name, who's in it, and the one
 * thing to do about it, always in the same place: join, ask to join, take the
 * request back while it waits, or nothing when it's full. A request that's
 * waiting is checked on, and walks you in the moment an admin lets you in.
 */
export function TeamOffices({ team, label, className }: { team: Team; label?: string; className?: string }) {
  const t = useTranslations("team");
  const router = useRouter();
  const [offices, setOffices] = useState(team.offices);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const waiting = offices.filter((one) => one.asked).map((one) => one.id).join(",");

  // Asked: once an admin lets you in, the office is yours, and you walk in.
  useEffect(() => {
    if (!waiting) return;
    const ids = new Set(waiting.split(","));
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void api.me().then(({ offices: mine }) => {
        const found = mine?.find((one) => ids.has(one.id));
        if (found) router.replace(officePath(found.id));
      }, () => undefined);
    }, CHECK_MS);
    return () => clearInterval(timer);
  }, [waiting, router]);

  const mark = (id: string, asked: boolean) => setOffices((all) => all.map((one) => (one.id === id ? { ...one, asked } : one)));

  const act = async (office: TeamOffice) => {
    if (busy || office.full) return;
    setBusy(office.id);
    setFailed(false);
    try {
      if (office.asked) {
        await api.cancelJoinRequest(office.id);
        mark(office.id, false);
      } else {
        const { joined } = await api.joinTeamOffice(office.id);
        track(joined ? "office_joined_by_domain" : "office_join_requested", { office_id: office.id, members: office.members });
        if (joined) return router.replace(officePath(office.id));
        mark(office.id, true);
      }
    } catch {
      setFailed(true);
    }
    setBusy(null);
  };

  return (
    <div className={cn("text-start", className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
        {label && <p className="px-4 pb-1 pt-3.5 text-[12px] font-medium text-muted-foreground">{label}</p>}
        <ul className="divide-y divide-border">
          {offices.map((office) => (
            <li key={office.id} className="flex items-center gap-3.5 px-4 py-3.5">
              <Face seed={office.id} size={40} square />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14.5px] font-semibold leading-5 text-foreground">{office.name}</p>
                <p className="mt-1 flex min-w-0 items-center gap-2 text-[12.5px] leading-[18px] text-muted-foreground">
                  <FaceStack seeds={office.faces} size={18} max={3} className="[--face-ring:var(--ui-card)]" />
                  <span className="truncate">
                    {office.asked ? t("waiting", { owner: office.owner }) : `${office.owner} · ${t("members", { count: office.members })}`}
                  </span>
                </p>
              </div>
              {office.full ? (
                <span className="min-w-[6.5rem] shrink-0 text-center text-[12.5px] text-faint">{t("full")}</span>
              ) : (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void act(office)}
                  className={cn(
                    "inline-flex h-9 min-w-[6.5rem] shrink-0 px-4 cursor-pointer items-center justify-center gap-1.5 rounded-full text-[13px] font-medium transition-[background-color,opacity] disabled:cursor-default disabled:opacity-60",
                    office.asked
                      ? "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "bg-foreground text-background hover:bg-foreground/90",
                  )}
                >
                  {busy === office.id && <Loader2 className="size-3.5 animate-spin" />}
                  {office.asked ? t("cancel") : office.access === "open" ? t("join") : t("ask")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {failed && <p className="mt-2 px-1 text-[12.5px] text-destructive">{t("failed")}</p>}
    </div>
  );
}
