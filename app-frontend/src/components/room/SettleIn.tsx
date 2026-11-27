"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Check, X } from "web-shared/components/ui/icons";
import { FLOOR } from "shared-protocol/map";
import { deskOfSeat } from "shared-protocol/office";
import { useAuth } from "@/contexts/AuthContext";
import { useOfficeMaybe } from "@/components/app/OfficeShell";
import { deskOf, useDesks } from "@/lib/desks";
import { usePieceChanges } from "@/lib/pieces";
import { calendarAvailable, useCalendar } from "@/lib/calendar";
import { FLOOR_ARRIVED_EVENT } from "@/lib/floor";
import { busyNow } from "@/lib/attention";
import { isDone, isSkipped, settleAs, skip, startSettling, stillSettling, useSettle, type SettleStep } from "@/lib/settle";
import { touchFirst } from "@/lib/touch";
import { EASE_OUT } from "@/lib/ease";

/** A moment after arriving before the first pointer: the floor first, then what to do on it. */
const FIRST_AFTER_MS = 2500;
/** And between one thing done and the next pointer: a beat to enjoy it. */
const BETWEEN_MS = 1600;
/** How long the pointer stays in words; after that it rests as a dot on what it points at, still there, no longer talking. */
const SPEAKS_FOR_MS = 14_000;
/** How long the check over something just done stays. */
const CHEER_MS = 1600;
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
    { step: "move", open: !isDone("move"), at: [["[data-settle=me]", touchFirst() ? "moveTouch" : "move"]] },
    // Someone beside you is a moment that passes: it comes before the rest while it lasts.
    { step: "hello", open: !isDone("hello"), at: [["[data-settle=wave]", "hello"]] },
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

  // A step done while it was pointed at: a check where it was, then a beat before the next.
  const [cheer, setCheer] = useState<{ target: HTMLElement; key: number } | null>(null);
  const shownStep = useRef<Cue | null>(null);
  useEffect(() => {
    const before = shownStep.current;
    shownStep.current = cue;
    if (!before || (cue && cue.step === before.step)) return;
    if (!isDone(before.step) || lastDone.current === before.step) return;
    lastDone.current = before.step;
    restUntil.current = Date.now() + BETWEEN_MS;
    if (showing(before.target)) setCheer({ target: before.target, key: Date.now() });
  }, [cue]);
  useEffect(() => {
    if (!cheer) return;
    const timer = window.setTimeout(() => setCheer(null), CHEER_MS);
    return () => window.clearTimeout(timer);
  }, [cheer]);

  useEffect(() => {
    if (cue) startSettling();
  }, [cue]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <AnimatePresence>
        {cue && (
          <Pointer
            key={`${cue.step}:${cue.target.dataset.settle}`}
            cue={cue}
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
      <AnimatePresence>
        {cheer && <Cheer key={cheer.key} target={cheer.target} />}
      </AnimatePresence>
    </>,
    document.body,
  );
}

/** A check over what was just done, riding with it as the page moves (a tag walking off, a dock folding), for a moment. */
function Cheer({ target }: { target: HTMLElement }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const rect = target.getBoundingClientRect();
      if (box.current) box.current.style.transform = `translate3d(${Math.round(rect.left + rect.width / 2 - 14)}px, ${Math.round(rect.top - 36)}px, 0)`;
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return (
    <div ref={box} className="pointer-events-none fixed left-0 top-0 z-[70]">
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 22 } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.2 } }}
        className="flex size-7 items-center justify-center rounded-full bg-ok text-white shadow-float"
      >
        <Check className="size-4" strokeWidth={2.5} />
      </motion.div>
    </div>
  );
}

type Side = "above" | "below" | "right";

/**
 * One pointer: a few words in a dark bubble beside what it points at, an
 * arrow to it, and a quiet ring on the thing itself; kept beside it every
 * frame as the page moves. After a while it stops talking and rests as a dot.
 */
function Pointer({ cue, text, notNow, reduce, onSkip }: { cue: Cue; text: string; notNow: string; reduce: boolean; onSkip: () => void }) {
  const bubble = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLButtonElement>(null);
  const [side, setSide] = useState<Side>("above");
  const [resting, setResting] = useState(false);

  // Words for a while, then a dot; a new place to point (deeper in) is a new pointer, and talks again; so does the dot, pressed.
  const [woke, setWoke] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(() => setResting(true), SPEAKS_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [woke]);

  // The ring on the thing pointed at, for as long as it's pointed at.
  useEffect(() => {
    const target = cue.target;
    target.classList.add("settle-target");
    return () => target.classList.remove("settle-target");
  }, [cue.target]);

  // Kept beside it every frame: the dock grows, the floor glides, a chip rides with its desk.
  useEffect(() => {
    let frame = 0;
    const place = () => {
      frame = requestAnimationFrame(place);
      const rect = cue.target.getBoundingClientRect();
      const box = bubble.current;
      if (box) {
        const width = box.offsetWidth;
        const height = box.offsetHeight;
        // A row in a panel, or a key on the rail, says to go beside it (data-settle-side), not over what's around it.
        const beside = cue.target.dataset.settleSide === "right" && rect.right + width + 24 < window.innerWidth;
        const next: Side = beside ? "right" : rect.top > height + 24 ? "above" : "below";
        if (next !== side) setSide(next);
        let x: number;
        let y: number;
        if (next === "right") {
          x = rect.right + 12;
          y = rect.top + rect.height / 2 - height / 2;
        } else {
          x = Math.min(Math.max(rect.left + rect.width / 2 - width / 2, 12), window.innerWidth - width - 12);
          y = next === "above" ? rect.top - height - 12 : rect.bottom + 12;
        }
        box.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
        // The arrow stays on what it points at, wherever the bubble had to go to stay on the screen.
        const arrow = box.querySelector<HTMLElement>("[data-arrow]");
        if (arrow) {
          if (next === "right") arrow.style.cssText = `left:-4px;top:${height / 2 - 4}px`;
          else arrow.style.cssText = `left:${Math.min(Math.max(rect.left + rect.width / 2 - x - 4, 12), width - 20)}px;${next === "above" ? `top:${height - 4}px` : "top:-4px"}`;
        }
      }
      if (dot.current) dot.current.style.transform = `translate3d(${Math.round(rect.right - 5)}px, ${Math.round(rect.top - 3)}px, 0)`;
    };
    place();
    return () => cancelAnimationFrame(frame);
  }, [cue.target, side, resting]);

  const from = side === "above" ? { y: 6 } : side === "below" ? { y: -6 } : { x: -6 };
  return (
    <>
      {resting ? (
        <button
          ref={dot}
          type="button"
          aria-label={text}
          title={text}
          onClick={() => {
            setResting(false);
            setWoke((now) => now + 1);
          }}
          // A little bigger than it looks, to be easy to press.
          className="fixed left-0 top-0 z-[70] flex size-5 -translate-x-[5px] -translate-y-[5px] cursor-pointer items-center justify-center"
        >
          <motion.span initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="size-2.5 rounded-full bg-foreground ring-2 ring-background" />
        </button>
      ) : (
        // Placed by the frame loop (this), and brought in by its own layer (inside), so the two don't fight over transform.
        <div ref={bubble} role="status" className="fixed left-0 top-0 z-[70] will-change-transform">
          <motion.div
            initial={{ opacity: 0, ...(reduce ? {} : from) }}
            animate={{ opacity: 1, x: 0, y: 0, transition: { duration: 0.24, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="relative flex max-w-[16rem] items-center gap-1.5 rounded-[12px] bg-foreground py-1.5 pe-1.5 ps-3 text-[13px] font-medium leading-snug text-background shadow-float"
          >
            <span data-arrow aria-hidden className="absolute size-2 rotate-45 rounded-[1px] bg-foreground" />
            <span className="relative min-w-0">{text}</span>
            <button
              type="button"
              aria-label={notNow}
              title={notNow}
              onClick={onSkip}
              className="relative flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-background/60 transition-colors hover:bg-background/15 hover:text-background"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
