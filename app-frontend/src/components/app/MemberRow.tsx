"use client";

import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Footprints, MessageSquare, UserRound } from "@/components/ui/icons";
import { Face, type Presence } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  available: "bg-ok",
  busy: "bg-destructive",
  away: "bg-warn",
  in_call: "bg-violet-500",
};

/** Who comes first in a list of people: on the floor before not, the free before the busy. */
export const PRESENCE_ORDER: Record<string, number> = { available: 0, in_call: 1, busy: 2, away: 3 };

/**
 * A person as a row of the People list: who they are, whether they're on the
 * floor and how, their role, and the two things you'd do next (write to them,
 * walk over) as quiet buttons at the end.
 */
export function MemberRow({
  id,
  name,
  detail,
  presence,
  role,
  joinedAt,
  isMe,
  menu,
  onMessage,
  onWalk,
  onProfile,
}: {
  id: string;
  name: string;
  /** An email, or nothing for a guest. */
  detail?: string | null;
  /** Their status on the floor, or null when they are not on it. */
  presence: Presence;
  /** "Owner", "Admin", "Member": already in words. */
  role?: string;
  joinedAt?: number;
  isMe: boolean;
  /** An admin's menu for this person. */
  menu?: ReactNode;
  onMessage?: () => void;
  onWalk?: () => void;
  onProfile?: () => void;
}) {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  const format = useFormatter();
  const onFloor = !!presence && presence !== "offline";

  return (
    <li className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 [--face-ring:var(--ui-background)] sm:gap-4">
      <Face seed={id} size={36} presence={onFloor ? presence : null} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">
          {name}
          {isMe && <span className="font-normal text-muted-foreground"> · {t("youLower")}</span>}
        </p>
        <p className="truncate text-[12.5px] text-muted-foreground">{detail || t("guest")}</p>
      </div>

      <span className="hidden w-36 shrink-0 items-center gap-2 text-[12.5px] sm:flex">
        <span className={cn("size-1.5 shrink-0 rounded-full", onFloor ? STATUS_DOT[presence!] : "bg-faint")} />
        <span className={cn("truncate", onFloor ? "text-foreground" : "text-muted-foreground")}>
          {onFloor ? tStatus(`${presence as "available"}.label`) : t("notOnFloor")}
        </span>
      </span>
      {role !== undefined && <span className="hidden w-20 shrink-0 truncate text-[12.5px] text-muted-foreground md:block">{role}</span>}
      {joinedAt !== undefined && (
        <span className="hidden w-24 shrink-0 text-[12.5px] tabular-nums text-faint lg:block">
          {format.dateTime(new Date(joinedAt), { month: "short", year: "numeric" })}
        </span>
      )}

      <div className="flex w-[7.5rem] shrink-0 items-center justify-end gap-0.5">
        {isMe ? (
          onProfile && <IconButton label={t("yourProfile")} size="sm" icon={<UserRound />} onClick={onProfile} />
        ) : (
          <>
            {onMessage && <IconButton label={t("message")} size="sm" icon={<MessageSquare />} onClick={onMessage} />}
            {onFloor && onWalk && <IconButton label={t("walkTo")} size="sm" icon={<Footprints />} onClick={onWalk} />}
          </>
        )}
        {menu}
      </div>
    </li>
  );
}
