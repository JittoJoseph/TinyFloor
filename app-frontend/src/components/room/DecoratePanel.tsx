"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Redo, Undo } from "@/components/ui/icons";
import { FLOOR, type DeskSpot } from "@shared/map";
import { fitsIn, officePieces, spotKey, spotsOn } from "@shared/office";
import atlas from "@shared/catalog/atlas.json";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { usePieceChanges } from "@/lib/pieces";
import { closeDecorate, pickPart, redo, resetDesk, setPart, undo, useDecorate } from "@/lib/decorate";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/** What a spot can hold, in groups, in this order. */
const SHELVES = ["tech", "lamps", "personal", "setups"] as const;
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

const frames = atlas.frames as unknown as Record<string, [number, number, number, number]>;

/** Which group a thing is in: its shelf, and the floor's own desk setups in theirs. */
const shelfOf = (item: string) => (FLOOR.things[item]?.shelf as (typeof SHELVES)[number] | undefined) ?? "setups";

/**
 * A thing as the floor draws it, from the atlas, cropped to its pixels: twice
 * its size when it's small (and there's room), its own size otherwise.
 */
function Thumb({ item, max = 34 }: { item: string; max?: number }) {
  const frame = frames[item];
  if (!frame) return null;
  const [x, y, w, h] = frame;
  const [left, top, right, bottom] = FLOOR.things[item]?.art ?? [0, 0, w, h];
  const scale = Math.max(right - left, bottom - top) <= max ? 2 : 1;
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
 * Decorating your desk (lib/decorate.ts), in a card at the floor's right
 * (over its foot on a phone). Its top is the desk in small: its three spots, the chair and the
 * wood, the one picked marked, the same part the floor frames. Under it,
 * what that part can be: nothing or a thing that fits, in groups; the chairs
 * for its side; the woods. Undo and redo, putting it back as it came, Done.
 */
export function DeskPanel() {
  const { desk } = useDecorate();
  const reduce = useReducedMotion() ?? false;
  return (
    <AnimatePresence>
      {desk && (
        <motion.div
          key={desk}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className={cn(
            "absolute z-[55] flex flex-col overflow-hidden rounded-[18px] border border-border bg-popover text-foreground shadow-float [--face-ring:var(--ui-popover)]",
            // A phone: over the floor's foot, the dock included.
            "inset-x-2 bottom-2 h-[48%]",
            // Wider: at the right, halfway down.
            "sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-1/2 sm:h-auto sm:max-h-[min(38rem,calc(100%-8rem))] sm:w-80 sm:-translate-y-1/2",
          )}
          style={{ transformOrigin: "right center" }}
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
      <div className="flex h-12 shrink-0 items-center gap-1 ps-4 pe-2">
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{t("title")}</span>
        <IconAction label={t("undo")} onClick={undo} disabled={!canUndo}>
          <Undo className="size-4" />
        </IconAction>
        <IconAction label={t("redo")} onClick={redo} disabled={!canRedo}>
          <Redo className="size-4" />
        </IconAction>
        <button
          type="button"
          onClick={closeDecorate}
          className="ms-1 h-8 cursor-pointer rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
        >
          {t("done")}
        </button>
      </div>

      {/* The desk in small: its spots as they stand along it, then its chair and its wood. */}
      <div className="flex shrink-0 gap-1.5 px-3 pb-3" role="group" aria-label={t("title")}>
        <div className="flex min-w-0 flex-1 gap-1 rounded-[12px] bg-foreground/[0.05] p-1">
          {spec.spots.map((one, n) => {
            const key = spotKey(desk, one.id);
            const item = now[key];
            return (
              <PartButton key={key} label={spotName(n)} picked={part === key} onPick={() => pickPart(key)} grow={one.x[1] - one.x[0]}>
                {item ? <Thumb item={item} max={0} /> : <span aria-hidden className="size-1.5 rounded-full bg-foreground/25" />}
              </PartButton>
            );
          })}
        </div>
        <div className="flex gap-1 rounded-[12px] bg-foreground/[0.05] p-1">
          <PartButton label={t("part.chair")} picked={part === spec.chair.key} onPick={() => pickPart(spec.chair.key)} width="w-11">
            <Thumb item={chair} max={0} />
          </PartButton>
          {spec.body && wood && (
            <PartButton label={t("part.wood")} picked={part === spec.body.key} onPick={() => pickPart(spec.body!.key)} width="w-11">
              <span aria-hidden className="block size-6 rounded-[7px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)]" style={{ background: WOODS[woodOf(wood)] }} />
            </PartButton>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border px-3 pb-3 pt-3">
        {spot ? (
          <SpotOptions desk={desk} spot={spot} name={spotName(spec.spots.indexOf(spot))} item={now[spotKey(desk, spot.id)]} />
        ) : part === spec.chair.key ? (
          <Options title={t("part.chair")} lead>
            {FLOOR.chairs[spec.side].map(({ item }) => (
              <Card key={item} label={item} picked={chair === item} onPick={() => setPart(spec.chair.key, item)}>
                <Thumb item={item} />
              </Card>
            ))}
          </Options>
        ) : spec.body && part === spec.body.key ? (
          <Options title={t("part.wood")} lead>
            {spec.body.options.map((item) => (
              <Card key={item} label={t(`wood.${woodOf(item)}`)} picked={wood === item} onPick={() => setPart(spec.body!.key, item)} caption>
                <span aria-hidden className="block size-8 rounded-[9px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.14)]" style={{ background: WOODS[woodOf(item)] }} />
              </Card>
            ))}
          </Options>
        ) : null}
      </div>

      <div className="flex h-12 shrink-0 items-center gap-1 border-t border-border px-2">
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
          <TextAction onClick={() => setConfirming(true)} className="ms-auto">
            {t("reset")}
          </TextAction>
        )}
      </div>
    </>
  );
}

/** What a spot can hold: nothing, or a thing that fits it, grouped. */
function SpotOptions({ desk, spot, name, item }: { desk: string; spot: DeskSpot; name: string; item: string | null }) {
  const t = useTranslations("decorate");
  const key = spotKey(desk, spot.id);
  const fits = Object.keys(FLOOR.things).filter((one) => fitsIn(desk, spot, one));
  return (
    <div className="flex flex-col gap-4">
      <div className="-mb-1.5 flex h-8 items-center gap-2 px-0.5">
        <h3 className="min-w-0 flex-1 truncate text-[13px] font-semibold">{name}</h3>
        {item && <TextAction onClick={() => setPart(key, null)}>{t("remove")}</TextAction>}
      </div>
      {SHELVES.map((shelf) => {
        const things = fits.filter((one) => shelfOf(one) === shelf);
        if (!things.length) return null;
        return (
          <Options key={shelf} title={t(`shelf.${shelf}`)}>
            {things.map((one) => (
              <Card key={one} label={one} picked={item === one} onPick={() => setPart(key, one)} wide={wideOf(one)}>
                <Thumb item={one} />
              </Card>
            ))}
          </Options>
        );
      })}
    </div>
  );
}

/** Whether a thing, at the size its card shows it, needs two columns. */
const wideOf = (item: string) => {
  const [left, top, right, bottom] = FLOOR.things[item]?.art ?? [0, 0, 32, 32];
  const scale = Math.max(right - left, bottom - top) <= 34 ? 2 : 1;
  return (right - left) * scale > 60;
};

/** A group of options under its title: the part's own name (lead), or a kind of thing in it. */
function Options({ title, lead = false, children }: { title: string; lead?: boolean; children: ReactNode }) {
  return (
    <section>
      <h3 className={cn("mb-1.5 px-0.5", lead ? "flex h-8 items-center text-[13px] font-semibold" : "text-[12px] font-medium text-muted-foreground")}>{title}</h3>
      <div className="grid grid-flow-row-dense grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-1.5">{children}</div>
    </section>
  );
}

/** One of the desk's parts, in the desk in small: as wide as it is on the desk, or a set width. */
function PartButton({ label, picked, onPick, grow, width, children }: { label: string; picked: boolean; onPick: () => void; grow?: number; width?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={picked}
      onClick={onPick}
      style={grow ? { flexGrow: grow, flexBasis: 0 } : undefined}
      className={cn(
        "flex h-14 min-w-0 cursor-pointer items-center justify-center overflow-hidden rounded-[9px] transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        width,
        picked ? "bg-card shadow-[inset_0_0_0_1.5px_var(--ui-foreground)]" : "hover:bg-foreground/[0.06]",
      )}
    >
      {children}
    </button>
  );
}

function Card({ label, picked, onPick, wide = false, caption = false, children }: { label: string; picked: boolean; onPick: () => void; wide?: boolean; caption?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={picked}
      onClick={onPick}
      className={cn(
        wide && "col-span-2",
        "flex h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl bg-foreground/[0.05] transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        picked ? "bg-foreground/[0.08] shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:bg-foreground/[0.09]",
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
