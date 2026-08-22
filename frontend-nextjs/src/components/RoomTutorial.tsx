"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Footprints,
  MousePointerClick,
  Users,
  Video,
  MessageSquare,
  Mic,
  Volume2,
  ChevronRight,
  Link2,
  Check,
  Copy,
} from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { playSound } from "@/lib/sounds";
import { ProximityActions } from "./ProximityActions";
import { CharacterSprite } from "./CharacterSprite";
import {
  GUIDE_ID,
  GUIDE_NAME,
  GUIDE_SPRITE,
  INPUT_MODE_EVENT,
  ROOM_CONTROL_EVENT,
  completeTutorial,
  isTouchInput,
  tutorialDone,
} from "@/lib/tutorial";

const WALK_DISTANCE = 150;
const CONTROLS_STEP = 3;
const SPRITE_HEADROOM_ROWS = 9;
const SPRITE_ROWS = 32;

const DEMO_PLAYER = {
  id: GUIDE_ID,
  name: GUIDE_NAME,
  x: 0,
  y: 0,
  status: "offline",
  guest: true,
};

const STEPS = [
  {
    icon: Footprints,
    text: "Walk around with W A S D",
    touchText: "Drag the joystick to walk",
  },
  {
    icon: MousePointerClick,
    text: "Or click anywhere to walk straight there",
    touchText: "Or tap anywhere to walk straight there",
  },
  {
    icon: Users,
    text: "Step close to someone to call or chat",
  },
  {
    icon: MessageSquare,
    text: "Your mic, camera, speaker and chat live here",
    aboveControls: true,
  },
  {
    icon: Link2,
    text: "Invite someone with this link, or you are all set",
  },
];

function initialStep() {
  return tutorialDone() ? -1 : 0;
}

function KeyCap({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`w-5 h-5 rounded-[5px] text-[9px] font-bold flex items-center justify-center border ${
        active
          ? "bg-[var(--color-braun-text)] text-white border-[var(--color-braun-text)]"
          : "bg-white text-[var(--color-braun-text)] border-[rgba(0,0,0,0.1)]"
      }`}
    >
      {label}
    </span>
  );
}

function DemoSprite({
  character,
  state,
  direction,
  scale,
}: {
  character: string;
  state: "idle" | "run";
  direction: "right" | "down";
  scale: number;
}) {
  const trim = SPRITE_HEADROOM_ROWS * scale;
  return (
    <div
      className="overflow-hidden"
      style={{ height: SPRITE_ROWS * scale - trim }}
    >
      <CharacterSprite
        character={character}
        state={state}
        direction={direction}
        scale={scale}
        offsetY={-trim}
      />
    </div>
  );
}

function NameLabel({ label }: { label: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded-full bg-[#1f2937]/85 text-white text-[8px] font-bold tracking-wide max-w-[80px] truncate">
      {label}
    </span>
  );
}

function Cursor({
  animation,
  size = "w-4 h-4",
}: {
  animation: string;
  size?: string;
}) {
  return (
    <MousePointerClick
      className={`${size} text-[var(--color-braun-text)]/75`}
      style={{ animation }}
    />
  );
}

function Ripple({
  animation,
  size = "w-4 h-4",
}: {
  animation: string;
  size?: string;
}) {
  return (
    <span
      className={`block ${size} rounded-full border-2 border-[var(--color-braun-text)]/50`}
      style={{ animation }}
    />
  );
}

export default function RoomTutorial({
  name,
  character,
  roomId,
}: {
  name: string;
  character: string;
  roomId: string;
}) {
  const [step, setStep] = useState(initialStep);
  const [touch, setTouch] = useState(isTouchInput);
  const [copied, setCopied] = useState(false);
  const greeted = useRef(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const copyInvite = useCallback(() => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/join?roomId=${roomId}`,
    );
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  const finish = useCallback(() => {
    completeTutorial();
    setStep(-1);
  }, []);

  const advance = useCallback(() => {
    setStep((prev) => {
      if (prev < 0) return prev;
      if (prev >= STEPS.length - 1) {
        completeTutorial();
        return -1;
      }
      return prev + 1;
    });
  }, []);

  useEffect(() => {
    if (step < 0) return;

    const onMoved = (event: Event) => {
      const { method } = (event as CustomEvent<{ method: string }>).detail;
      if (step === 0 && method === "manual") advance();
      if (step === 1 && method === "click") advance();
    };
    const onControlUsed = () => {
      if (step === CONTROLS_STEP) advance();
    };
    const onInputMode = () => setTouch(isTouchInput());

    const checkCall = () => {
      if (step === 2 && callManager.getSnapshot().peers.length) advance();
    };
    const unsubscribe = callManager.subscribe(checkCall);
    queueMicrotask(checkCall);

    window.addEventListener("playerMoved", onMoved);
    window.addEventListener("openChat", onControlUsed);
    window.addEventListener(ROOM_CONTROL_EVENT, onControlUsed);
    window.addEventListener(INPUT_MODE_EVENT, onInputMode);

    return () => {
      window.removeEventListener("playerMoved", onMoved);
      window.removeEventListener("openChat", onControlUsed);
      window.removeEventListener(ROOM_CONTROL_EVENT, onControlUsed);
      window.removeEventListener(INPUT_MODE_EVENT, onInputMode);
      unsubscribe();
    };
  }, [step, advance]);

  useEffect(() => {
    if (step !== CONTROLS_STEP || greeted.current) return;
    greeted.current = true;
    playSound("message");
    window.dispatchEvent(
      new CustomEvent("chatMessage", {
        detail: {
          id: `guide-${Date.now()}`,
          senderId: GUIDE_ID,
          senderName: GUIDE_NAME,
          content: "This is the room chat. Everyone in the room sees it.",
          timestamp: new Date(),
          type: "text",
        },
      }),
    );
  }, [step]);

  if (step < 0) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const text = touch && current.touchText ? current.touchText : current.text;
  const isLast = step === STEPS.length - 1;

  let demo: ReactNode = null;

  if (step === 0) {
    demo = (
      <>
        <div
          className="absolute left-4 bottom-5 flex flex-col items-center gap-0.5"
          style={{
            animation: "tutorial-walk 3.2s ease-in-out infinite",
            ["--walk-distance" as string]: `${WALK_DISTANCE}px`,
          }}
        >
          <NameLabel label={name} />
          <DemoSprite
            character={character}
            state="run"
            direction="right"
            scale={1.8}
          />
        </div>
        <div className="absolute right-4 bottom-7 flex flex-col items-center gap-1">
          {touch ? (
            <span className="w-11 h-11 rounded-full border-2 border-[rgba(0,0,0,0.12)] bg-white/70 flex items-center justify-center">
              <span className="w-5 h-5 rounded-full bg-[var(--color-braun-text)]/70 translate-x-1.5" />
            </span>
          ) : (
            <>
              <KeyCap label="W" />
              <div className="flex gap-1">
                <KeyCap label="A" />
                <KeyCap label="S" />
                <KeyCap label="D" active />
              </div>
            </>
          )}
        </div>
      </>
    );
  } else if (step === 1) {
    demo = (
      <>
        <div
          className="absolute left-4 bottom-5 flex flex-col items-center gap-0.5"
          style={{
            animation: "tutorial-click-walk 3.2s ease-in-out infinite",
            ["--walk-distance" as string]: `${WALK_DISTANCE}px`,
          }}
        >
          <NameLabel label={name} />
          <DemoSprite
            character={character}
            state="run"
            direction="right"
            scale={1.8}
          />
        </div>
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 16 + WALK_DISTANCE, bottom: 28 }}
        >
          <Ripple
            animation="tutorial-click-ripple 3.2s ease-out infinite"
            size="w-6 h-6"
          />
          <span className="absolute translate-x-4 translate-y-4">
            <Cursor
              animation="tutorial-click-press 3.2s ease-out infinite"
              size="w-6 h-6"
            />
          </span>
        </div>
      </>
    );
  } else if (step === 2) {
    demo = (
      <>
        <div className="absolute left-7 bottom-3 flex flex-col items-center gap-0.5">
          <NameLabel label={GUIDE_NAME} />
          <DemoSprite
            character={GUIDE_SPRITE}
            state="idle"
            direction="down"
            scale={1.7}
          />
        </div>

        <div
          className="absolute left-[70px] top-3"
          style={{ animation: "tutorial-bar-in 4.8s ease-in-out infinite" }}
        >
          <div className="relative">
            <ProximityActions player={DEMO_PLAYER} />
            <span
              className="absolute flex items-center justify-center pointer-events-none"
              style={{ left: 44, top: 8 }}
            >
              <Ripple animation="tutorial-tap-ripple 4.8s ease-out infinite" />
              <span className="absolute translate-x-3 translate-y-3">
                <Cursor animation="tutorial-tap-press 4.8s ease-out infinite" />
              </span>
            </span>
          </div>
        </div>
      </>
    );
  } else if (step === CONTROLS_STEP) {
    demo = (
      <div className="absolute inset-0 flex items-center justify-center gap-2">
        {[Mic, Video, Volume2, MessageSquare].map((StripIcon, index) => (
          <span
            key={index}
            className="w-9 h-9 rounded-full bg-white border border-[rgba(0,0,0,0.06)] shadow-sm flex items-center justify-center text-[var(--color-braun-text)]"
          >
            <StripIcon className="w-4 h-4" />
          </span>
        ))}
      </div>
    );
  } else {
    demo = (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4">
        <div className="flex items-center gap-2 w-full bg-white border border-[rgba(0,0,0,0.06)] rounded-full pl-3 pr-1.5 py-1.5 shadow-sm">
          <Link2 className="w-3.5 h-3.5 text-[var(--color-braun-text)]/50 shrink-0" />
          <span className="flex-1 truncate text-[10px] font-medium text-[var(--color-braun-text)]/70">
            /join?roomId={roomId}
          </span>
          <button
            onClick={copyInvite}
            className="cursor-pointer shrink-0 h-6 px-2.5 rounded-full bg-[var(--color-braun-text)] text-white text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95"
          >
            {copied ? (
              <Check className="w-3 h-3" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[9px] font-medium text-[var(--color-braun-text)]/45 tracking-wide text-center">
          Anyone with the link lands in this room
        </p>
      </div>
    );
  }

  return (
    <div
      className={
        current.aboveControls
          ? "fixed z-[46] bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 w-[300px] max-w-[calc(100vw-24px)]"
          : "fixed z-[46] right-3 md:right-4 top-1/2 -translate-y-1/2 w-[300px] max-w-[calc(100vw-24px)]"
      }
    >
      <div className="bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-2xl shadow-lg p-3.5">
        <div className="relative h-[128px] rounded-xl bg-[var(--color-braun-text)]/[0.04] overflow-hidden">
          {demo}
        </div>

        <div className="flex items-start gap-2.5 mt-3 h-[42px] overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-[var(--color-braun-text)] leading-snug pt-1.5">
            {text}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? "w-3 bg-[var(--color-braun-text)]"
                    : "w-1.5 bg-[var(--color-braun-text)]/20"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isLast ? (
              <button
                onClick={finish}
                className="cursor-pointer h-7 px-3.5 rounded-full bg-[var(--color-braun-text)] text-white text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={finish}
                  className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-braun-text)] transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={advance}
                  className="cursor-pointer w-7 h-7 rounded-full bg-[var(--color-braun-text)] text-white flex items-center justify-center transition-all active:scale-95"
                  title="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
