"use client";

import { memo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Check, UserPlus, UsersRound } from "@/components/ui/icons";
import { Face } from "@/components/ui/Face";
import { CharacterBust } from "@/components/character/CharacterBust";
import { NoteGlyph } from "@/lib/noteIcons";
import { useFloor, walkToPerson, type FloorPerson } from "@/lib/floor";
import { cn } from "@/lib/utils";
import { useRouter } from "@/lib/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { makeOfficeHref } from "@/lib/pendingOffice";

/** Everyone on the floor, you first, then the rest as they arrived. */
function useHere(userId: string): FloorPerson[] {
  const everyone = useFloor();
  return [...everyone.filter((one) => one.id === userId), ...everyone.filter((one) => one.id !== userId)];
}

/**
 * How many are on the floor, in the dock: a count, not faces (the rail has
 * the office's mark, the floor has everyone's character). In the demo
 * office, where the number means nothing, it's Your office instead (`label`,
 * `icon`). Pressed, the dock opens up into HerePanel, or in the demo,
 * DemoPanel.
 */
export function HereKey({ userId, open, onToggle, label, icon }: { userId: string; open: boolean; onToggle: () => void; label?: string; icon?: ReactNode }) {
  const t = useTranslations("room");
  const count = Math.max(useHere(userId).length, 1);
  return (
    <button
      type="button"
      aria-label={label ?? t("peopleHere", { count })}
      title={label ? undefined : t("peopleHere", { count })}
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] px-2.5 text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
        open ? "bg-foreground/[0.08] text-foreground" : "hover:bg-foreground/[0.06] hover:text-foreground",
      )}
    >
      {icon ?? <UsersRound className="size-[18px]" />}
      <span className={cn("text-[13px]", label ? "font-medium" : "font-semibold tabular-nums")}>{label ?? count}</span>
    </button>
  );
}

/**
 * The dock opened up over who's here: everyone on the floor (pressing
 * someone walks you over to them) and inviting more; alone, the empty places
 * and the way to fill them.
 */
function HerePanelBody({ userId, onInvite, copied, onDone }: { userId: string; onInvite?: () => void; copied: boolean; onDone: () => void }) {
  const t = useTranslations("room");
  const tStatus = useTranslations("status");
  const here = useHere(userId);
  const count = Math.max(here.length, 1);

  const detail = (one: FloorPerson) =>
    one.note ? (
      <span className="flex min-w-0 items-center gap-1">
        <NoteGlyph icon={one.note.icon} className="size-3.5 shrink-0" />
        <span className="truncate">{one.note.text}</span>
      </span>
    ) : (
      tStatus(`${one.status === "offline" ? "away" : one.status}.label`)
    );

  if (here.length <= 1) {
    // Alone: your face beside the empty places, and the way to fill them.
    return (
      <div className="flex flex-col items-center px-3 pb-3 pt-5 text-center">
        <span className="flex items-center">
          <CharacterBust character={here[0]?.character ?? ""} presence={here[0]?.status ?? "available"} size={40} center={38} className="relative z-[1] rounded-full ring-2 ring-rail" />
          {[0, 1].map((one) => (
            <span key={one} className="-ms-1 flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border-strong bg-rail text-faint">
              <UserPlus className="size-4" />
            </span>
          ))}
        </span>
        <p className="mt-3 text-[14px] font-semibold">{t("aloneTitle")}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{t(onInvite ? "aloneBody" : "aloneQuiet")}</p>
        {onInvite && (
          <div className="mt-3.5 w-full">
            <InviteButton onInvite={onInvite} copied={copied} label={t("inviteSomeone")} copiedLabel={t("linkCopied")} />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <p className="px-3.5 pb-1.5 pt-3 text-[12px] font-medium text-muted-foreground">{t("peopleHere", { count })}</p>
      <ul className="flex max-h-[min(20rem,50vh)] flex-col gap-px overflow-y-auto px-1.5 pb-1.5">
        {here.map((one) => {
          const you = one.id === userId;
          const body = (
            <>
              <CharacterBust character={one.character} presence={one.status} center={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-foreground">{you ? t("you", { name: one.name }) : one.name}</span>
                <span className="block truncate text-[11.5px] text-muted-foreground">{detail(one)}</span>
              </span>
            </>
          );
          return (
            <li key={one.id}>
              {you ? (
                <div className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-1.5">{body}</div>
              ) : (
                <button
                  type="button"
                  title={t("walkTo", { name: one.name })}
                  onClick={() => {
                    onDone();
                    walkToPerson(one.id);
                  }}
                  className="group flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06]"
                >
                  {body}
                  <ArrowRight className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 rtl:rotate-180" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {onInvite && (
        <div className="border-t border-border p-1.5">
          <InviteButton onInvite={onInvite} copied={copied} label={t("invite")} copiedLabel={t("linkCopied")} quiet />
        </div>
      )}
    </>
  );
}

function InviteButton({ onInvite, copied, label, copiedLabel, quiet = false }: { onInvite: () => void; copied: boolean; label: string; copiedLabel: string; quiet?: boolean }) {
  return (
    <button
      type="button"
      onClick={onInvite}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] text-[13px] font-medium outline-none transition-[background-color,opacity] focus-visible:ring-2 focus-visible:ring-ring/60",
        quiet ? "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]" : "bg-foreground text-background hover:opacity-90",
      )}
    >
      {copied ? <Check className="size-3.5" /> : <UserPlus className="size-3.5" />}
      {copied ? copiedLabel : label}
    </button>
  );
}

/** Kept mounted under the dock while it's closed: it renders again only when what it shows changes. */
export const HerePanel = memo(HerePanelBody);

/**
 * The demo office's own key, opened: an office of your own, in a line, and
 * the way to it (/create, its door, which asks the name; signing up first
 * when there's no account yet).
 */
function DemoPanelBody({ onDone }: { onDone: () => void }) {
  const t = useTranslations("lobby.dock");
  const tOffice = useTranslations("lobby.yourOffice");
  const router = useRouter();
  const { user } = useAuth();
  return (
    <div className="flex flex-col items-center px-3 pb-3 pt-5 text-center">
      {/* The mark the door will show for it, so the office looks the same from here to there. */}
      <Face seed={user?.id || "your-office"} size={40} square />
      <p className="mt-3 text-[14px] font-semibold">{t("title")}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Check className="size-3.5 text-ok" />
        {tOffice("free")}
      </p>
      <button
        type="button"
        onClick={() => {
          onDone();
          router.push(makeOfficeHref({ account: !!user && !user.guest, fromDemo: true }));
        }}
        className="group mt-4 flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-foreground text-[13px] font-medium text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {t("start")}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
      </button>
    </div>
  );
}

export const DemoPanel = memo(DemoPanelBody);
