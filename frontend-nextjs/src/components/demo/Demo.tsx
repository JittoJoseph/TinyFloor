"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Hash, ImagePlus, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, Search, Settings2, Smile, Video, VideoOff, Volume2 } from "lucide-react";
import { MapTrifoldIcon } from "@phosphor-icons/react/dist/csr/MapTrifold";
import { ChatsCircleIcon } from "@phosphor-icons/react/dist/csr/ChatsCircle";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { GearSixIcon } from "@phosphor-icons/react/dist/csr/GearSix";
import { SignOutIcon } from "@phosphor-icons/react/dist/csr/SignOut";
import { Face, FaceStack, faceBackground } from "@/components/ui/Face";
import { Logo } from "@/components/app/AppShell";
import { applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { DemoFloor, type FloorHandle } from "./DemoFloor";
import type { CastMember, DemoDirections } from "./DemoScene";

/*
 * A scripted walk through the app for a short video: the real floor (the
 * app's map, characters and pathfinding, stepped frame by frame), then a live
 * chat, then people, then back to the floor where you walk up to someone's
 * desk. Time is driven from outside (window.__render(t)) so a recorder can
 * step it; every CSS animation is pinned to the same clock.
 */

// ---------------------------------------------------------------- timeline

const T_CHAT = 9.0;
const T_PEOPLE = 16.6;
const T_FLOOR = 21.2;
const FADE = 0.28;
/** After you reach Jack: a click on video, the call, then the end card. */
const CLICK = 1.7;
const CALL = CLICK + 0.25;
const HOLD = CALL + 3.4;
const CARD = 2.6;

// ---------------------------------------------------------------- the cast


const CAST: CastMember[] = [
  {
    id: "maya-12",
    name: "Emma",
    character: "Amelia",
    status: "available",
    mode: "you",
    seed: 11,
    // Out of the side office, a look at Olivia's desk on the way, and on into the hall.
    tile: [7, 26],
    route: [
      { tile: [20, 24], pause: 0.8, face: "up" },
      { tile: [33, 16], pause: 30 },
    ],
  },
  { id: "leo-21", name: "Jack", character: "Adam", status: "available", mode: "stand", seed: 21, tile: [35, 22] },
  { id: "priya-25", name: "Olivia", character: "Lucy", status: "busy", mode: "sit", seed: 33, chair: [640, 352] },
  { id: "ash-3", name: "Grace", character: "Ash", status: "available", mode: "sit", seed: 47, chair: [1280, 416] },
  { id: "ryan-4", name: "Ryan", character: "Alex", status: "available", mode: "sit", seed: 29, chair: [864, 736], standAt: 3.2 },
  { id: "sam-20", name: "Sam", character: "Bob", status: "available", mode: "wander", seed: 5, tile: [25, 14] },
  { id: "aiko-6", name: "Lily", character: "Molly", status: "away", mode: "wander", seed: 8, tile: [18, 27] },
  { id: "noah-20", name: "Noah", character: "Dan", status: "available", mode: "wander", seed: 17, tile: [36, 11] },
];

const DIRECTIONS: DemoDirections = {
  youWalkAt: T_FLOOR + 0.5,
  // Beside Jack, by the desks in the middle of the hall.
  youGoal: [32, 22],
  clearFrom: T_CHAT,
  clear: [27, 15, 39, 24],
  youFace: "right",
  standFace: "left",
};

const MAP = { width: 1536, height: 1024 };

/** The app's camera, following you with a deadzone and a soft lerp (GameScene), a little closer for the video. */
const CAMERA_ZOOM = 1.2;
const DEADZONE = { width: 120, height: 90 };
/** GameScene's 0.08 a frame at 60fps, as a rate for our 30. */
const FOLLOW = 1 - (1 - 0.08) ** 2;

/**
 * The editing trend: as the pointer heads for a button the whole screen leans
 * in on it, holds through the click, then eases back out to the new view.
 * Each is [start of the lean, fully in, start of the way out, back out].
 */
const PUNCH = 1.9;
const PUNCHES: Array<{ target: "chat" | "people" | "walk"; at: [number, number, number, number] }> = [
  { target: "chat", at: [T_CHAT - 1.9, T_CHAT - 0.8, T_CHAT + 0.15, T_CHAT + 1.0] },
  { target: "people", at: [T_PEOPLE - 1.6, T_PEOPLE - 0.7, T_PEOPLE + 0.15, T_PEOPLE + 1.0] },
  { target: "walk", at: [T_FLOOR - 2.0, T_FLOOR - 1.0, T_FLOOR + 0.1, T_FLOOR + 1.0] },
];

// ---------------------------------------------------------------- easing

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

// ---------------------------------------------------------------- the page

type View = "floor" | "chat" | "people";

const SWITCHES: Array<[number, View]> = [[-10, "floor"], [T_CHAT, "chat"], [T_PEOPLE, "people"], [T_FLOOR, "floor"]];

/** The view being switched to fades in on top of the one it replaces. */
function shown(view: View, t: number) {
  const index = SWITCHES.findLastIndex(([at]) => t >= at);
  const [at, current] = SWITCHES[index];
  if (view === current) return { opacity: span(t, at, at + FADE), z: 2 };
  const previous = SWITCHES[index - 1]?.[1];
  if (view === previous && t < at + FADE) return { opacity: 1, z: 1 };
  return { opacity: 0, z: 0 };
}

interface Win {
  __render: (t: number) => void;
  __ready: Promise<void>;
  __done: boolean;
}

export function Demo({ people }: { people: ReactNode }) {
  const [t, setT] = useState(0);
  const [bar, setBar] = useState<{ x: number; y: number; k: number } | null>(null);
  const [arrived, setArrived] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const floor = useRef<FloorHandle | null>(null);
  const targets = useRef<Record<string, DOMRect>>({});
  const reached = useRef<number | null>(null);
  const inCall = useRef(false);
  const camera = useRef({ x: 0, y: 0, ready: false });
  const ready = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    applyTheme();
  }, []);

  useEffect(() => {
    const win = window as unknown as Win;
    const measure = () => {
      const box = root.current!.getBoundingClientRect();
      const at = (el: Element | null) => {
        if (!el) return undefined;
        const r = el.getBoundingClientRect();
        return new DOMRect(r.x - box.x, r.y - box.y, r.width, r.height);
      };
      targets.current = {
        chat: at(root.current!.querySelector('[data-rail="chat"]'))!,
        people: at(root.current!.querySelector('[data-rail="people"]'))!,
      };
      const walk = [...root.current!.querySelectorAll("[data-panel=people] span")].filter((el) => el.textContent?.trim() === "Walk to");
      const jack = at(walk[3] ?? null);
      if (jack) targets.current.walk = jack;
    };

    win.__done = false;
    win.__ready = new Promise<void>((resolve) => {
      ready.current = resolve;
    }).then(() => document.fonts.ready.then(measure));

    win.__render = (next: number) => {
      const handle = floor.current;
      if (handle) {
        // The camera follows you the way the app's does; at the end it leans in
        // on you and Jack.
        const you = handle.positionOf("maya-12");
        const jack = handle.positionOf("leo-21");
        const cam = camera.current;
        if (you) {
          if (!cam.ready) Object.assign(cam, { x: you.x, y: you.y, ready: true });
          const halfW = DEADZONE.width / 2 / CAMERA_ZOOM;
          const halfH = DEADZONE.height / 2 / CAMERA_ZOOM;
          const wantX = you.x > cam.x + halfW ? you.x - halfW : you.x < cam.x - halfW ? you.x + halfW : cam.x;
          const wantY = you.y > cam.y + halfH ? you.y - halfH : you.y < cam.y - halfH ? you.y + halfH : cam.y;
          cam.x += (wantX - cam.x) * FOLLOW;
          cam.y += (wantY - cam.y) * FOLLOW;
        }
        let zoom = CAMERA_ZOOM;
        let cx = cam.x;
        let cy = cam.y;
        const r0 = reached.current;
        if (r0 !== null && you && jack) {
          const k = ease(span(next, r0, r0 + 1.3));
          zoom = lerp(CAMERA_ZOOM, 1.3, k);
          cx = lerp(cam.x, (you.x + jack.x) / 2, k);
          cy = lerp(cam.y, (you.y + jack.y) / 2 - 20, k);
        }
        handle.look(zoom, cx, cy);
        handle.stepTo(next);

        const youNow = handle.positionOf("maya-12");
        const goal = { x: DIRECTIONS.youGoal[0] * 32 + 16, y: DIRECTIONS.youGoal[1] * 32 + 16 };
        if (reached.current === null && next > DIRECTIONS.youWalkAt && youNow && Math.hypot(youNow.x - goal.x, youNow.y - goal.y) < 1.5) {
          reached.current = next;
        }
        const r = reached.current;
        if (r !== null && youNow && jack) {
          const spot = handle.toScreen((youNow.x + jack.x) / 2, Math.max(youNow.y, jack.y) + 10);
          flushSync(() => {
            setBar(spot ? { ...spot, k: ease(span(next, r + 0.15, r + 0.5)) } : null);
            setArrived(r);
          });
          if (next >= r + CALL && !inCall.current) {
            inCall.current = true;
            handle.setStatus("maya-12", "in_call");
            handle.setStatus("leo-21", "in_call");
          }
          const button = root.current!.querySelector("[data-call]");
          if (button) {
            const box = root.current!.getBoundingClientRect();
            const b = button.getBoundingClientRect();
            targets.current.call = new DOMRect(b.x - box.x, b.y - box.y, b.width, b.height);
          }
          if (next > r + HOLD + CARD) win.__done = true;
        }
      }
      flushSync(() => setT(next));
      if (!targets.current.chat) measure();
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = next * 1000;
      }
    };
  }, []);

  const view: View = SWITCHES[SWITCHES.findLastIndex(([at]) => t >= at)][1];
  const end = arrived === null ? 0 : ease(span(t, arrived + HOLD, arrived + HOLD + 0.6));

  const punch = punchAt(t, targets.current);

  return (
    <div className="fixed inset-0 overflow-hidden bg-rail">
    <div
      ref={root}
      className="fixed inset-0 flex bg-rail text-foreground [--face-ring:var(--ui-rail)]"
      style={{
        fontFeatureSettings: '"cv11","ss01"',
        transformOrigin: "0 0",
        transform: `translate(${punch.x}px, ${punch.y}px) scale(${punch.scale})`,
      }}
    >
      <Rail view={view} t={t} />
      <main className="relative my-2 me-2 min-w-0 flex-1 overflow-hidden rounded-[18px] border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)] [--face-ring:var(--ui-card)]">
        <Layer {...shown("floor", t)}>
          <div className="absolute inset-0 bg-background">
            <DemoFloor
              cast={CAST}
              directions={DIRECTIONS}
              onReady={(handle) => {
                floor.current = handle;
                ready.current();
              }}
            />
          </div>
          <FloorChrome call={arrived === null ? 0 : ease(span(t, arrived + CALL, arrived + CALL + 0.3))} />
          {bar && bar.k > 0 && (
            <div
              className="absolute"
              style={{
                left: bar.x,
                top: bar.y,
                transform: `translateX(-50%) translateY(${(1 - bar.k) * 8}px) scale(${0.92 + bar.k * 0.08})`,
                opacity: bar.k * (1 - span(t, (arrived ?? 0) + CALL, (arrived ?? 0) + CALL + 0.25)),
              }}
            >
              <NearbyBar pressed={arrived !== null && Math.abs(t - arrived - CLICK) < 0.12} />
            </div>
          )}
          {arrived !== null && t >= arrived + CALL && <CallCards t={t - arrived - CALL} />}
        </Layer>
        <Layer {...shown("chat", t)}>
          <Chat t={t} />
        </Layer>
        <Layer {...shown("people", t)} panel="people">
          <div className="h-full pt-4">{people}</div>
        </Layer>
      </main>
      <Cursor t={t} targets={targets.current} arrived={arrived} />
    </div>
      <EndCard opacity={end} />
    </div>
  );
}

/**
 * The screen's lean toward a button: a scale about the button, drawn a third
 * of the way toward the middle of the screen so it doesn't sit on the edge.
 */
function punchAt(t: number, targets: Record<string, DOMRect>) {
  for (const { target, at } of PUNCHES) {
    const r = targets[target];
    if (!r || t < at[0] || t > at[3]) continue;
    const k = t < at[1] ? ease(span(t, at[0], at[1])) : t < at[2] ? 1 : 1 - ease(span(t, at[2], at[3]));
    const scale = 1 + (PUNCH - 1) * k;
    const fx = r.x + r.width / 2;
    const fy = r.y + r.height / 2;
    const w = typeof window === "undefined" ? 1440 : window.innerWidth;
    const h = typeof window === "undefined" ? 810 : window.innerHeight;
    // Where the button lands on screen: from where it is, toward the middle.
    const landX = lerp(fx, w / 2, 0.35 * k);
    const landY = lerp(fy, h / 2, 0.35 * k);
    return { scale, x: landX - fx * scale, y: landY - fy * scale };
  }
  return { scale: 1, x: 0, y: 0 };
}

function Layer({ opacity, z, panel, children }: { opacity: number; z: number; panel?: string; children: ReactNode }) {
  return (
    <div data-panel={panel} className="absolute inset-0 bg-card" style={{ opacity, visibility: opacity > 0 || panel ? "visible" : "hidden", zIndex: z }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- the rail

function Rail({ view, t }: { view: View; t: number }) {
  // Unread messages come in on the floor, and clear when the chat is opened.
  const unread = t < T_CHAT ? (t < 3.5 ? 1 : 2) : view === "chat" ? 0 : 0;
  const items: Array<{ key: View; label: string; icon: typeof MapTrifoldIcon; badge?: number }> = [
    { key: "floor", label: "Floor", icon: MapTrifoldIcon },
    { key: "chat", label: "Chat", icon: ChatsCircleIcon, badge: unread },
    { key: "people", label: "People", icon: UsersThreeIcon },
  ];
  return (
    <nav className="relative flex w-[72px] shrink-0 flex-col items-center py-3">
      <div className="mb-2">
        <Face seed="northwind-7" size={40} square />
      </div>
      <span aria-hidden className="mb-2 h-px w-8 bg-border" />
      <div className="flex w-full flex-col items-center gap-1.5">
        {items.map(({ key: k, label, icon: Icon, badge }) => {
          const active = k === view;
          return (
            <span key={k} data-rail={k} className="relative flex w-full flex-col items-center gap-1">
              {active && <span className="absolute start-0 top-1.5 h-7 w-[3px] rounded-e-full bg-foreground" />}
              <span
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-[12px]",
                  active ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--ui-border)] dark:bg-muted" : "text-muted-foreground",
                )}
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                {!!badge && (
                  <span className="absolute -end-1.5 -top-1.5 min-w-[18px] rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-[18px] text-brand-foreground ring-2 ring-rail">
                    {badge}
                  </span>
                )}
              </span>
              <span className={cn("text-[10.5px] leading-none tracking-tight", active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </span>
          );
        })}
      </div>
      <div className="mt-auto flex w-full flex-col items-center gap-2 text-muted-foreground">
        <span className="flex size-10 items-center justify-center">
          <SignOutIcon size={22} />
        </span>
        <span className="flex size-10 items-center justify-center">
          <GearSixIcon size={22} />
        </span>
        <span className="pt-1">
          <Face seed="maya-12" size={36} presence="available" />
        </span>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------- the floor's chrome

function FloorChrome({ call }: { call: number }) {
  const inCall = call > 0;
  return (
    <>
      <span className="absolute start-4 top-4 z-10 flex h-9 items-center gap-2 rounded-full border border-border bg-card/90 pe-2 ps-3.5 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
        <span className="size-1.5 rounded-full bg-ok" />
        <span className="text-[13px] font-medium">Northwind</span>
        <span className="flex items-center gap-1 rounded-full bg-muted py-0.5 pe-2 ps-0.5 [--face-ring:var(--ui-muted)]">
          <FaceStack seeds={["maya-12", "leo-21", "priya-25"]} size={18} max={3} />
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{CAST.length}</span>
        </span>
      </span>
      <span className="absolute bottom-4 start-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card/90 p-1.5 shadow-float backdrop-blur-md">
        <span className="flex size-9 items-center justify-center rounded-full text-foreground">
          <Mic className="size-4" />
        </span>
        <span className="flex size-9 items-center justify-center rounded-full bg-destructive/12 text-destructive">
          <VideoOff className="size-4" />
        </span>
        {inCall && (
          <>
            <span className="flex size-9 items-center justify-center rounded-full text-foreground" style={{ opacity: call }}>
              <MonitorUp className="size-4" />
            </span>
            <span className="flex size-9 items-center justify-center rounded-full text-foreground" style={{ opacity: call }}>
              <Volume2 className="size-4" />
            </span>
          </>
        )}
        <span className="mx-0.5 h-5 w-px bg-border" />
        <span className="flex size-9 items-center justify-center rounded-full text-muted-foreground">
          <Settings2 className="size-4" />
        </span>
        {inCall && (
          <>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <span className="flex h-9 w-14 items-center justify-center rounded-full bg-destructive text-white" style={{ opacity: call }}>
              <PhoneOff className="size-4" />
            </span>
          </>
        )}
      </span>
    </>
  );
}

/** The call's cards along the top, as the app lays them out: you first, then Jack, a ring on whoever is talking. */
function CallCards({ t }: { t: number }) {
  // Jack talks first, then you answer, then Jack again.
  const talking = t < 1.3 ? "leo-21" : t < 2.4 ? "maya-12" : "leo-21";
  const cards = [
    { id: "maya-12", name: "You", mic: true },
    { id: "leo-21", name: "Jack", mic: true },
  ];
  return (
    <div className="absolute inset-x-0 top-[4.75rem] z-10 flex justify-center gap-3 px-4">
      {cards.map((card, index) => {
        const k = ease(span(t, index * 0.08, index * 0.08 + 0.35));
        const speaking = talking === card.id && t > 0.35;
        return (
          <div
            key={card.id}
            className={cn(
              "relative aspect-video w-[19rem] overflow-hidden rounded-2xl bg-card shadow-lg ring-2 [container-type:size]",
              speaking ? "ring-brand" : "ring-card/80",
            )}
            style={{ opacity: k, transform: `translateY(${(1 - k) * -14}px) scale(${0.96 + 0.04 * k})` }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="block aspect-square h-[42cqh] max-h-[80px] rounded-full shadow-[inset_-3px_-4px_10px_rgb(0_0_0/0.22),inset_2px_3px_7px_rgb(255_255_255/0.28)]"
                style={{ backgroundImage: faceBackground(card.id), transform: speaking ? `scale(${1 + 0.035 * Math.abs(Math.sin(t * 9))})` : undefined }}
              />
            </div>
            <span className="absolute bottom-2 start-2 flex items-center gap-1.5 rounded-full bg-card/90 px-2.5 py-1 text-[12px] font-semibold shadow-sm backdrop-blur-sm">
              {!card.mic && <MicOff className="size-3.5 text-brand" />}
              {card.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** The app's bar beside someone you've walked up to. */
function NearbyBar({ pressed }: { pressed: boolean }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/95 p-1.5 pe-2 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
      <Face seed="leo-21" size={32} presence="available" />
      <span className="px-0.5 text-[13px] font-semibold">Jack</span>
      <span data-call className="flex size-8 items-center justify-center rounded-full bg-foreground text-background" style={{ transform: pressed ? "scale(0.9)" : undefined }}>
        <Video className="size-3.5" />
      </span>
      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card">
        <Mic className="size-3.5" />
      </span>
      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card">
        <MessageSquare className="size-3.5" />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------- chat

interface Message {
  id: string;
  name: string;
  time: string;
  text: string;
  /** Seconds after the chat opens that it arrives; before that it's history. */
  at?: number;
  reaction?: string;
  /** A reaction that ticks up while you watch: [emoji, from, to, at]. */
  bump?: [string, number, number, number];
}

const MESSAGES: Message[] = [
  { id: "sam-20", name: "Sam", time: "9:12", text: "Client call moved to 2pm, notes are in #design" },
  { id: "maya-12", name: "Emma", time: "9:41", text: "Morning! Standup at the big table in 5?", reaction: "🙌 3" },
  { id: "leo-21", name: "Jack", time: "9:42", text: "On my way 👋" },
  { id: "priya-25", name: "Olivia", time: "9:47", text: "Pushed the new onboarding flow, would love eyes on it", bump: ["👀", 2, 3, 4.4] },
  { id: "aiko-6", name: "Lily", time: "9:52", text: "Heads down on the release until lunch 🎧", at: 1.7 },
  { id: "leo-21", name: "Jack", time: "9:52", text: "Nice one, I'll look at onboarding right after standup", at: 3.7 },
  { id: "priya-25", name: "Olivia", time: "9:53", text: "Thank you! Mostly the empty states 🙏", at: 5.7 },
];

/** Who's typing, and when (seconds after the chat opens). */
const TYPING: Array<[number, number, string]> = [
  [0.4, 1.7, "Lily is typing…"],
  [2.2, 3.1, "Jack is typing…"],
  [3.1, 3.7, "Jack and Olivia are typing…"],
  [3.7, 5.7, "Olivia is typing…"],
];

function Chat({ t }: { t: number }) {
  const c = t - T_CHAT;
  const typing = TYPING.find(([a, b]) => c >= a && c < b);
  const unread = c < 2.8 ? 2 : 3;
  return (
    <div className="flex h-full">
      <aside className="flex w-[280px] shrink-0 flex-col border-e border-border bg-background px-3 py-4 [--face-ring:var(--ui-background)]">
        <p className="px-2 text-[15px] font-semibold">Northwind</p>
        <span className="mx-1 mt-3 flex h-9 items-center gap-2 rounded-xl bg-muted px-3 text-[13px] text-faint">
          <Search className="size-3.5" />
          Search
        </span>
        <p className="mt-5 px-2 text-[12px] font-medium text-faint">Channels</p>
        <div className="mt-1.5 flex flex-col gap-px">
          {["general", "design", "random"].map((channel, index) => (
            <span key={channel} className={cn("flex h-9 items-center gap-2 rounded-lg px-2.5 text-[14px]", index === 0 ? "bg-muted font-medium" : "text-muted-foreground")}>
              <Hash className="size-4 opacity-60" />
              {channel}
              {index === 1 && <span className="ms-auto rounded-full bg-brand px-1.5 text-[10.5px] font-semibold leading-[18px] text-white">{unread}</span>}
            </span>
          ))}
        </div>
        <p className="mt-5 px-2 text-[12px] font-medium text-faint">Direct messages</p>
        <div className="mt-1.5 flex flex-col gap-px">
          {[
            ["sam-20", "Sam", "available", false],
            ["aiko-6", "Lily", "away", false],
            ["leo-21", "Jack", "available", c >= 2.2 && c < 3.7],
            ["ryan-4", "Ryan", "available", false],
          ].map(([id, name, presence, busy]) => (
            <span key={id as string} className="flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[14px] text-muted-foreground">
              <Face seed={id as string} size={20} presence={presence as "available"} />
              {name as string}
              {busy && <span className="ms-auto text-[11px] text-faint">typing…</span>}
            </span>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-6 text-[15px] font-semibold">
          <Hash className="size-4 text-muted-foreground" />
          general
          <span className="ms-auto flex items-center gap-2 text-[12px] font-normal text-muted-foreground [--face-ring:var(--ui-card)]">
            <FaceStack seeds={["maya-12", "leo-21", "priya-25", "aiko-6"]} size={20} max={4} />8 here
          </span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-5 overflow-hidden px-6 py-4">
          <div className="flex items-center gap-3 text-[12px] text-faint">
            <span className="h-px flex-1 bg-border" />
            Today
            <span className="h-px flex-1 bg-border" />
          </div>
          {MESSAGES.filter((message) => message.at === undefined || c >= message.at).map((message, index) => {
            const k = message.at === undefined ? 1 : ease(span(c, message.at, message.at + 0.35));
            const bump = message.bump;
            const count = bump ? (c >= bump[3] ? bump[2] : bump[1]) : 0;
            const pop = bump ? 1 + 0.25 * Math.max(0, 1 - Math.abs(c - bump[3] - 0.08) / 0.18) : 1;
            return (
              <div key={index} className="flex gap-3" style={{ opacity: k, transform: `translateY(${(1 - k) * 12}px)` }}>
                <Face seed={message.id} size={38} />
                <div className="min-w-0">
                  <p className="text-[14px] leading-none">
                    <span className="font-semibold">{message.name}</span>
                    <span className="ms-2 text-[12px] text-faint">{message.time}</span>
                  </p>
                  <p className="mt-1.5 text-[15px] leading-snug text-foreground/90">{message.text}</p>
                  {(message.reaction || bump) && (
                    <span
                      className={cn(
                        "mt-2 inline-flex h-6 items-center rounded-full border px-2 text-[12px]",
                        bump && c >= bump[3] ? "border-brand/40 bg-brand/10 text-foreground" : "border-border bg-muted text-muted-foreground",
                      )}
                      style={{ transform: `scale(${pop})`, transformOrigin: "left center" }}
                    >
                      {message.reaction ?? `${bump![0]} ${count}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="flex h-6 items-center gap-2 px-6 text-[12px] text-muted-foreground" style={{ opacity: typing ? 1 : 0 }}>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="size-1.5 rounded-full bg-muted-foreground" style={{ opacity: 0.3 + 0.7 * Math.abs(Math.sin(t * 5 + dot * 0.9)) }} />
            ))}
          </span>
          {typing?.[2]}
        </p>
        <div className="m-4 mt-1 rounded-2xl border border-border bg-background px-4 pb-3 pt-3.5">
          <p className="text-[14px] text-faint">Message #general</p>
          <div className="mt-3 flex items-center gap-2.5 text-muted-foreground">
            <ImagePlus className="size-4" />
            <Smile className="size-4" />
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- cursor and end card

function Cursor({ t, targets, arrived }: { t: number; targets: Record<string, DOMRect>; arrived: number | null }) {
  if (!targets.chat || !targets.people) return null;
  const centre = (r?: DOMRect): [number, number] => (r ? [r.x + r.width / 2, r.y + r.height * 0.45] : [700, 400]);
  const chat = centre(targets.chat);
  const people = centre(targets.people);
  const walk = centre(targets.walk);
  const call = centre(targets.call);
  const moves: Array<{ t0: number; t1: number; from: [number, number]; to: [number, number] }> = [
    { t0: T_CHAT - 2.1, t1: T_CHAT - 0.6, from: [760, 520], to: chat },
    { t0: T_PEOPLE - 1.8, t1: T_PEOPLE - 0.5, from: chat, to: people },
    { t0: T_FLOOR - 2.4, t1: T_FLOOR - 0.8, from: people, to: walk },
  ];
  const clicks = [T_CHAT - 0.4, T_PEOPLE - 0.3, T_FLOOR - 0.5];
  // The first tour, from the floor to People and back.
  const tour = Math.min(span(t, T_CHAT - 2.4, T_CHAT - 2.1), 1 - span(t, T_FLOOR + 0.2, T_FLOOR + 0.6));
  // The second, from the edge of the floor to the video button beside Jack.
  let second = 0;
  if (arrived !== null) {
    const from: [number, number] = [call[0] + 260, call[1] + 180];
    moves.push({ t0: arrived + 0.5, t1: arrived + CLICK - 0.2, from, to: call });
    clicks.push(arrived + CLICK);
    second = Math.min(span(t, arrived + 0.35, arrived + 0.6), 1 - span(t, arrived + CALL + 0.6, arrived + CALL + 1.0));
  }
  const opacity = Math.max(tour, second);
  if (opacity <= 0) return null;
  let at = moves[0].from;
  for (const move of moves) {
    if (t >= move.t0 - (move === moves[3] ? 0.5 : 0)) {
      const k = ease(span(t, move.t0, move.t1));
      at = [move.from[0] + (move.to[0] - move.from[0]) * k, move.from[1] + (move.to[1] - move.from[1]) * k];
    }
  }
  const press = Math.max(...clicks.map((c) => 1 - Math.min(1, Math.abs(t - c) / 0.14)), 0);
  const ring = clicks.map((c) => span(t, c, c + 0.45)).find((v) => v > 0 && v < 1) ?? 0;
  return (
    <div className="pointer-events-none fixed left-0 top-0 z-50" style={{ transform: `translate(${at[0]}px, ${at[1]}px)`, opacity }}>
      {ring > 0 && (
        <span className="absolute size-10 rounded-full border-2 border-white/50" style={{ left: -20, top: -20, transform: `scale(${0.4 + ring * 0.9})`, opacity: 1 - ring }} />
      )}
      <svg width="22" height="26" viewBox="0 0 22 26" style={{ transform: `scale(${1 - press * 0.12})`, transformOrigin: "2px 2px", filter: "drop-shadow(0 2px 3px rgb(0 0 0 / 0.45))" } as CSSProperties}>
        <path d="M2 2 L2 21 L7 16.5 L10.5 24 L13.8 22.6 L10.4 15.2 L17 15.2 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function EndCard({ opacity }: { opacity: number }) {
  if (opacity <= 0) return null;
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background font-(family-name:--font-body)" style={{ opacity }}>
      <div className="flex items-center gap-3.5" style={{ transform: `translateY(${(1 - opacity) * 10}px)` }}>
        <Logo size={64} />
        <span className="text-[56px] font-bold tracking-[-0.03em]">TinyFloor</span>
      </div>
      <p className="mt-5 text-[24px] text-muted-foreground">Your team, one floor away.</p>
      <p className="mt-10 text-[20px] font-semibold text-foreground/80">tinyfloor.com</p>
    </div>
  );
}
