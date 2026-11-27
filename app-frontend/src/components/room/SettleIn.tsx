"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { X } from "web-shared/components/ui/icons";
import { FLOOR } from "shared-protocol/map";
import { deskOfSeat } from "shared-protocol/office";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { deskOf, useDesks } from "@/lib/desks";
import { usePieceChanges } from "@/lib/pieces";
import { calendarAvailable, useCalendar } from "@/lib/calendar";
import { FLOOR_ARRIVED_EVENT, floorArrivedAt } from "@/lib/floor";
import { busyNow } from "@/lib/attention";
import { characterCreatorShown } from "@/components/character/creatorOpen";
import { cheer, getFloorSpot, isDone, isSkipped, settleAs, skip, startSettling, stillSettling, useSettle, type SettleStep } from "@/lib/settle";
import { touchFirst } from "@/lib/touch";
import { characterOrDefault, PRESETS } from "shared-protocol/character";
import { CharacterBust } from "@/components/character/CharacterBust";
import { PieceThumb } from "./PieceThumb";

/** A moment after arriving before the first pointer: the floor first, then what to do on it. */
const FIRST_AFTER_MS = 2500;
/** And between one thing done and the next pointer: a beat to enjoy it. */
const BETWEEN_MS = 1600;
/** How long the pointer stays in words; after that it rests as a dot on what it points at, still there, no longer talking. */
const SPEAKS_FOR_MS = 14_000;
/** How long the pixels popping off something just done take to fly and fade. */
const BURST_MS = 700;
/** How often what's on the page is looked at again for where to point. */
const LOOK_EVERY_MS = 400;
/** Only someone who joined lately is settling in; a member of months isn't. */
const NEW_FOR = 14 * 24 * 60 * 60_000;
/** An office this size or smaller still has a team to bring in. */
const SMALL_TEAM = 2;

type Words =
  | "move"
  | "moveTouch"
  | "look"
  | "desk"
  | "claim"
  | "decorate"
  | "hello"
  | "invite"
  | "calendar";

interface Step {
  step: SettleStep;
  /** Whether it makes sense here and now, and isn't done already. */
  open: boolean;
  /** Where it's done, the nearest first: the first of these on the page is pointed at, with its words. */
  at: Array<[selector: string, words: Words]>;
}

interface Cue {
  step: SettleStep;
  target: HTMLElement;
  words: Words;
}

/** On the page and showing: laid out, not hidden, not folded away to nothing. */
function showing(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement) || element.closest("[hidden]")) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  if (rect.bottom < 0 || rect.right < 0 || rect.top > window.innerHeight || rect.left > window.innerWidth) return false;
  const style = getComputedStyle(element);
  return style.visibility !== "hidden" && Number(style.opacity) > 0.2;
}

/**
 * Settling in (lib/settle.ts), on the floor: one small pointer at a time, at
 * the thing to try next (walking, your look, a desk of your own, making it
 * yours, saying hi, your team, your calendar), on the very button or chip that
 * does it, each a few words. It follows you in as you go: the dock's key,
 * then the row inside, then the chip on the desk. Done any way at all, it's
 * done; waved away, it's left alone; ignored a while, it rests as a dot. It
 * waits while you're busy (a dialog, a call, the desk being decorated), and
 * only someone new here sees it.
 */
export function SettleIn({ demo }: { demo: boolean }) {
  const t = useTranslations("settle");
  const reduce = useReducedMotion() ?? false;
  const { user } = useAuth();
  const office = useOfficeMaybe();
  const place = demo ? "demo" : (office?.office.id ?? null);
  const { desks, canClaim } = useDesks();
  const changes = usePieceChanges();
  const calendar = useCalendar();
  useSettle();

  useEffect(() => settleAs(user?.id ?? null, place ?? "demo"), [user?.id, place]);

  // Arrived, and a moment since: from then on, pointers. When you arrived also says whether you're new here.
  const [ready, setReady] = useState(false);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const arrive = () => {
      setArrivedAt(Date.now());
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReady(true), FIRST_AFTER_MS);
    };
    window.addEventListener(FLOOR_ARRIVED_EVENT, arrive);
    // Here after the floor already arrived (put back on the page): as if it had just now, give or take the moment already waited.
    const already = floorArrivedAt();
    if (already !== null) {
      timer = window.setTimeout(() => {
        setArrivedAt(already);
        setReady(true);
      }, Math.max(0, FIRST_AFTER_MS - (Date.now() - already)));
    }
    return () => {
      window.removeEventListener(FLOOR_ARRIVED_EVENT, arrive);
      window.clearTimeout(timer);
    };
  }, []);

  const me = office?.overview.members.find((member) => member.id === user?.id);
  // The demo office is new to everyone in it; an office, to whoever joined it lately (its owner, when they've just made it).
  const newHere = !!user && arrivedAt !== null && (demo || (!!me && arrivedAt - me.joinedAt < NEW_FOR));
  const mine = user ? deskOf(desks, user.id) : undefined;
  const myDeskKey = mine ? deskOfSeat(mine.seat) : null;
  const decorated =
    !!myDeskKey && Object.keys(changes).some((key) => key.startsWith(`${myDeskKey}/`) || key === FLOOR.desks[myDeskKey]?.body?.key);
  const team = office?.overview.members.length ?? 0;
  const wantsCalendar = !demo && !user?.guest && calendarAvailable && calendar.status === "off";

  const steps: Step[] = [
    {
      step: "move",
      open: !isDone("move"),
      // The floor's spot to walk to (WalkSpot); your own tag where no spot could be found.
      at: [
        ["[data-settle=walk]", touchFirst() ? "moveTouch" : "move"],
        ["[data-settle=me]", touchFirst() ? "moveTouch" : "move"],
      ],
    },
    // Someone beside you is a moment that passes: it comes before the rest while it lasts.
    { step: "hello", open: !isDone("hello"), at: [["[data-settle=wave]", "hello"]] },
    // So is sitting at a free desk (found from the dock, or just sat at): its Claim chip, while it's there.
    { step: "desk", open: canClaim && !mine && !isDone("desk"), at: [["[data-settle=claim]", "claim"]] },
    {
      step: "look",
      open: !isDone("look"),
      at: [
        ["[data-settle=look]", "look"],
        ["[data-settle=you]", "look"],
      ],
    },
    {
      step: "desk",
      open: canClaim && !mine && !isDone("desk"),
      at: [
        ["[data-settle=claim]", "claim"],
        ["[data-settle=desk]", "desk"],
        ["[data-settle=you]", "desk"],
      ],
    },
    {
      step: "decorate",
      open: !!mine && !decorated && !isDone("decorate"),
      at: [
        ["[data-settle=decorate]", "decorate"],
        ["[data-settle=you]", "decorate"],
      ],
    },
    { step: "invite", open: !demo && team <= SMALL_TEAM && !isDone("invite"), at: [["[data-settle=invite]", "invite"]] },
    { step: "calendar", open: wantsCalendar && !isDone("calendar"), at: [["[data-settle=rail-calendar]", "calendar"]] },
  ];
  const active = ready && newHere && stillSettling();

  // Where to point now: the first step still open whose place is on the page, at its nearest place there.
  const [found, setCue] = useState<Cue | null>(null);
  const cue = active ? found : null;
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });
  const restUntil = useRef(0);
  const lastDone = useRef<SettleStep | null>(null);
  useEffect(() => {
    if (!active) return;
    const look = () => {
      if (Date.now() < restUntil.current || busyNow()) return setCue((now) => (now ? null : now));
      for (const one of stepsRef.current) {
        if (!one.open || isSkipped(one.step)) continue;
        for (const [selector, words] of one.at) {
          const target = [...document.querySelectorAll(selector)].find(showing);
          if (!target) continue;
          lastRect.current = target.getBoundingClientRect();
          return setCue((now) => (now && now.step === one.step && now.target === target && now.words === words ? now : { step: one.step, target, words }));
        }
      }
      setCue((now) => (now ? null : now));
    };
    const first = window.setTimeout(look, 0);
    const timer = window.setInterval(look, LOOK_EVERY_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [active]);

  // A step done while it was pointed at: the floor answers (your character bobs, a few pixels pop off the
  // thing you used), then a beat before the next.
  const [burst, setBurst] = useState<{ target: HTMLElement; rect: DOMRect; key: number } | null>(null);
  // Where the thing pointed at last was: it often goes the moment it's used (a chip once claimed, a row as the dock folds).
  const lastRect = useRef<DOMRect | null>(null);
  const shownStep = useRef<Cue | null>(null);
  useEffect(() => {
    const before = shownStep.current;
    shownStep.current = cue;
    if (!before || (cue && cue.step === before.step)) return;
    if (!isDone(before.step) || lastDone.current === before.step) return;
    lastDone.current = before.step;
    restUntil.current = Date.now() + BETWEEN_MS;
    cheer();
    // Where it was used, or where it last was if it's gone; not over something that's opened on top (the character creator, a dialog).
    const rect = showing(before.target) ? before.target.getBoundingClientRect() : lastRect.current;
    const covered = characterCreatorShown() || !!document.querySelector("[aria-modal=true]");
    if (rect && !covered) setBurst({ target: before.target, rect, key: Date.now() });
  }, [cue]);
  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(() => setBurst(null), BURST_MS);
    return () => window.clearTimeout(timer);
  }, [burst]);

  useEffect(() => {
    if (cue) startSettling();
  }, [cue]);

  // Walking, next to try: the floor marks a spot a few steps away (WalkSpot), and the pointer points there.
  const wantsWalk = active && !isDone("move") && !isSkipped("move");

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {wantsWalk && <WalkSpotTarget />}
      <AnimatePresence>
        {cue && (
          <Pointer
            key={`${cue.step}:${cue.target.dataset.settle}`}
            cue={cue}
            character={characterOrDefault(user?.character)}
            text={t(cue.words)}
            notNow={t("notNow")}
            reduce={reduce}
            onSkip={() => {
              skip(cue.step);
              setCue(null);
            }}
          />
        )}
      </AnimatePresence>
      {burst && !reduce && <PixelBurst key={burst.key} target={burst.target} rect={burst.rect} />}
    </>,
    document.body,
  );
}

/**
 * The floor's spot to walk to, as something on the page to point at: the
 * floor draws its mark (WalkSpot, under people, at its own depth); this is a
 * clear square kept over it every frame, for the pointer.
 */
function WalkSpotTarget() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const spot = getFloorSpot();
    spot?.show(true);
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const at = getFloorSpot()?.where();
      const element = box.current;
      if (!element) return;
      if (!at) {
        element.style.display = "none";
        return;
      }
      element.style.display = "";
      // The pointer's words go on the side away from you, not over you.
      element.dataset.settleLabel = at.youLeft ? "right" : "left";
      element.style.width = element.style.height = `${Math.round(at.size)}px`;
      element.style.transform = `translate3d(${Math.round(at.x - at.size / 2)}px, ${Math.round(at.y - at.size / 2)}px, 0)`;
    };
    place();
    return () => {
      cancelAnimationFrame(frame);
      spot?.show(false);
    };
  }, []);
  return <div ref={box} data-settle="walk" aria-hidden className="pointer-events-none fixed left-0 top-0" />;
}

/** The office's own colours (its lamps and mugs: coral, teal, mustard) and white, for the pixels that pop off something done. */
const BURST_COLOURS = ["#e8765c", "#3fa7a3", "#e3b23c", "#ffffff"];
const BURST_PIXELS = 9;

/**
 * A few square pixels popping off something just done, the floor's own
 * pixels, in the office's colours: out, a little up, and gone. Rides with
 * the thing as the page moves.
 */
function PixelBurst({ target, rect: at }: { target: HTMLElement; rect: DOMRect }) {
  const box = useRef<HTMLDivElement>(null);
  const [pixels] = useState(() =>
    Array.from({ length: BURST_PIXELS }, (_, n) => {
      const angle = (n / BURST_PIXELS) * Math.PI * 2 + Math.random() * 0.5;
      const reach = 24 + Math.random() * 18;
      return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach - 10, size: Math.random() < 0.4 ? 6 : 5, colour: BURST_COLOURS[n % BURST_COLOURS.length], delay: Math.random() * 0.05 };
    }),
  );
  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      // With the thing while it's there; where it was once it's gone.
      const rect = showing(target) ? target.getBoundingClientRect() : at;
      if (box.current) box.current.style.transform = `translate3d(${Math.round(rect.left + rect.width / 2)}px, ${Math.round(rect.top + rect.height / 2)}px, 0)`;
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [target, at]);
  return (
    <div ref={box} aria-hidden className="pointer-events-none fixed left-0 top-0 z-[70]">
      {pixels.map((pixel, n) => (
        <motion.span
          key={n}
          className="absolute"
          style={{ width: pixel.size, height: pixel.size, background: pixel.colour, left: -pixel.size / 2, top: -pixel.size / 2, boxShadow: "0 0 0 1px rgb(0 0 0 / 0.18)" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
          // Out fast and solid, a moment in the air, then gone: a pop, not a fade.
          animate={{ x: Math.round(pixel.dx), y: Math.round(pixel.dy), opacity: [1, 1, 0], scale: 1 }}
          transition={{
            default: { duration: BURST_MS / 1000, delay: pixel.delay, ease: [0.15, 0.8, 0.3, 1] },
            opacity: { duration: BURST_MS / 1000, delay: pixel.delay, ease: "linear", times: [0, 0.55, 1] },
            scale: { duration: (BURST_MS / 1000) * 0.3, delay: pixel.delay, ease: "easeOut" },
          }}
        />
      ))}
    </div>
  );
}


/** Where the card goes from the thing: above it (caret down), below it (caret up), or to its right (caret left). */
type Side = "above" | "below" | "right";

/**
 * The caret that joins a coach card to the thing it's about: a triangle in
 * steps of 4px, the floor's own pixels, the one bit of the floor in the page's
 * chrome. Drawn pointing down, in a box a pixel wider each side for its
 * border; turned for the other sides.
 */
const STEP = 4;
const CARET_W = 6 * STEP;
const CARET_H = 3 * STEP;
const CARET_BOX_W = CARET_W + 2;
const CARET_BOX_H = CARET_H + 1;
/** How far its top reaches over the card's edge, to cover the card's border there. */
const CARET_OVER = 2;
const CARET_TURN: Record<Side, number> = { above: 0, below: 180, right: 90 };
/** Its shape, in steps: each row narrower by a step a side. */
const stepped = (grow: number, from: number) => {
  const points: Array<[number, number]> = [];
  for (let row = 0; row < 3; row += 1) {
    const inset = row * STEP - grow;
    points.push([inset, (row === 0 ? from : row * STEP + (row > 0 ? grow : 0))], [inset, (row + 1) * STEP + grow]);
  }
  const left = points.map(([x, y]) => `${x},${y}`);
  const right = points.map(([x, y]) => `${CARET_W - x},${y}`).reverse();
  return `M${[...left, ...right].join(" L")} Z`;
};
const CARET_BORDER = stepped(1, CARET_OVER);
const CARET_FILL = stepped(0, 0);

function Caret({ side }: { side: Side }) {
  return (
    <svg
      width={CARET_BOX_W}
      height={CARET_BOX_H}
      viewBox={`-1 0 ${CARET_BOX_W} ${CARET_BOX_H}`}
      shapeRendering="crispEdges"
      aria-hidden
      className="block"
      style={{ transform: `rotate(${CARET_TURN[side]}deg)` }}
    >
      <path d={CARET_BORDER} fill="var(--ui-border)" />
      <path d={CARET_FILL} fill="var(--ui-card)" />
    </svg>
  );
}

/** What each step is about, as the floor draws it: you, for what you do; a thing off a desk, for your desk. */
const PICTURE: Partial<Record<Words, string>> = {
  desk: "ours-screen-teal",
  claim: "ours-screen-teal",
  decorate: "ours-bush-desk-clay",
  calendar: "ours-clock",
};
const PICTURE_SIZE = 30;

/** The card's picture: a thing off a desk in a small tile, or your character (with someone else beside you, for your team). */
function Picture({ words, character }: { words: Words; character: string }) {
  const thing = PICTURE[words];
  if (thing) {
    return (
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_8%)] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]"
        style={{ width: PICTURE_SIZE, height: PICTURE_SIZE }}
      >
        <PieceThumb item={thing} box={[PICTURE_SIZE - 6, PICTURE_SIZE - 6]} />
      </span>
    );
  }
  if (words === "invite") {
    const other = PRESETS.find((preset) => preset !== character) ?? character;
    return (
      <span className="flex shrink-0">
        <CharacterBust character={character} size={PICTURE_SIZE} />
        <CharacterBust character={other} size={PICTURE_SIZE} className="-ms-2.5 rounded-[8px] ring-2 ring-card" />
      </span>
    );
  }
  return <CharacterBust character={character} size={PICTURE_SIZE} />;
}

/** Between the caret's tip and the thing. */
const GAP = 4;
/** Kept this far inside the window. */
const EDGE = 8;
/** The caret stays this far from the card's ends, clear of its rounded corners. */
const CARET_INSET = 12;

/**
 * One coach mark: a small card in the dock's own style, joined to the thing
 * to try by a pixel caret, a few words and a "not now"; kept on it every
 * frame as the page moves, nudging toward it now and then. Left alone a
 * while it folds into a dot on the thing (the app's own "something new"
 * dot); the dot, or the pointer over the thing, opens it again.
 */
function Pointer({ cue, text, notNow, character, reduce, onSkip }: { cue: Cue; text: string; notNow: string; character: string; reduce: boolean; onSkip: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const caret = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLButtonElement>(null);
  const [side, setSide] = useState<Side>("above");
  const [resting, setResting] = useState(false);
  // The floor's spot has its own marks to rest as; a dot there would only be a second mark.
  const onFloor = cue.target.dataset.settle === "walk";

  // Words for a while, then it rests; a new place to point (deeper in) is a new card, and talks again; so does the dot, pressed.
  useEffect(() => {
    if (resting) return;
    const timer = window.setTimeout(() => setResting(true), SPEAKS_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [resting]);

  // Resting, the pointer over the thing brings the words back too (the dot is small to aim for).
  useEffect(() => {
    if (!resting) return;
    const target = cue.target;
    const back = () => setResting(false);
    target.addEventListener("pointerenter", back);
    return () => target.removeEventListener("pointerenter", back);
  }, [resting, cue.target]);

  // Kept on it every frame: the dock grows, the floor glides, a chip rides with its desk.
  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const rect = cue.target.getBoundingClientRect();
      if (dot.current) dot.current.style.transform = `translate3d(${Math.round(rect.right - 14)}px, ${Math.round(rect.top - 10)}px, 0)`;
      const body = card.current;
      if (!body || !box.current) return;
      const w = body.offsetWidth;
      const h = body.offsetHeight;
      const reach = CARET_BOX_H - CARET_OVER + GAP;
      // A row in a panel, or a key on the rail, asks to go beside it (data-settle-side); otherwise above, or below where there's no room.
      const beside = cue.target.dataset.settleSide === "right" && rect.right + reach + w + EDGE < window.innerWidth;
      const next: Side = beside ? "right" : rect.top > h + reach + EDGE ? "above" : "below";
      if (next !== side) setSide(next);
      let left: number;
      let top: number;
      let tip: number;
      if (next === "right") {
        left = rect.right + reach;
        top = Math.min(Math.max(EDGE, rect.top + rect.height / 2 - h / 2), window.innerHeight - h - EDGE);
        tip = rect.top + rect.height / 2 - top;
      } else {
        const x = rect.left + rect.width / 2;
        // The floor's spot asks for the card to reach away from you (data-settle-label), so it doesn't cover you.
        const leans = cue.target.dataset.settleLabel;
        const wanted = leans === "right" ? x - CARET_INSET - CARET_BOX_W / 2 : leans === "left" ? x - w + CARET_INSET + CARET_BOX_W / 2 : x - w / 2;
        left = Math.min(Math.max(EDGE, wanted), window.innerWidth - w - EDGE);
        top = next === "above" ? rect.top - reach - h : rect.bottom + reach;
        tip = x - left;
      }
      box.current.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
      if (caret.current) {
        const along = Math.min(Math.max(CARET_INSET + CARET_BOX_W / 2, tip), (next === "right" ? h : w) - CARET_INSET - CARET_BOX_W / 2);
        // The caret's box turns about its middle; its base sits over the card's edge (hiding the border there), its tip toward the thing.
        const s = caret.current.style;
        if (next === "above") s.transform = `translate3d(${Math.round(along - CARET_BOX_W / 2)}px, ${h - CARET_OVER}px, 0)`;
        else if (next === "below") s.transform = `translate3d(${Math.round(along - CARET_BOX_W / 2)}px, ${CARET_OVER - CARET_BOX_H}px, 0)`;
        else s.transform = `translate3d(${CARET_OVER - CARET_BOX_H / 2 - CARET_BOX_W / 2}px, ${Math.round(along - CARET_BOX_H / 2)}px, 0)`;
      }
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [cue.target, side, resting]);

  // Which way is toward the thing, for the card's arrival and its nudge.
  const toward = side === "above" ? { x: 0, y: 1 } : side === "below" ? { x: 0, y: -1 } : { x: -1, y: 0 };
  return (
    <>
      <div ref={box} className="pointer-events-none fixed left-0 top-0 z-[70] will-change-transform">
        <AnimatePresence>
          {!resting && (
            <motion.div
              initial={{ opacity: 0, x: reduce ? 0 : -toward.x * 6, y: reduce ? 0 : -toward.y * 6 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.14 } }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
            >
              {/* Two small nudges toward the thing, then a rest; still for anyone who'd rather less motion. */}
              <div
                // A press on it is its own: not "somewhere else", which would fold away the dock it points into.
                onPointerDown={(event) => event.stopPropagation()}
                style={
                  reduce
                    ? undefined
                    : ({ animation: "settle-nudge 3.2s ease-in-out 1.2s infinite", "--nudge-x": `${toward.x * 3}px`, "--nudge-y": `${toward.y * 3}px` } as React.CSSProperties)
                }
              >
                <div
                  ref={card}
                  role="status"
                  className="pointer-events-auto relative flex max-w-[18rem] items-center gap-2.5 rounded-[12px] border border-border bg-card p-1.5 pe-1 text-[13px] font-medium leading-snug text-foreground shadow-float"
                >
                  <Picture words={cue.words} character={character} />
                  <span className="min-w-0">{text}</span>
                  <button
                    type="button"
                    aria-label={notNow}
                    title={notNow}
                    onClick={onSkip}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                  <div ref={caret} className="pointer-events-none absolute left-0 top-0">
                    <Caret side={side} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {resting && !onFloor && (
          <motion.button
            ref={dot}
            type="button"
            aria-label={text}
            title={text}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setResting(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            // A small dot, a larger place to press.
            className="pointer-events-auto fixed left-0 top-0 z-[70] flex size-6 cursor-pointer items-center justify-center"
          >
            <motion.span
              className="size-2.5 rounded-full bg-brand ring-2 ring-card"
              initial={{ scale: reduce ? 1 : 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
            />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
