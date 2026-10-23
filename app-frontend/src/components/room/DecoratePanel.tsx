"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Redo, Trash2, Undo } from "@/components/ui/icons";
import { FLOOR } from "@shared/map";
import { DESK_THINGS_MAX, officePieces, thingsOn } from "@shared/office";
import atlas from "@shared/catalog/atlas.json";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { usePieceChanges } from "@/lib/pieces";
import { addThing, closeDecorate, redo, removeThing, resetDesk, select, setChair, startCarry, swapThing, undo, useDecorate } from "@/lib/decorate";
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

/** Whether a thing, at the size its card shows it, needs two columns. */
const isWide = ([left, top, right, bottom]: [number, number, number, number]) => {
  const scale = Math.max(right - left, bottom - top) <= 34 ? 2 : 1;
  return (right - left) * scale > 60;
};

/**
 * Over the thing picked on your desk, while decorating (lib/decorate.ts): take
 * it away, or let go of it. Where it is comes from the floor (DeskDecorator).
 */
export function PickedBar() {
  const t = useTranslations("decorate");
  const { desk, selected, anchor } = useDecorate();
  const reduce = useReducedMotion() ?? false;
  const isChair = !!desk && selected === FLOOR.desks[desk].chair.key;
  return (
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
          <IconAction label={t("remove")} onClick={() => removeThing(selected)}>
            <Trash2 className="size-4" />
          </IconAction>
          <IconAction label={t("deselect")} onClick={() => select(null)}>
            <Check className="size-4" />
          </IconAction>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function IconAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

/**
 * Decorating your desk, inside your card (YouCard): what can go on it, on
 * shelves (only what suits its side), and its chairs. A card clicked goes onto
 * the desk where there's room, or, with something on the desk picked, takes
 * its place; a card dragged out is carried, and put down on the desk where the
 * pointer says. How full it is, undo and redo, putting it back as it came.
 */
export function DeskCustomizer({ desk }: { desk: string }) {
  const t = useTranslations("decorate");
  const { selected, undo: canUndo, redo: canRedo } = useDecorate();
  const changes = usePieceChanges();
  const spec = FLOOR.desks[desk];
  const things = thingsOn(desk, changes);
  const full = things.length >= DESK_THINGS_MAX;
  const picked = selected && selected !== spec.chair.key ? selected : null;
  const [shelf, setShelf] = useState<Shelf>("all");
  const [confirming, setConfirming] = useState(false);
  const chair = officePieces(changes).find((piece) => piece.key === spec.chair.key)?.item ?? spec.chair.item;
  // Pressing the chair on the floor shows the chairs.
  const shownShelf = selected === spec.chair.key ? "chairs" : shelf;

  const suits = Object.keys(FLOOR.things).filter((item) => {
    const facing = FLOOR.things[item].facing;
    return facing === "any" || facing === spec.side;
  });
  const shelves = SHELVES.filter((one) => one === "all" || one === "chairs" || suits.some((item) => shelfOf(item) === one));
  const shown = suits.filter((item) => shownShelf === "all" || shelfOf(item) === shownShelf);
  const hint = shownShelf === "chairs" ? null : picked ? t("swapHint") : full ? t("full") : t("hint");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-0.5 overflow-x-auto px-3 pb-2 [&::-webkit-scrollbar]:hidden">
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
              "h-7 shrink-0 cursor-pointer rounded-full px-2 text-[12.5px] font-medium transition-colors",
              shownShelf === one ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t(`shelf.${one}`)}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">
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
                  wide={isWide(FLOOR.things[item].art)}
                  disabled={full && !picked}
                  onPick={() => (picked ? swapThing(picked, item) : addThing(item))}
                  onCarry={picked || full ? undefined : () => startCarry(item)}
                >
                  <Thumb item={item} art={FLOOR.things[item].art} />
                </Card>
              ))}
        </div>
        {hint && <p className="mt-2.5 px-0.5 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
      </div>

      <div className="flex items-center gap-1 border-t border-border px-2 py-2">
        {confirming ? (
          <>
            <span className="min-w-0 flex-1 truncate px-1.5 text-[12.5px] text-muted-foreground">{t("resetConfirm")}</span>
            <TextAction onClick={() => setConfirming(false)}>{t("cancel")}</TextAction>
            <TextAction
              tone="danger"
              onClick={() => {
                resetDesk();
                setConfirming(false);
              }}
            >
              {t("reset")}
            </TextAction>
          </>
        ) : (
          <>
            <IconAction label={t("undo")} onClick={undo} disabled={!canUndo}>
              <Undo className="size-4" />
            </IconAction>
            <IconAction label={t("redo")} onClick={redo} disabled={!canRedo}>
              <Redo className="size-4" />
            </IconAction>
            <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-[11.5px] font-medium tabular-nums text-muted-foreground">
              {t("count", { count: things.length, max: DESK_THINGS_MAX })}
            </span>
            <TextAction onClick={() => setConfirming(true)} className="ms-auto">
              {t("reset")}
            </TextAction>
            <button
              type="button"
              onClick={closeDecorate}
              className="h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {t("done")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function TextAction({ onClick, tone, className, children }: { onClick: () => void; tone?: "danger"; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 cursor-pointer rounded-full px-3 text-[13px] font-medium transition-colors hover:bg-muted",
        tone === "danger" ? "text-destructive" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * A card: clicked, it's picked; dragged past a few pixels, it's carried (the
 * floor takes it from there, lib/DeskDecorator).
 */
function Card({
  label,
  wide = false,
  selected = false,
  disabled = false,
  onPick,
  onCarry,
  children,
}: {
  label: string;
  /** Two columns, for a thing too wide for one at its own size. */
  wide?: boolean;
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
        wide && "col-span-2",
        "flex h-[4.5rem] cursor-grab touch-none items-center justify-center rounded-xl bg-foreground/[0.05] transition-[background-color,box-shadow,transform,opacity] duration-150 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "bg-foreground/[0.09] shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:-translate-y-0.5 hover:bg-foreground/[0.09]",
      )}
    >
      {children}
    </button>
  );
}
