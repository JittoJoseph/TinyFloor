"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "@/components/ui/icons";
import { useRouter } from "@/lib/i18n/navigation";
import { api, type TeamOffice } from "@/lib/api";
import { officePath } from "@/lib/links";
import { track } from "@/lib/analytics";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

interface Team {
  domain: string;
  offices: TeamOffice[];
}

/**
 * The offices your colleagues are in, found by your work email (docs/product.md):
 * undefined until known, null when there are none. Someone who signed up on their
 * own, without the link, sees their team's office before "make your own".
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

/** Walking into a colleague's office, then onto its floor. */
function useJoin() {
  const t = useTranslations("team");
  const router = useRouter();
  const [joining, setJoining] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const join = async (office: TeamOffice) => {
    if (joining || office.full) return;
    setJoining(office.id);
    setFailed(null);
    try {
      await api.joinTeamOffice(office.id);
      track("office_joined_by_domain", { office_id: office.id, members: office.members });
      router.replace(officePath(office.id));
    } catch {
      setFailed(t("failed"));
      setJoining(null);
    }
  };
  return { join, joining, failed };
}

/** Their faces, the owner's first: who you'd be walking in beside. */
function Faces({ office, size }: { office: TeamOffice; size: number }) {
  return (
    <span className="flex shrink-0 items-center">
      {office.faces.slice(0, 4).map((id) => (
        <span key={id} className="-ms-1.5 rounded-full ring-2 ring-card first:ms-0">
          <Face seed={id} size={size} />
        </span>
      ))}
    </span>
  );
}

/** One office to join: its mark and name, who's in it, and the way in. */
function TeamOfficeRow({ office, join }: { office: TeamOffice; join: ReturnType<typeof useJoin> }) {
  const t = useTranslations("team");
  const busy = join.joining === office.id;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Face seed={office.id} size={36} square />
      <div className="min-w-0 flex-1 text-start">
        <p className="truncate text-[14px] font-medium text-foreground">{office.name}</p>
        <div className="mt-1 flex items-center gap-2">
          <Faces office={office} size={18} />
          <span className="min-w-0 truncate text-[12.5px] text-muted-foreground">{t("members", { count: office.members })}</span>
        </div>
      </div>
      {office.full ? (
        <span className="shrink-0 text-[12.5px] text-muted-foreground">{t("full")}</span>
      ) : (
        <button
          type="button"
          disabled={!!join.joining}
          onClick={() => void join.join(office)}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" />}
          {t("join")}
        </button>
      )}
    </div>
  );
}

/** Your team's offices as a card: on the door with no office yet, and before making another. */
export function TeamOffices({ team, label, className }: { team: Team; label?: string; className?: string }) {
  const t = useTranslations("team");
  const join = useJoin();
  return (
    <div className={cn("text-start", className)}>
      <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.06),0_16px_40px_-28px_rgb(0_0_0/0.45)]">
        <p className="px-4 pb-0.5 pt-3 text-[12px] font-medium text-faint">{label ?? t("atDomain", { domain: team.domain })}</p>
        <div className="divide-y divide-border">
          {team.offices.map((office) => (
            <TeamOfficeRow key={office.id} office={office} join={join} />
          ))}
        </div>
      </div>
      {join.failed && <p className="mt-2 px-4 text-[12.5px] text-destructive">{join.failed}</p>}
    </div>
  );
}
