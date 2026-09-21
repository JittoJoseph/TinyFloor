import { useTranslations } from "next-intl";
import { Footprints, Link2, MessageSquare, UserPlus } from "lucide-react";
import { Face, type Presence } from "@/components/ui/Face";
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
export function PeoplePreview({ count = 6, narrow = false }: { count?: number; narrow?: boolean }) {
  const t = useTranslations("home.preview");
  const people: Array<{ person: (typeof CAST)[number]; status: "available" | "busy" | "away" | "offline"; role: string }> = [
    { person: maya, status: "available", role: t("roles.design") },
    { person: priya, status: "busy", role: t("roles.engineering") },
    { person: sam, status: "away", role: t("roles.product") },
    { person: leo, status: "available", role: t("roles.engineering") },
    { person: aiko, status: "available", role: t("roles.design") },
    { person: noah, status: "offline", role: t("roles.product") },
  ];

  return (
    <div className="h-full overflow-hidden p-4 text-start sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-foreground">{t("people")}</p>
          <p className="text-[11.5px] text-muted-foreground">{t("here", { count: 5 })}</p>
        </div>
        <span className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[11.5px] font-medium text-background">
          <UserPlus className="size-3.5" />
          {t("invite")}
        </span>
      </div>
      <ul className={cn("mt-3 grid gap-2.5", narrow ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3")}>
        {people.slice(0, count).map(({ person, status, role }) => (
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
      </ul>
      {count > 3 && (
        <div className="mt-2.5 hidden items-center gap-3 rounded-2xl border border-dashed border-border-strong p-3 sm:flex">
          <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Link2 className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground">{t("guestLink")}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t("guestNote")}</p>
          </div>
          <span className="flex h-7 items-center rounded-full border border-border bg-card px-3 text-[11px] font-medium text-foreground">{t("copy")}</span>
        </div>
      )}
    </div>
  );
}
