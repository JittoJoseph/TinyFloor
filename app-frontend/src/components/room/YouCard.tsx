"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ChevronRight, Desk, Shirt } from "@/components/ui/icons";
import { CharacterBust } from "@/components/character/CharacterBust";
import { CharacterPortrait } from "@/components/character/CharacterPortrait";
import { openCharacterCreator } from "@/components/character/CharacterCreator";
import { useAuth } from "@/contexts/AuthContext";
import { useMyNote, useMyStatus } from "@/lib/floor";
import { deskOf, goToMyDesk, useDesks } from "@/lib/desks";
import { openDecorate, useDecorate } from "@/lib/decorate";
import { NoteGlyph } from "@/lib/noteIcons";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { DeskCustomizer } from "./DecoratePanel";

type Mode = "closed" | "peek" | "open" | "desk";

const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

/**
 * You on this floor, at its top right, opposite where you are and who's here
 * (top left), and as tall: your character, head and shoulders. The rail's
 * face (bottom left) is you everywhere, your account; this is you here.
 *
 * Pointed at, it widens to your name, as a desk's plate does. Pressed, it
 * grows down into a card: you standing on the office's floor, your name, how
 * you are and where; your desk (go to it, or, sitting at it, customize it);
 * how you look. Customizing your desk, the same card grows into the desk's
 * things (DeskCustomizer) and the floor brings the desk into view beside it
 * (DeskDecorator); Done folds it back. One thing changing shape, never two
 * things trading places.
 */
export function YouCard({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("you");
  const tDesk = useTranslations("desk");
  const tLook = useTranslations("look");
  const tShell = useTranslations("shell");
  const tStatus = useTranslations("status");
  const reduce = useReducedMotion() ?? false;
  const { user } = useAuth();
  const status = useMyStatus();
  const note = useMyNote();
  const { desks, seat } = useDesks();
  const { desk: decorating } = useDecorate();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mode: Mode = decorating ? "desk" : open ? "open" : hover ? "peek" : "closed";
  const character = user?.character ?? "";
  const presence = status === "offline" ? "away" : status;
  const mine = deskOf(desks, userId);
  const atDesk = !!mine && mine.seat === seat;

  // Open, it closes when you press anywhere else (the floor too) or Escape. Decorating, only Done closes it.
  useEffect(() => {
    if (mode !== "open") return;
    const away = (event: PointerEvent) => !box.current?.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [mode]);

  const layout = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.18, delay: reduce ? 0 : 0.08 } },
    exit: { opacity: 0, transition: { duration: 0.08 } },
  };

  return (
    <motion.div
      ref={box}
      layout
      transition={layout}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ borderRadius: mode === "closed" || mode === "peek" ? 20 : 18 }}
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden border border-border bg-card/95 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]",
        mode === "open" && "w-[18.5rem]",
        mode === "desk" && "h-[min(34rem,calc(100dvh-9.5rem))] w-[min(22rem,calc(100vw-1.5rem))] max-sm:h-[50dvh]",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {(mode === "closed" || mode === "peek") && (
          // Resting: you, and your name beside you once pointed at.
          <motion.button
            key="pill"
            layout="position"
            transition={layout}
            {...fade}
            type="button"
            aria-label={tShell("you")}
            aria-expanded={false}
            onClick={() => setOpen(true)}
            className={cn("flex h-[38px] cursor-pointer items-center gap-2.5 p-[3px] outline-none", mode === "peek" && "ps-3.5")}
          >
            {mode === "peek" && <span className="max-w-[12rem] truncate text-[13px] font-medium text-foreground">{name}</span>}
            <CharacterBust character={character} presence={presence} />
          </motion.button>
        )}

        {mode === "open" && (
          <motion.div key="open" {...fade} className="flex flex-col">
            {/* You on the office floor, twice your size, head to waist, and who and how you are. */}
            <button
              type="button"
              aria-expanded
              aria-label={tShell("you")}
              onClick={() => setOpen(false)}
              className="flex cursor-pointer items-center gap-3 p-3 text-start outline-none"
            >
              <CharacterPortrait character={character} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold leading-snug text-foreground">{name}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[presence] ?? "bg-faint")} />
                  <span className="truncate">{tStatus(`${presence}.label`)}</span>
                </span>
                {note ? (
                  <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
                    <NoteGlyph icon={note.icon} className="size-3.5 shrink-0" />
                    <span className="truncate">{note.text}</span>
                  </span>
                ) : (
                  atDesk && <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{t("atDesk")}</span>
                )}
              </span>
            </button>
            <div className="flex flex-col gap-px border-t border-border p-1.5">
              <Row
                icon={<Desk />}
                disabled={!mine}
                hint={!mine ? t("noDesk") : undefined}
                onClick={() => {
                  setOpen(false);
                  if (atDesk) openDecorate();
                  else if (mine) goToMyDesk();
                }}
              >
                {atDesk ? t("customizeDesk") : mine ? tDesk("goTo") : t("noDeskTitle")}
              </Row>
              <Row
                icon={<Shirt />}
                onClick={() => {
                  setOpen(false);
                  openCharacterCreator();
                }}
              >
                {tLook("open")}
              </Row>
            </div>
          </motion.div>
        )}

        {mode === "desk" && decorating && (
          <motion.div key="desk" {...fade} className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-[38px] shrink-0 items-center gap-2.5 p-[3px] ps-3.5">
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{t("customizeDesk")}</span>
              <CharacterBust character={character} presence={presence} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col border-t border-border pt-2.5">
              <DeskCustomizer desk={decorating} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** A row of the card, as the rail's menu has them: what it does, and a chevron; or, when it can't, why not. */
function Row({ icon, hint, disabled, onClick, children }: { icon: ReactNode; hint?: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[13px]", disabled ? "text-muted-foreground" : "text-foreground")}>{children}</span>
        {hint && <span className="block text-[11.5px] leading-snug text-muted-foreground">{hint}</span>}
      </span>
      {!disabled && <ChevronRight className="size-3.5 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground rtl:rotate-180" />}
    </button>
  );
}
