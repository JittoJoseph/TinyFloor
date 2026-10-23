"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Palette, Redo, Trash2, Undo } from "@/components/ui/icons";
import { FLOOR } from "@shared/map";
import { DESK_THINGS_MAX, officePieces, thingsOn } from "@shared/office";
import atlas from "@shared/catalog/atlas.json";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { usePieceChanges } from "@/lib/pieces";
import {
  addThing,
  closeDecorate,
  openDecorate,
  redo,
  removeThing,
  resetDesk,
  select,
  setChair,
  startCarry,
  swapThing,
  undo,
  useDecorate,
} from "@/lib/decorate";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** Shelves in the order they're offered: everything, then by kind, then the chairs. */
const SHELVES = ["all", "tech", "lamps", "personal", "setups", "chairs"] as const;
type Shelf = (typeof SHELVES)[number];
/** How far a card is dragged before it's carried rather than clicked. */
const CARRY_AFTER = 6;

const frames = atlas.frames as unknown as Record<string, [number, number, number, number]>;

/** Which shelf a thing sits on: its own, and the floor's own desk setups on theirs. */
const shelfOf = (item: string): Shelf => (FLOOR.things[item]?.shelf as Shelf | undefined) ?? "setups";

/**
 * A thing as the floor draws it, from the atlas, cropped to its pixels: twice
 * its size when it's small, its own size when it's not, never in between.
 */
function Thumb({ item, art }: { item: string; art?: [number, number, number, number] }) {
  const frame = frames[item];
  if (!frame) return null;
  const [x, y, w, h] = frame;
  const [left, top, right, bottom] = art ?? [0, 0, w, h];
  const scale = Math.max(right - left, bottom - top) <= 34 ? 2 : 1;
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width: (right - left) * scale,
        height: (bottom - top) * scale,
        backgroundImage: `url(${FLOOR_FILES.items})`,
        backgroundPosition: `-${(x + left) * scale}px -${(y + top) * scale}px`,
        backgroundSize: `${atlas.width * scale}px ${atlas.height * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

/**
 * Decorating your desk (lib/decorate.ts), over the floor: the chip that opens
 * it from your desk, the tray it brings up, and the little bar over whatever
 * is picked on the desk. The floor (DeskDecorator) moves things and takes what
 * the tray carries in.
 */
export function DecoratePanel() {
  const t = useTranslations("decorate");
  const { desk, selected, anchor, hint } = useDecorate();
  const reduce = useReducedMotion() ?? false;
  const isChair = !!desk && selected === FLOOR.desks[desk].chair.key;
  return (
    <>
      {/* Pointing at your desk: the way in, over it. */}
      <AnimatePresence>
        {!desk && hint && (
          <motion.button
            key="hint"
            type="button"
            onClick={openDecorate}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: hint.below ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
            className={cn(
              "fixed z-[55] flex h-8 -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full bg-[#1f2937]/90 ps-2.5 pe-3 text-[12.5px] font-medium text-white shadow-float backdrop-blur-sm hover:bg-[#1f2937]",
              !hint.below && "-translate-y-full",
            )}
            style={{ left: hint.x, top: hint.y }}
          >
            <Palette className="size-3.5" />
            {t("open")}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Over the picked thing: take it away, or let go of it. */}
      <AnimatePresence>
        {desk && selected && anchor && !isChair && (
          <motion.div
            key={selected}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            transition={{ duration: 0.14, ease: EASE_OUT }}
            className="fixed z-[61] flex -translate-x-1/2 -translate-y-[calc(100%+8px)] items-center gap-0.5 rounded-full border border-border bg-card/95 p-0.5 shadow-float backdrop-blur-md"
            style={{ left: anchor.x, top: anchor.y }}
          >
            <BarButton label={t("remove")} onClick={() => removeThing(selected)}>
              <Trash2 className="size-4" />
            </BarButton>
            <BarButton label={t("deselect")} onClick={() => select(null)}>
              <Check className="size-4" />
            </BarButton>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {desk && (
          <motion.div
            key="tray"
            initial={reduce ? { opacity: 0 } : { y: "110%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "110%", transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:px-4 md:pb-4"
          >
            <Tray key={desk} desk={desk} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function BarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
    >
      {children}
    </button>
  );
}

/**
 * The tray: what can go on the desk, on shelves (only what suits its side),
 * and its chairs. A card clicked goes onto the desk where there's room, or,
 * with something on the desk picked, takes its place; a card dragged out is
 * carried, and dropped onto the desk where the pointer says. How full the
 * desk is, undo and redo, putting it back as it came, and Done.
 */
function Tray({ desk }: { desk: string }) {
  const t = useTranslations("decorate");
  const { selected, undo: canUndo, redo: canRedo } = useDecorate();
  const changes = usePieceChanges();
  const spec = FLOOR.desks[desk];
  const things = thingsOn(desk, changes);
  const full = things.length >= DESK_THINGS_MAX;
  const picked = selected && selected !== spec.chair.key ? selected : null;
  const [shelf, setShelf] = useState<Shelf>(selected === spec.chair.key ? "chairs" : "all");
  const [confirming, setConfirming] = useState(false);
  const chair = officePieces(changes).find((piece) => piece.key === spec.chair.key)?.item ?? spec.chair.item;
  const shownShelf = selected === spec.chair.key ? "chairs" : shelf;

  const suits = Object.keys(FLOOR.things).filter((item) => {
    const facing = FLOOR.things[item].facing;
    return facing === "any" || facing === spec.side;
  });
  const shelves = SHELVES.filter((one) => one === "all" || one === "chairs" || suits.some((item) => shelfOf(item) === one));
  const shown = suits.filter((item) => shownShelf === "all" || shelfOf(item) === shownShelf);

  return (
    <div className="pointer-events-auto w-full max-w-[56rem] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-float backdrop-blur-md">
      <div className="flex items-center gap-2 px-3 pt-2.5 md:px-4">
        <p className="min-w-0 truncate text-[14px] font-semibold text-foreground">{t("title")}</p>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-muted-foreground">
          {t("count", { count: things.length, max: DESK_THINGS_MAX })}
        </span>
        <div className="ms-auto flex items-center gap-0.5">
          {confirming ? (
            <>
              <span className="me-1 hidden text-[12.5px] text-muted-foreground sm:inline">{t("resetConfirm")}</span>
              <TextButton onClick={() => setConfirming(false)}>{t("cancel")}</TextButton>
              <TextButton
                tone="danger"
                onClick={() => {
                  resetDesk();
                  setConfirming(false);
                }}
              >
                {t("reset")}
              </TextButton>
            </>
          ) : (
            <>
              <BarButton label={t("undo")} onClick={undo}>
                <Undo className={cn("size-4", !canUndo && "opacity-35")} />
              </BarButton>
              <BarButton label={t("redo")} onClick={redo}>
                <Redo className={cn("size-4", !canRedo && "opacity-35")} />
              </BarButton>
              <TextButton onClick={() => setConfirming(true)}>{t("reset")}</TextButton>
              <button
                type="button"
                onClick={closeDecorate}
                className="ms-1 h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
              >
                {t("done")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto px-3 pt-2 md:px-4 [&::-webkit-scrollbar]:hidden">
        {shelves.map((one) => (
          <button
            key={one}
            type="button"
            aria-pressed={shownShelf === one}
            onClick={() => {
              setShelf(one);
              if (one !== "chairs" && selected === spec.chair.key) select(null);
            }}
            className={cn(
              "h-7 shrink-0 cursor-pointer rounded-full px-3 text-[12.5px] font-medium transition-colors",
              shownShelf === one ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t(`shelf.${one}`)}
          </button>
        ))}
        <p className="ms-auto hidden shrink-0 self-center ps-3 text-[12px] text-muted-foreground lg:block">
          {shownShelf === "chairs" ? "" : picked ? t("swapHint") : full ? t("full") : t("hint")}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-3 pb-3 pt-2 md:px-4 [&::-webkit-scrollbar]:hidden">
        {shownShelf === "chairs"
          ? FLOOR.chairs[spec.side].map(({ item }) => (
              <Card key={item} label={item} selected={chair === item} onPick={() => setChair(item)}>
                <Thumb item={item} />
              </Card>
            ))
          : shown.map((item) => (
              <Card
                key={item}
                label={item}
                disabled={full && !picked}
                onPick={() => (picked ? swapThing(picked, item) : addThing(item))}
                onCarry={picked || full ? undefined : () => startCarry(item)}
              >
                <Thumb item={item} art={FLOOR.things[item].art} />
              </Card>
            ))}
      </div>
    </div>
  );
}

function TextButton({ onClick, tone, children }: { onClick: () => void; tone?: "danger"; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors hover:bg-muted",
        tone === "danger" ? "text-destructive" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * A card on the tray: clicked, it's picked; dragged past a few pixels, it's
 * carried (the floor takes it from there, lib/DeskDecorator).
 */
function Card({
  label,
  selected = false,
  disabled = false,
  onPick,
  onCarry,
  children,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPick: () => void;
  onCarry?: () => void;
  children: ReactNode;
}) {
  const pressed = useRef<{ x: number; y: number; carried: boolean } | null>(null);
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      disabled={disabled}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        pressed.current = { x: event.clientX, y: event.clientY, carried: false };
      }}
      onPointerMove={(event) => {
        const press = pressed.current;
        if (!press || press.carried || !onCarry) return;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < CARRY_AFTER) return;
        press.carried = true;
        // The floor follows the pointer from here, wherever it goes.
        (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
        onCarry();
      }}
      onPointerUp={() => {
        const press = pressed.current;
        pressed.current = null;
        if (press && !press.carried) onPick();
      }}
      onPointerCancel={() => (pressed.current = null)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPick();
        }
      }}
      className={cn(
        "flex h-[4.75rem] min-w-[4.75rem] shrink-0 cursor-grab touch-pan-x items-end justify-center rounded-xl bg-muted/60 px-2.5 pb-3 transition-[background-color,box-shadow,transform,opacity] duration-150 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "bg-muted shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:-translate-y-0.5 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
