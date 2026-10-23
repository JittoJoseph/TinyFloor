"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { ChevronRight, Desk, Shirt, UserRound } from "@/components/ui/icons";
import { Face } from "@/components/ui/Face";
import { MenuExpand } from "@/components/ui/MenuViews";
import { MusicOptions, MusicRow } from "@/components/app/Music";
import { openCharacterCreator } from "@/components/character/CharacterCreator";
import { useRouter } from "@/lib/i18n/navigation";
import { openSettings } from "@/lib/links";
import { useMyStatus } from "@/lib/floor";
import { deskOf, goToMyDesk, useDesks } from "@/lib/desks";
import { openDecorate, useDecorate } from "@/lib/decorate";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { DeskCustomizer } from "./DecoratePanel";

type Mode = "closed" | "peek" | "open" | "desk";

/**
 * You, at the floor's top right, opposite where you are and who's here (top
 * left), and as tall as it: your face, with your status on it. Pointed at, it
 * widens to your name, as a desk's plate does; pressed, it grows down into a
 * card, its name and face staying where they were as its head. The card is
 * what's yours on this floor: your desk (go to it, or, sitting at it,
 * customize it), how you look, your music, your profile. Customizing your
 * desk, the same card grows into the desk's things (DeskCustomizer) and the
 * floor brings the desk into view beside it (DeskDecorator); Done folds it
 * back. One thing changing shape, never two things trading places.
 */
export function YouCard({ userId, name, settingsHref }: { userId: string; name: string; settingsHref?: string }) {
  const t = useTranslations("you");
  const tDesk = useTranslations("desk");
  const tLook = useTranslations("look");
  const tShell = useTranslations("shell");
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const status = useMyStatus();
  const { desks, seat } = useDesks();
  const { desk: decorating } = useDecorate();
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [music, setMusic] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const mode: Mode = decorating ? "desk" : open ? "open" : hover ? "peek" : "closed";
  const mine = deskOf(desks, userId);
  const atDesk = !!mine && mine.seat === seat;

  const close = () => {
    setOpen(false);
    setMusic(false);
  };

  // Open, it closes when you press anywhere else (the floor too) or Escape. Decorating, only Done closes it.
  useEffect(() => {
    if (mode !== "open") return;
    const away = (event: PointerEvent) => !box.current?.contains(event.target as Node) && close();
    const key = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
    };
  }, [mode]);

  const layout = reduce ? { duration: 0 } : SPRING_LAYOUT;
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.18, delay: reduce ? 0 : 0.06 } }, exit: { opacity: 0, transition: { duration: 0.08 } } };
  const wide = mode === "open" || mode === "desk";

  return (
    <motion.div
      ref={box}
      layout
      transition={layout}
      onPointerEnter={(event) => event.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      style={{ borderRadius: wide ? 18 : 20 }}
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden border border-border bg-card/95 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]",
        mode === "open" && "w-[18.5rem]",
        mode === "desk" && "h-[min(34rem,calc(100dvh-9.5rem))] w-[min(22rem,calc(100vw-1.5rem))] max-sm:h-[50dvh]",
      )}
    >
      {/* The head: in every state, your face at the corner; your name beside it once there's room. */}
      <motion.button
        layout="position"
        transition={layout}
        type="button"
        aria-expanded={wide}
        aria-label={tShell("you")}
        onClick={() => (mode === "desk" ? undefined : open ? close() : setOpen(true))}
        className={cn(
          "flex h-[38px] shrink-0 items-center gap-2.5 p-[3px] text-start outline-none",
          mode === "desk" ? "cursor-default" : "cursor-pointer",
          mode !== "closed" && "ps-3.5",
        )}
      >
        {mode !== "closed" && (
          <motion.span layout="position" transition={layout} {...fade} className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
            {mode === "desk" ? t("customizeDesk") : name}
          </motion.span>
        )}
        <motion.span layout="position" transition={layout} className="shrink-0">
          <Face seed={userId} size={32} presence={status === "offline" ? "away" : status} />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false} mode="popLayout">
        {mode === "open" && (
          <motion.div key="open" {...fade} className="flex flex-col gap-px border-t border-border p-1.5">
            <Row
              icon={<Desk />}
              disabled={!mine}
              hint={!mine ? t("noDesk") : undefined}
              onClick={() => {
                if (atDesk) {
                  close();
                  openDecorate();
                } else if (mine) {
                  close();
                  goToMyDesk();
                }
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
            <MusicRow open={music} onToggle={() => setMusic((now) => !now)} />
            <MenuExpand open={music}>
              <MusicOptions onDone={close} />
            </MenuExpand>
            <Row
              icon={<UserRound />}
              onClick={() => {
                close();
                if (settingsHref) openSettings(router, settingsHref, "profile");
                else router.push("/account");
              }}
            >
              {tShell("yourProfile")}
            </Row>
          </motion.div>
        )}
        {mode === "desk" && decorating && (
          <motion.div key="desk" {...fade} className="flex min-h-0 flex-1 flex-col border-t border-border pt-2.5">
            <DeskCustomizer desk={decorating} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** A row of the card: what it does, and a chevron; or, when it can't, why not. */
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
