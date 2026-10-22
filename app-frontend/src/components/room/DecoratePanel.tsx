"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, Redo, Trash2, Undo, X } from "@/components/ui/icons";
import { FLOOR } from "@shared/map";
import { DESK_THINGS_MAX, officePieces, thingsOn } from "@shared/office";
import atlas from "@shared/catalog/atlas.json";
import { FLOOR_FILES } from "@/lib/floorWarmup";
import { usePieceChanges } from "@/lib/pieces";
import {
  addThing,
  closeDecorate,
  redo,
  removeThing,
  resetDesk,
  select,
  setChair,
  swapThing,
  undo,
  useDecorate,
} from "@/lib/decorate";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { RoomIconButton, surface } from "./ui";

type Tab = "things" | "chair";
/** Shelves in the order they're offered; "all" first. */
const SHELVES = ["all", "tech", "lamps", "personal", "setups"] as const;
type Shelf = (typeof SHELVES)[number];

const frames = atlas.frames as unknown as Record<
  string,
  [number, number, number, number]
>;

/**
 * A thing as the floor draws it, from the atlas: whole pixels where it fits
 * (twice its size when small), scaled down only when it's too big to fit.
 */
function Thumb({ item, box }: { item: string; box: number }) {
  const frame = frames[item];
  if (!frame) return null;
  const [x, y, w, h] = frame;
  const whole = Math.floor(box / Math.max(w, h));
  const scale = whole >= 1 ? Math.min(whole, 2) : box / Math.max(w, h);
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width: w * scale,
        height: h * scale,
        backgroundImage: `url(${FLOOR_FILES.items})`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
        backgroundSize: `${atlas.width * scale}px ${atlas.height * scale}px`,
        imageRendering: "pixelated",
      }}
    />
  );
}

/** Which shelf a thing sits on: its own, and the floor's own desk setups on theirs. */
const shelfOf = (item: string): Shelf =>
  (FLOOR.things[item]?.shelf as Shelf | undefined) ?? "setups";

/**
 * Decorating your desk (lib/decorate.ts): beside the floor on a wide screen,
 * under it on a phone. Things to put on the desk, by shelf, only those that
 * suit its side; picking one adds it where there's room, or, with something on
 * the desk picked, swaps that. The chairs its side can have. How full the desk
 * is, undo and redo, and putting it all back. The floor (DeskDecorator) moves
 * things; the little bar over the picked one takes it away.
 */
export function DecoratePanel() {
  const t = useTranslations("decorate");
  const { desk, selected, anchor } = useDecorate();
  const isChair = !!desk && selected === FLOOR.desks[desk].chair.key;
  return (
    <>
      <AnimatePresence>
        {desk && <DeskPanel key={desk} desk={desk} />}
      </AnimatePresence>

      {/* The picked thing's bar, over it on the floor. */}
      {desk && anchor && selected && !isChair && (
        <div
          className={cn(
            surface,
            "pointer-events-auto fixed z-[61] flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-full p-1",
          )}
          style={{ left: anchor.x, top: anchor.y - 8 }}
        >
          <RoomIconButton
            size="sm"
            icon={<Trash2 className="size-4" />}
            title={t("remove")}
            onClick={() => removeThing(selected)}
          />
          <RoomIconButton
            size="sm"
            icon={<Check className="size-4" />}
            title={t("deselect")}
            onClick={() => select(null)}
          />
        </div>
      )}
    </>
  );
}

/** The panel for one desk: what it holds lasts while that desk is being decorated. */
function DeskPanel({ desk }: { desk: string }) {
  const t = useTranslations("decorate");
  const reduce = useReducedMotion();
  const { selected, undo: undos, redo: redos } = useDecorate();
  const changes = usePieceChanges();
  const [picked, setTab] = useState<Tab>("things");
  const [shelf, setShelf] = useState<Shelf>("all");
  const [confirming, setConfirming] = useState(false);

  const spec = FLOOR.desks[desk];
  const isChair = selected === spec.chair.key;
  // Picking the chair on the floor shows the chairs.
  const tab: Tab = isChair ? "chair" : picked;
  const choose = (one: Tab) => {
    setTab(one);
    if (one === "things" && isChair) select(null);
  };

  const suits = useMemo(
    () =>
      Object.entries(FLOOR.things)
        .filter(
          ([, thing]) => thing.facing === "any" || thing.facing === spec.side,
        )
        .map(([item]) => item),
    [spec],
  );
  const shelves = SHELVES.filter(
    (one) => one === "all" || suits.some((item) => shelfOf(item) === one),
  );
  const shown = suits.filter(
    (item) => shelf === "all" || shelfOf(item) === shelf,
  );
  const things = thingsOn(desk, changes);
  const full = things.length >= DESK_THINGS_MAX;
  const chair = officePieces(changes).find(
    (piece) => piece.key === spec.chair.key,
  )?.item;
  const swapping =
    !!selected && !isChair && things.some((one) => one.key === selected);

  const pick = (item: string) => {
    if (swapping) swapThing(selected!, item);
    else addThing(item);
  };

  return (
    <motion.aside
      key="panel"
      role="dialog"
      aria-label={t("title")}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className={cn(
        surface,
        "pointer-events-auto absolute z-[60] flex flex-col overflow-hidden",
        // A sheet along the bottom on a phone; a panel at the right beside the floor otherwise.
        "inset-x-0 bottom-0 h-[46%] rounded-t-2xl md:inset-x-auto md:bottom-3 md:end-3 md:top-3 md:h-auto md:w-[332px] md:rounded-2xl",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 className="flex-1 text-[15px] font-semibold">{t("title")}</h2>
        <RoomIconButton
          size="sm"
          icon={<X className="size-4" />}
          title={t("close")}
          onClick={closeDecorate}
        />
      </header>

      <div role="tablist" className="flex gap-1 px-3 pt-3">
        {(["things", "chair"] as const).map((one) => (
          <button
            key={one}
            type="button"
            role="tab"
            aria-selected={tab === one}
            onClick={() => choose(one)}
            className={cn(
              "flex-1 cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              tab === one
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t(one)}
          </button>
        ))}
      </div>

      {tab === "things" ? (
        <>
          <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 pb-1 [scrollbar-width:none]">
            {shelves.map((one) => (
              <button
                key={one}
                type="button"
                onClick={() => setShelf(one)}
                aria-pressed={shelf === one}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                  shelf === one
                    ? "border-foreground bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {t(`shelf.${one}`)}
              </button>
            ))}
          </div>
          <p className="px-4 pt-2 text-[12px] text-muted-foreground">
            {swapping ? t("swapHint") : full ? t("full") : t("hint")}
          </p>
          <div className="grid flex-1 auto-rows-[72px] grid-cols-4 gap-2 overflow-y-auto p-3">
            {shown.map((item) => (
              <button
                key={item}
                type="button"
                title={item.replace(/-/g, " ")}
                disabled={full && !swapping}
                onClick={() => pick(item)}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-background/60 transition-colors hover:border-foreground/40 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Thumb item={item} box={64} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid flex-1 auto-rows-[88px] grid-cols-4 content-start gap-2 overflow-y-auto p-3">
          {FLOOR.chairs[spec.side].map(({ item }) => (
            <button
              key={item}
              type="button"
              title={item.replace(/-/g, " ")}
              aria-pressed={chair === item}
              onClick={() => setChair(item)}
              className={cn(
                "relative flex cursor-pointer items-center justify-center rounded-xl border bg-background/60 transition-colors hover:bg-muted",
                chair === item ? "border-foreground" : "border-border",
              )}
            >
              <Thumb item={item} box={68} />
              {chair === item && (
                <Check className="absolute end-1.5 top-1.5 size-3.5" />
              )}
            </button>
          ))}
        </div>
      )}

      <footer className="flex items-center gap-1.5 border-t border-border px-3 py-2.5">
        {confirming ? (
          <>
            <span className="flex-1 text-[13px]">{t("resetConfirm")}</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] hover:bg-muted"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                resetDesk();
                setConfirming(false);
              }}
              className="cursor-pointer rounded-full bg-destructive px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
            >
              {t("reset")}
            </button>
          </>
        ) : (
          <>
            <span
              className={cn(
                "flex-1 text-[12px] tabular-nums",
                full ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {t("count", { count: things.length, max: DESK_THINGS_MAX })}
            </span>
            <RoomIconButton
              size="sm"
              icon={<Undo className="size-4" />}
              title={t("undo")}
              disabled={!undos}
              onClick={undo}
            />
            <RoomIconButton
              size="sm"
              icon={<Redo className="size-4" />}
              title={t("redo")}
              disabled={!redos}
              onClick={redo}
            />
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="cursor-pointer rounded-full px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("reset")}
            </button>
            <button
              type="button"
              onClick={closeDecorate}
              className="cursor-pointer rounded-full bg-foreground px-4 py-1.5 text-[13px] font-medium text-background hover:bg-foreground/90"
            >
              {t("done")}
            </button>
          </>
        )}
      </footer>
    </motion.aside>
  );
}
