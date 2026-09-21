import { useTranslations } from "next-intl";
import { Footprints, MessageSquare, UserPlus } from "lucide-react";
import { Face, FaceStack, type Presence } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [maya, leo, priya, sam, aiko, noah] = CAST;

const TONE: Record<string, string> = {
  available: "bg-ok/12 text-ok",
  busy: "bg-destructive/12 text-destructive",
  away: "bg-warn/15 text-warn",
};
const DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn" };

/** People, as the app's cards: who they are, what they're up to, and the way to them. */
export function PeoplePreview({ count = 5, narrow = false }: { count?: number; narrow?: boolean }) {
  const t = useTranslations("home.preview");
  const tp = useTranslations("office.people");
  type Row = { person: (typeof CAST)[number]; status: "available" | "busy" | "away" | "offline"; role: string };
  const rows: Row[] = [
    { person: maya, status: "available", role: t("roles.design") },
    { person: priya, status: "busy", role: t("roles.engineering") },
    { person: sam, status: "away", role: t("roles.product") },
    { person: leo, status: "available", role: t("roles.engineering") },
    { person: aiko, status: "available", role: t("roles.design") },
    { person: noah, status: "offline", role: t("roles.product") },
  ];
  const people = rows.slice(0, count);

  return (
    <div className="h-full overflow-hidden p-4 text-start sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold tracking-tight text-foreground">{t("people")}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{tp("subtitle", { office: t("office") })}</p>
        </div>
        <span className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 text-[11.5px] font-medium text-background">
          <UserPlus className="size-3.5" />
          {t("invite")}
        </span>
      </div>
      {!narrow && (
        <div className="mt-4 hidden items-center gap-3 rounded-2xl border border-border bg-background p-3 [--face-ring:var(--ui-background)] sm:flex">
          <FaceStack seeds={people.filter((one) => one.status !== "offline").map((one) => one.person.id)} size={26} max={5} />
          <p className="text-[12.5px] font-semibold text-foreground">{tp("onFloorNow", { count: people.filter((one) => one.status !== "offline").length })}</p>
          <span className="ms-auto flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-ok" />
            {t("office")}
          </span>
        </div>
      )}
      <div className={cn("mt-3 gap-4 border-b border-border text-[11.5px] font-medium", narrow ? "hidden" : "flex")}>
        {[
          { label: tp("members"), count: count, on: true },
          { label: tp("invitations"), count: 1 },
          { label: tp("guests"), count: 1 },
        ].map((tab) => (
          <span
            key={tab.label}
            className={cn(
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 pb-2",
              tab.on ? "border-foreground text-foreground" : "border-transparent text-muted-foreground",
            )}
          >
            {tab.label}
            <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{tab.count}</span>
          </span>
        ))}
      </div>
      <ul className={cn("mt-3.5 grid gap-2.5", narrow ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {people.map(({ person, status, role }) => (
          <li
            key={person.id}
            className="flex flex-col rounded-2xl border border-border bg-background p-3.5 [--face-ring:var(--ui-background)]"
          >
            <div className="flex items-center gap-2.5">
              <Face seed={person.id} size={38} presence={status === "offline" ? null : (status as Presence)} />
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-foreground">{person.name}</p>
                <p className="text-[11.5px] text-muted-foreground">{role}</p>
              </div>
            </div>
            {status === "offline" ? (
              <span className="mt-2.5 inline-flex h-5 w-fit items-center gap-1.5 rounded-full bg-muted px-2 text-[10.5px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-faint" />
                {t("notOnFloor")}
              </span>
            ) : (
              <span className={cn("mt-2.5 inline-flex h-5 w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[10.5px] font-medium", TONE[status])}>
                <span className={cn("size-1.5 rounded-full", DOT[status])} />
                {t(status)} · {t("onFloor")}
              </span>
            )}
            <div className="mt-3 flex gap-1.5 border-t border-border pt-2.5">
              <span className="flex h-7 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-border bg-card text-[11px] font-medium text-foreground">
                <MessageSquare className="size-3" />
                {t("message")}
              </span>
              {status !== "offline" && (
                <span className="flex h-7 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-foreground text-[11px] font-medium text-background">
                  <Footprints className="size-3" />
                  {t("walkTo")}
                </span>
              )}
            </div>
          </li>
        ))}
        {/* The empty seat, the way the app offers it: a dashed card that invites someone. */}
        <li className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong p-3.5 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
            <UserPlus className="size-4" />
          </span>
          <span className="text-[12.5px] font-semibold text-foreground">{t("inviteTeammate")}</span>
          <span className="text-[11px] leading-snug text-muted-foreground">{t("inviteTeammateNote")}</span>
        </li>
      </ul>
    </div>
  );
}
