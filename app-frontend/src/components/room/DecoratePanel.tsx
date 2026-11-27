"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Dice, Redo, Undo } from "web-shared/components/ui/icons";
import { FLOOR, type DeskSpot } from "shared-protocol/map";
import { fitsIn, officePieces, spotKey, spotsOn } from "shared-protocol/office";
import { usePieceChanges } from "@/lib/pieces";
import { closeDecorate, pickPart, redo, resetDesk, setPart, stopTryingPart, surpriseDesk, tryPart, undo, useDecorate } from "@/lib/decorate";
import { EASE_OUT } from "@/lib/ease";
import { artOf, PieceThumb as Thumb } from "./PieceThumb";
import { cn } from "web-shared/lib/utils";

/** The kinds of things a spot holds, in the order they're shown. */
const SHELVES = ["middle", "lamps", "personal", "tech", "setups"] as const;
type Shelf = (typeof SHELVES)[number];
/** A desk's woods as swatches: the colour of each one's top (art.js DESK_WOODS). */
const WOODS = {
  maple: "#d0be9c",
  oak: "#c4a882",
  beech: "#d6c3a0",
  walnut: "#966e52",
  white: "#e2dcea",
  graphite: "#767a88",
};
const woodOf = (item: string) => (item.match(/^desks-single-([a-z]+)-/)?.[1] ?? "maple") as keyof typeof WOODS;
/** A desk's three spots, by where they are on it. */
const SPOT_NAMES = ["left", "middle", "right"] as const;

/** Which group a thing is in: its shelf, and the floor's own desk setups in theirs. */
const shelfOf = (item: string) => (FLOOR.things[item]?.shelf as Shelf | undefined) ?? "setups";

/** A thing's name for a screen reader, from its key: "ours-lamp-coral" says "Lamp coral". */
const nameOf = (item: string) => {
  const words = item.replace(/^ours-/, "").replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * Decorating your desk (lib/decorate.ts), in a card at the floor's right (over
 * its foot on a phone) while the floor brings the desk up close. At its top,
 * the desk in small, each part named: its three spots, its chair, its wood;
 * the one picked is the one the floor frames. Under it, everything that part
 * can be, its groups as tabs with how many each holds, so nothing waits below
 * a scroll to be found; the pointer resting on one tries it on the desk.
 * Surprise me makes the whole desk up at once; undo takes any of it back.
 */
export function DeskPanel() {
  const { desk } = useDecorate();
  const reduce = useReducedMotion() ?? false;
  return (
    <AnimatePresence>
      {desk && (
        <motion.div
          key={desk}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          className={cn(
            "absolute z-[55] flex flex-col overflow-hidden rounded-[20px] border border-border bg-popover text-foreground shadow-float [--face-ring:var(--ui-popover)]",
            // A phone: over the floor's foot, the dock included.
            "inset-x-2 bottom-2 h-[56%]",
            // Wider: at the right, halfway down, one height whatever's in it, so nothing under the pointer moves as you go between parts and tabs.
            "sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:h-[min(33rem,calc(100%-2rem))] sm:w-[376px] sm:-translate-y-1/2",
          )}
        >
          <Panel desk={desk} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Panel({ desk }: { desk: string }) {
  const t = useTranslations("decorate");
  const { part, undo: canUndo, redo: canRedo } = useDecorate();
  const changes = usePieceChanges();
  const spec = FLOOR.desks[desk];
  const [confirming, setConfirming] = useState(false);
  const now = spotsOn(desk, changes);
  const drawn = officePieces(changes);
  const chair = drawn.find((piece) => piece.key === spec.chair.key)?.item ?? spec.chair.item;
  const wood = spec.body ? (drawn.find((piece) => piece.key === spec.body!.key)?.item ?? spec.body.item) : null;
  const spot = spec.spots.find((one) => spotKey(desk, one.id) === part);
  const spotName = (n: number) => (SPOT_NAMES[n] ? t(`part.${SPOT_NAMES[n]}`) : String(n + 1));

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-1 ps-4 pe-2.5">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{t("title")}</span>
        <IconAction label={t("undo")} onClick={undo} disabled={!canUndo}>
          <Undo className="size-4" />
        </IconAction>
        <IconAction label={t("redo")} onClick={redo} disabled={!canRedo}>
          <Redo className="size-4" />
        </IconAction>
        <button
          type="button"
          onClick={closeDecorate}
          className="ms-1.5 h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
        >
          {t("done")}
        </button>
      </div>

      {/* The desk in small, each part named: its spots as they stand along it, then its chair and its wood. */}
      <div className="flex shrink-0 gap-1.5 px-3 pb-3" role="tablist" aria-label={t("title")}>
        <div className="flex min-w-0 flex-1 gap-1 rounded-[14px] bg-foreground/[0.05] p-1">
          {spec.spots.map((one, n) => {
            const key = spotKey(desk, one.id);
            const item = now[key];
            return (
              <PartButton key={key} label={spotName(n)} picked={part === key} onPick={() => pickPart(key)} grow={one.x[1] - one.x[0]}>
                {/* The desk as it is: everything at its own size, so a notebook is as small beside a screen as it is on the desk. */}
                {item ? <Thumb item={item} box={[52, 34]} at={1} /> : <EmptyMark />}
              </PartButton>
            );
          })}
        </div>
        <div className="flex gap-1 rounded-[14px] bg-foreground/[0.05] p-1">
          <PartButton label={t("part.chair")} picked={part === spec.chair.key} onPick={() => pickPart(spec.chair.key)} width="w-[52px]">
            <Thumb item={chair} box={[34, 34]} at={1} />
          </PartButton>
          {spec.body && wood && (
            <PartButton label={t("part.wood")} picked={part === spec.body.key} onPick={() => pickPart(spec.body!.key)} width="w-[52px]">
              <span aria-hidden className="block size-6 rounded-[7px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)]" style={{ background: WOODS[woodOf(wood)] }} />
            </PartButton>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-3 pb-3 pt-3">
        {spot ? (
          <SpotOptions key={part} desk={desk} spot={spot} item={now[spotKey(desk, spot.id)]} />
        ) : part === spec.chair.key ? (
          <Grid>
            {FLOOR.chairs[spec.side].map(({ item }) => (
              <Card key={item} label={nameOf(item)} picked={chair === item} onPick={() => setPart(spec.chair.key, item)} onTry={() => tryPart(spec.chair.key, item)}>
                <Thumb item={item} box={[52, 52]} />
              </Card>
            ))}
          </Grid>
        ) : spec.body && part === spec.body.key ? (
          <Grid>
            {spec.body.options.map((item) => (
              <Card key={item} label={t(`wood.${woodOf(item)}`)} picked={wood === item} onPick={() => setPart(spec.body!.key, item)} onTry={() => tryPart(spec.body!.key, item)} caption>
                <span aria-hidden className="block size-8 rounded-[9px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)]" style={{ background: WOODS[woodOf(item)] }} />
              </Card>
            ))}
          </Grid>
        ) : null}
      </div>

      <div className="flex h-[52px] shrink-0 items-center gap-1 border-t border-border px-2">
        {confirming ? (
          <>
            <span className="min-w-0 flex-1 truncate px-2 text-[12.5px] text-muted-foreground">{t("resetConfirm")}</span>
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
            <button
              type="button"
              onClick={surpriseDesk}
              className="group inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-foreground/[0.06] ps-2.5 pe-3.5 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.1]"
            >
              <Dice className="size-4 transition-transform duration-300 group-hover:rotate-[24deg] group-active:rotate-[90deg]" />
              {t("surprise")}
            </button>
            <TextAction onClick={() => setConfirming(true)} className="ms-auto">
              {t("reset")}
            </TextAction>
          </>
        )}
      </div>
    </>
  );
}

/**
 * What a spot can hold, all at once: nothing (first, always there), then
 * every thing that suits it, kinds kept together. Each spot has its own (the
 * middle what you work at, the sides lamps, plants and small things), so there's
 * no choosing a group first.
 */
function SpotOptions({ desk, spot, item }: { desk: string; spot: DeskSpot; item: string | null }) {
  const t = useTranslations("decorate");
  const key = spotKey(desk, spot.id);
  const kind = (one: string) => SHELVES.indexOf(shelfOf(one));
  const things = Object.keys(FLOOR.things)
    .filter((one) => fitsIn(desk, spot, one))
    .sort((a, b) => kind(a) - kind(b));

  return (
    <Grid>
      <Card label={t("nothing")} picked={!item} onPick={() => setPart(key, null)} onTry={() => tryPart(key, null)} caption>
        <EmptyMark large />
      </Card>
      {things.map((one) => (
        <Card key={one} label={nameOf(one)} picked={item === one} onPick={() => setPart(key, one)} onTry={() => tryPart(key, one)} wide={wideOf(one)}>
          <Thumb item={one} box={wideOf(one) ? [112, 44] : [48, 44]} />
        </Card>
      ))}
    </Grid>
  );
}

/** Whether a thing, shown at a crisp scale, needs two columns. */
const wideOf = (item: string) => {
  const { width, height } = artOf(item);
  // Long and low (a pair of screens), or wider than a tile holds at its own size (a typewriter).
  return width > 48 || (width > 40 && width > height * 1.6);
};

/** An empty spot: a dashed outline with a plus, the way the floor marks it. */
function EmptyMark({ large = false }: { large?: boolean }) {
  return (
    <span aria-hidden className={cn("flex items-center justify-center rounded-[8px] border border-dashed border-foreground/30 text-foreground/45", large ? "size-8" : "size-7")}>
      <span className="text-[15px] leading-none">+</span>
    </span>
  );
}

function Grid({ children }: { children: ReactNode }) {
  // Six across on a phone, so every group's things fit the sheet without a scroll to find them; five beside the floor.
  return <div className="grid grid-flow-row-dense grid-cols-6 gap-1.5 sm:grid-cols-5">{children}</div>;
}

/** One of the desk's parts, in the desk in small, its name under it: as wide as it is on the desk, or a set width. */
function PartButton({ label, picked, onPick, grow, width, children }: { label: string; picked: boolean; onPick: () => void; grow?: number; width?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={picked}
      onClick={onPick}
      style={grow ? { flexGrow: grow, flexBasis: 0 } : undefined}
      className={cn(
        "flex h-[72px] min-w-0 cursor-pointer flex-col items-center justify-end gap-1.5 overflow-hidden rounded-[10px] pb-1.5 transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        width,
        picked ? "bg-card shadow-[inset_0_0_0_1.5px_var(--ui-foreground),0_1px_2px_rgb(0_0_0/0.1)]" : "hover:bg-foreground/[0.06]",
      )}
    >
      <span className="flex min-h-0 flex-1 items-end justify-center">{children}</span>
      <span className={cn("max-w-full truncate px-1 text-[11px] leading-none", picked ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
    </button>
  );
}

/** A choice: pressed, it's what the part becomes; pointed at (or reached by keyboard), it's tried on the desk first. */
function Card({
  label,
  picked,
  onPick,
  onTry,
  wide = false,
  caption = false,
  children,
}: {
  label: string;
  picked: boolean;
  onPick: () => void;
  onTry: () => void;
  wide?: boolean;
  caption?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={picked}
      onClick={onPick}
      onPointerEnter={(event) => event.pointerType === "mouse" && onTry()}
      onPointerLeave={stopTryingPart}
      onFocus={onTry}
      onBlur={stopTryingPart}
      className={cn(
        wide && "col-span-2",
        "flex h-[3.25rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] sm:h-16 bg-foreground/[0.04] transition-[background-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]",
        picked ? "bg-foreground/[0.07] shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:bg-foreground/[0.09]",
      )}
    >
      {children}
      {caption && <span className="max-w-full truncate px-1 text-[11px] leading-none text-muted-foreground">{label}</span>}
    </button>
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
