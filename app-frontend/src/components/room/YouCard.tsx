"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ChevronRight, Desk, Shirt, UserPlus } from "@/components/ui/icons";
import { CharacterBust } from "@/components/character/CharacterBust";
import { CharacterStage } from "@/components/character/CharacterStage";
import { openCharacterCreator, warmCharacterCreator } from "@/components/character/creatorOpen";
import { useAuth } from "@/contexts/AuthContext";
import { useMyNote, useMyStatus } from "@/lib/floor";
import { deskOf, goToMyDesk, useDesks } from "@/lib/desks";
import { openDecorate, useDecorate } from "@/lib/decorate";
import { NoteGlyph } from "@/lib/noteIcons";
import { cn } from "@/lib/utils";
import { DeskCustomizer } from "./DecoratePanel";

type Mode = "closed" | "peek" | "open" | "desk";

const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

/**
 * You on this floor, at its top right, opposite where you are and who's here
 * (top left), and as tall: your character, head and shoulders. The rail's
 * face (bottom left) is you everywhere, your account; this is you here.
 *
 * Pointed at, it widens to your name, as a desk's plate does, and the Invite
 * beside it steps aside (`onActive`): opened, the card has it as a row. Pressed,
 * it grows down into a card: you standing on a stage, as the creator and your
 * profile show you, your name and how you are under you; then your desk (go
 * to it, or, sitting at it, customize it), how you look, and inviting people.
 * Customizing your desk, the same card grows into the desk's things
 * (DeskCustomizer) and the floor brings the desk into view beside it
 * (DeskDecorator); Done folds it back. One thing changing shape, never two
 * things trading places.
 */
export function YouCard({
  userId,
  name,
  onInvite,
  inviteLabel,
  onActive,
}: {
  userId: string;
  name: string;
  /** Inviting people, when there's someone to invite: a row of the card. */
  onInvite?: () => void;
  inviteLabel?: string;
  /** Whether the card is more than your face (pointed at, open, customizing): what sits beside it makes room. */
  onActive?: (active: boolean) => void;
}) {
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
  const wide = mode === "open" || mode === "desk";

  useEffect(() => onActive?.(mode !== "closed"), [mode, onActive]);

  // The card or the desk's panel going away under the pointer: your circle comes back as itself, not opened to your name.
  const close = () => {
    setHover(false);
    setOpen(false);
  };
  const [wasDecorating, setWasDecorating] = useState(!!decorating);
  if (wasDecorating !== !!decorating) {
    setWasDecorating(!!decorating);
    if (!decorating) setHover(false);
  }

  // Open, it closes when you press anywhere else (the floor too) or Escape. Decorating, only Done closes it.
  useEffect(() => {
    if (mode !== "open") return;
    const away = (event: PointerEvent) => !box.current?.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [mode]);

  // The card grows out of your circle's corner and goes back into it: only its opacity and scale move, from the top right.
  const card = {
    initial: reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: -4 },
    animate: { opacity: 1, scale: 1, y: 0, transition: reduce ? { duration: 0.12 } : { type: "spring" as const, stiffness: 520, damping: 38, mass: 0.7 } },
    exit: reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, scale: 0.96, y: -2, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } },
  };
  const surface = "absolute end-0 top-0 flex origin-top-right flex-col overflow-hidden rounded-[18px] border border-border bg-card shadow-float [--face-ring:var(--ui-card)]";

  return (
    <div
      ref={box}
      className="pointer-events-auto relative"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        setHover(true);
        warmCharacterCreator();
      }}
      onPointerLeave={() => setHover(false)}
    >
      {/* Resting: you. Pointed at, your name opens out to your left, as a desk's plate opens:
          only the name's width and opacity move, so you stay exactly where you are. Always
          here, under the card when it's open, so closing it is the card going back into it. */}
      <button
        type="button"
        aria-label={tShell("you")}
        aria-expanded={wide}
        onClick={() => setOpen((now) => !now)}
        className="flex h-10 items-center rounded-[20px] border border-border bg-card/95 p-[3px] shadow-float outline-none backdrop-blur-md [--face-ring:var(--ui-card)]"
      >
        <span
          className={cn(
            "max-w-0 truncate whitespace-nowrap text-[13px] font-medium text-foreground opacity-0 transition-[max-width,margin,opacity] duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            mode === "peek" && "ms-3 me-2.5 max-w-[12rem] opacity-100",
          )}
        >
          {name}
        </span>
        <CharacterBust character={character} presence={presence} />
      </button>

      {/* One at a time: the card goes back into your circle before the desk's panel comes out of it, and back. */}
      <AnimatePresence mode="wait">
        {mode === "open" && (
          <motion.div key="open" {...card} className={cn(surface, "w-[18rem]")}>
            {/* You, standing, as the creator shows you; who and how you are under you. Pressed, the card folds back. */}
            <button
              type="button"
              aria-label={tShell("you")}
              aria-expanded
              onClick={close}
              className="group flex flex-col items-center px-2 pt-2 outline-none"
            >
              <CharacterStage character={character} scale={2} ground={12} className="h-[7.25rem] w-full rounded-[10px] transition-[filter] duration-150 group-hover:brightness-[1.06]" />
              <span className="mt-3 block max-w-full truncate px-2 text-[15px] font-semibold leading-snug text-foreground">{name}</span>
              <span className="mt-1 flex max-w-full items-center gap-1.5 px-2 text-[12.5px] text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[presence] ?? "bg-faint")} />
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
            </button>
            <div className="mt-3 flex flex-col gap-px border-t border-border p-1.5">
              <Row
                icon={<Desk />}
                disabled={!mine}
                hint={!mine ? t("noDesk") : undefined}
                onClick={() => {
                  close();
                  if (atDesk) openDecorate();
                  else if (mine) goToMyDesk();
                }}
              >
                {atDesk ? t("customizeDesk") : mine ? tDesk("goTo") : t("noDeskTitle")}
              </Row>
              <Row
                icon={<Shirt />}
                onClick={() => {
                  close();
                  openCharacterCreator();
                }}
              >
                {tLook("open")}
              </Row>
              {onInvite && inviteLabel && (
                <Row
                  icon={<UserPlus />}
                  onClick={() => {
                    close();
                    onInvite();
                  }}
                >
                  {inviteLabel}
                </Row>
              )}
            </div>
          </motion.div>
        )}
        {mode === "desk" && decorating && (
          <motion.div key="desk" {...card} className={cn(surface, "h-[min(34rem,calc(100dvh-9.5rem))] w-[min(22rem,calc(100vw-1.5rem))] max-sm:h-[50dvh]")}>
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
    </div>
  );
}

/** A row of the card, as the rail's menu has them: what it does, and a chevron; or, when it can't, why not. */
function Row({ icon, hint, disabled, onClick, children }: { icon: ReactNode; hint?: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex min-h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 py-1.5 text-start outline-none transition-colors hover:bg-muted focus-visible:bg-muted disabled:hover:bg-transparent"
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
