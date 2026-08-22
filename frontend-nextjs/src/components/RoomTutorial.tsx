"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Footprints,
  MousePointerClick,
  Users,
  Video,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { playSound } from "@/lib/sounds";
import {
  GUIDE_ID,
  GUIDE_NAME,
  INPUT_MODE_EVENT,
  completeTutorial,
  isTouchInput,
  tutorialDone,
} from "@/lib/tutorial";

const STEPS = [
  {
    icon: Footprints,
    text: "Walk around with W A S D",
    touchText: "Drag the joystick to walk",
  },
  {
    icon: MousePointerClick,
    text: "Click anywhere to walk there",
    touchText: "Tap anywhere to walk there",
  },
  { icon: Users, text: `Walk over to ${GUIDE_NAME} nearby` },
  { icon: Video, text: "Try calling the Guide with those buttons" },
  { icon: MessageSquare, text: "Mic, camera and chat live down here" },
];

function initialStep() {
  return tutorialDone() ? -1 : 0;
}

export default function RoomTutorial() {
  const [step, setStep] = useState(initialStep);
  const [touch, setTouch] = useState(isTouchInput);
  const greeted = useRef(false);

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
    const onProximity = (event: Event) => {
      if (step === 2 && (event as CustomEvent<unknown[]>).detail.length) {
        advance();
      }
    };
    const onChat = () => {
      if (step === 4) advance();
    };

    const onInputMode = () => setTouch(isTouchInput());

    window.addEventListener("playerMoved", onMoved);
    window.addEventListener("proximityUpdate", onProximity);
    window.addEventListener("openChat", onChat);
    window.addEventListener(INPUT_MODE_EVENT, onInputMode);
    const checkCall = () => {
      if (step === 3 && callManager.getSnapshot().peers.length) advance();
    };
    const unsubscribe = callManager.subscribe(checkCall);
    queueMicrotask(checkCall);

    return () => {
      window.removeEventListener("playerMoved", onMoved);
      window.removeEventListener("proximityUpdate", onProximity);
      window.removeEventListener("openChat", onChat);
      window.removeEventListener(INPUT_MODE_EVENT, onInputMode);
      unsubscribe();
    };
  }, [step, advance]);

  useEffect(() => {
    if (step !== STEPS.length - 1 || greeted.current) return;
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

  return (
    <div className="fixed bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-40 w-max max-w-[94vw] px-2">
      <div className="flex items-center gap-2 sm:gap-3 bg-[#fbfbf9]/95 backdrop-blur-sm border border-[rgba(0,0,0,0.06)] rounded-full shadow-lg py-2 pl-2 pr-2.5">
        <div className="w-8 h-8 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] shrink-0">
          <Icon className="w-4 h-4" />
        </div>

        <span className="text-[11px] sm:text-xs font-semibold text-[var(--color-braun-text)] tracking-wide truncate">
          {text}
        </span>

        <div className="hidden sm:flex items-center gap-1 shrink-0">
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

        <button
          onClick={advance}
          className="cursor-pointer w-7 h-7 rounded-full bg-[var(--color-braun-text)] text-white flex items-center justify-center shrink-0 transition-all active:scale-95"
          title="Next"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={finish}
          className="cursor-pointer text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-[var(--color-braun-text)] transition-colors shrink-0 px-1"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
