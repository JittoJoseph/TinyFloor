"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Footprints, Lock, MessageSquare, UserRound } from "lucide-react";
import { Face, type Presence } from "@/components/ui/Face";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  available: "bg-ok/12 text-ok",
  busy: "bg-destructive/12 text-destructive",
  away: "bg-warn/15 text-warn",
  in_call: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
};
const STATUS_DOT: Record<string, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
};

/**
 * A person as a card: who they are, where they are and what they are up to,
 * and the two things you would do next — write to them, or walk over.
 */
export function MemberCard({
  id,
  name,
  detail,
  presence,
  role,
  joinedAt,
  isMe,
  menu,
  onMessage,
  messageLocked,
  onWalk,
  onProfile,
}: {
  id: string;
  name: string;
  /** An email, or nothing for a guest. */
  detail?: string | null;
  /** Their status on the floor, or null when they are not on it. */
  presence: Presence;
  /** "Owner", "Admin", "Member" — already in words. */
  role?: string;
  joinedAt?: number;
  isMe: boolean;
  /** An admin's menu for this person. */
  menu?: ReactNode;
  onMessage?: () => void;
  /** Messages need an office here: the button says so instead of opening. */
  messageLocked?: boolean;
  onWalk?: () => void;
  onProfile?: () => void;
}) {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  const format = useFormatter();
  const onFloor = !!presence && presence !== "offline";

  return (
    <li className="group/card flex flex-col rounded-2xl border border-border bg-background p-4 transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-[0_1px_2px_rgb(0_0_0/0.05)] [--face-ring:var(--ui-background)]">
      <div className="flex items-start gap-3">
        <Face seed={id} size={48} presence={onFloor ? presence : null} />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {name}
            {isMe && <span className="font-normal text-muted-foreground"> · {t("youLower")}</span>}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{detail || t("guest")}</p>
        </div>
        {menu}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {onFloor ? (
          <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-[11.5px] font-medium", STATUS_TONE[presence!])}>
            <span className={cn("size-1.5 rounded-full", STATUS_DOT[presence!])} />
            {tStatus(`${presence as "available"}.label`)} · {t("onFloorShort")}
          </span>
        ) : (
          <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2 text-[11.5px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-faint" />
            {t("notOnFloor")}
          </span>
        )}
        {role && (
          <span className="inline-flex h-6 items-center rounded-full border border-border px-2 text-[11.5px] font-medium text-muted-foreground">
            {role}
          </span>
        )}
        {joinedAt && (
          <span className="text-[11.5px] text-faint">
            {t("joined", { date: format.dateTime(new Date(joinedAt), { month: "short", year: "numeric" }) })}
          </span>
        )}
      </div>

      {/* At the card's foot, so every card in a row lines its buttons up. */}
      <div className="mt-auto pt-3.5">
      <div className="flex items-center gap-2 border-t border-border pt-3">
        {isMe ? (
          onProfile && (
            <CardButton onClick={onProfile} icon={<UserRound />}>
              {t("yourProfile")}
            </CardButton>
          )
        ) : (
          <>
            {onMessage && (
              <CardButton onClick={onMessage} icon={messageLocked ? <Lock /> : <MessageSquare />}>
                {t("message")}
              </CardButton>
            )}
            {onFloor && onWalk && (
              <CardButton onClick={onWalk} icon={<Footprints />} solid>
                {t("walkTo")}
              </CardButton>
            )}
          </>
        )}
      </div>
      </div>
    </li>
  );
}

function CardButton({
  children,
  icon,
  onClick,
  solid,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  solid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-[background-color,transform] active:scale-[0.97] [&_svg]:size-3.5",
        solid ? "bg-foreground text-background hover:bg-foreground/90" : "border border-border bg-card text-foreground hover:bg-muted",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
