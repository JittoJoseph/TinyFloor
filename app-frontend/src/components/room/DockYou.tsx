"use client";

import { memo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Desk, Shirt } from "web-shared/components/ui/icons";
import { CharacterBust } from "@/components/character/CharacterBust";
import { openCharacterCreator, warmCharacterCreator } from "@/components/character/creatorOpen";
import { useAuth } from "@/contexts/AuthContext";
import { useMyNote, useMyStatus } from "@/lib/floor";
import { PresenceControls } from "@/components/app/Presence";
import { deskOf, useDesks } from "@/lib/desks";
import { decorateMyDesk, findDeskToDecorate } from "@/lib/decorate";
import { NoteGlyph } from "@/lib/noteIcons";
import { cn } from "web-shared/lib/utils";


/**
 * You, at the start of the dock: your character, head and shoulders, with
 * your status on it. The rail's face (bottom left) is you everywhere, your
 * account; this is you on this floor. Pressed, the dock opens up into
 * YouPanel.
 */
export function YouKey({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const tShell = useTranslations("shell");
  const { user } = useAuth();
  const status = useMyStatus();
  if (!user) return null;
  return (
    <button
      type="button"
      aria-label={tShell("you")}
      title={user.displayName}
      aria-expanded={open}
      onClick={onToggle}
      data-settle="you"
      onPointerEnter={warmCharacterCreator}
      className={cn(
        "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[10px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60",
        open ? "bg-foreground/[0.08]" : "hover:bg-foreground/[0.06]",
      )}
    >
      <CharacterBust character={user.character ?? ""} presence={status === "offline" ? "away" : status} size={34} />
    </button>
  );
}

/**
 * The dock opened up over you: who you are and how your team sees you
 * (status and note: PresenceControls), then your desk and how you look.
 * Your desk is always here: customizing it from anywhere (you're walked to
 * it and sat down first), or, without one, finding a free one to make yours.
 */
function YouPanelBody({ onDone }: { onDone: () => void }) {
  const t = useTranslations("you");
  const tLook = useTranslations("look");
  const tStatus = useTranslations("status");
  const { user } = useAuth();
  const status = useMyStatus();
  const note = useMyNote();
  const { desks, seat, canClaim } = useDesks();
  if (!user) return null;
  const presence = status === "offline" ? "away" : status;
  const mine = deskOf(desks, user.id);
  const atDesk = !!mine && mine.seat === seat;
  const act = (then: () => void) => () => {
    onDone();
    then();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-3 pb-3 pt-3.5">
        <CharacterBust character={user.character ?? ""} presence={presence} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-snug">{user.displayName}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="shrink-0">{tStatus(`${presence}.label`)}</span>
            {(note || atDesk) && <span aria-hidden className="text-faint">·</span>}
            {note ? (
              <span className="flex min-w-0 items-center gap-1">
                <NoteGlyph icon={note.icon} className="size-3.5 shrink-0" />
                <span className="truncate">{note.text}</span>
              </span>
            ) : (
              atDesk && <span className="truncate">{t("atDesk")}</span>
            )}
          </span>
        </span>
      </div>

      {/* How your team sees you: status, note, music. */}
      <div className="px-1.5 pb-1.5">
        <PresenceControls />
      </div>

      <div className="flex flex-col gap-px border-t border-border p-1.5">
        {mine ? (
          <Row icon={<Desk />} onClick={act(decorateMyDesk)} settle="decorate">
            {t("customizeDesk")}
          </Row>
        ) : (
          canClaim && (
            <Row icon={<Desk />} onClick={act(findDeskToDecorate)} settle="desk">
              {t("findDesk")}
            </Row>
          )
        )}
        <Row icon={<Shirt />} onClick={act(openCharacterCreator)} settle="look">
          {tLook("open")}
        </Row>
      </div>
    </>
  );
}

/** A row of the open dock, as the rail's menu has them: what it does, and a chevron. */
function Row({ icon, onClick, settle, children }: { icon: ReactNode; onClick: () => void; settle?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Where settling in points, when this is the next thing to try (SettleIn).
      data-settle={settle}
      data-settle-side="right"
      className="group flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:bg-foreground/[0.06]"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{children}</span>
      <ChevronRight className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

/** Kept mounted under the dock while it's closed: it renders again only when what it shows changes. */
export const YouPanel = memo(YouPanelBody);
