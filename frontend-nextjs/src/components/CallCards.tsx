"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { useTranslations } from "next-intl";
import { Maximize2, MicOff, Minimize2, MonitorUp } from "lucide-react";
import { useCall } from "@/lib/useCall";
import { callManager } from "@/lib/CallManager";
import { useSpeaking } from "@/lib/useSpeaking";
import { GUIDE_ID } from "@/lib/tutorial";
import { CallStream } from "./CallStream";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/lib/prefs";

interface Tile {
  key: string;
  /** Who and what this card shows, so the call knows which video to send in high quality. */
  id?: string;
  screen?: boolean;
  name: string;
  stream: MediaStream | null;
  mic: boolean;
  camera: boolean;
  connected: boolean;
  self?: boolean;
  badge?: string;
}

/** Rows each headcount wraps into: two cards a row on phones, three from sm up. */
const ROWS = [
  "[--rows:1]",
  "[--rows:1]",
  "[--rows:2] sm:[--rows:1]",
  "[--rows:2]",
  "[--rows:3] sm:[--rows:2]",
  "[--rows:3] sm:[--rows:2]",
  "[--rows:4] sm:[--rows:3]",
  "[--rows:4] sm:[--rows:3]",
  "[--rows:5] sm:[--rows:3]",
];

/**
 * A card is as wide as a full row of them allows, but never so tall that the
 * grid runs past the top part of the screen; the grid is exactly one full row
 * wide, so a short last row wraps and centres on its own.
 */
const GRID = {
  "--card":
    "min(20rem, (100vw - 2rem - (var(--cols) - 1) * 0.75rem) / var(--cols), (40vh - (var(--rows) - 1) * 0.75rem) / var(--rows) * 16 / 9)",
  maxWidth: "calc(var(--cols) * var(--card) + (var(--cols) - 1) * 0.75rem)",
} as CSSProperties;

/** Swaps the layout inside a view transition where the browser has one, so a card grows into place. */
function transition(update: () => void) {
  if (document.startViewTransition) {
    document.startViewTransition(() => flushSync(update));
  } else {
    update();
  }
}

/**
 * Everyone on the call or at the table, you first and then in the order they
 * joined, with a shared screen right after the person sharing it. Clicking a
 * card enlarges it and sets the others aside; clicking it again puts it back.
 */
export default function CallCards() {
  const t = useTranslations("call");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const {
    meeting,
    peers,
    localStream,
    screenStream,
    micEnabled,
    cameraEnabled,
    speakerEnabled,
  } = useCall();
  const [focused, setFocused] = useState<string | null>(null);

  const tiles: Tile[] = [
    {
      key: "self",
      id: user?.id,
      name: tc("you"),
      stream: localStream,
      mic: micEnabled,
      camera: cameraEnabled,
      connected: true,
      self: true,
    },
    ...(screenStream
      ? [
          {
            key: "self-screen",
            name: t("yourScreen"),
            stream: screenStream,
            mic: false,
            camera: true,
            connected: true,
            self: true,
            screen: true,
          },
        ]
      : []),
    ...peers.flatMap((peer) => [
      {
        key: peer.id,
        id: peer.id,
        name: peer.name,
        stream: peer.stream,
        mic: peer.mic,
        camera: peer.camera,
        connected: peer.connected,
        badge: peer.id === GUIDE_ID ? t("tutorial") : undefined,
      },
      ...(peer.screen && peer.screenStream
        ? [
            {
              key: `${peer.id}-screen`,
              id: peer.id,
              name: t("screenOf", { name: peer.name }),
              stream: peer.screenStream,
              mic: false,
              camera: true,
              connected: peer.connected,
              screen: true,
            },
          ]
        : []),
    ]),
  ];

  const focusedTile = tiles.find((tile) => tile.key === focused);

  // Only the enlarged card is worth receiving in high quality.
  const focusedId = focusedTile?.id;
  const focusedScreen = !!focusedTile?.screen;
  useEffect(() => {
    callManager.setFocus(focusedId ? { id: focusedId, kind: focusedScreen ? "screen" : "camera" } : null);
  }, [focusedId, focusedScreen, peers]);

  useEffect(() => {
    if (!focusedTile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") transition(() => setFocused(null));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedTile]);

  if (!meeting && !peers.length) return null;

  return (
    <div
      className={`absolute inset-x-0 top-16 sm:top-[4.75rem] z-40 px-3 sm:px-4 pointer-events-none ${
        focusedTile ? "bottom-28 md:px-10 flex items-center justify-center" : ""
      }`}
    >
      <div
        className={
          focusedTile
            ? "contents"
            : `mx-auto flex flex-wrap justify-center gap-3 [--cols:2] sm:[--cols:3] ${
                ROWS[Math.min(tiles.length, ROWS.length) - 1]
              }`
        }
        style={focusedTile ? undefined : GRID}
      >
        {tiles.map((tile) => (
          <CallCard
            key={tile.key}
            tile={tile}
            muted={!!tile.self || !!tile.screen || !speakerEnabled}
            focused={tile === focusedTile}
            hidden={!!focusedTile && tile !== focusedTile}
            label={tile === focusedTile ? t("shrink") : t("enlarge")}
            micOff={t("micOff")}
            onToggle={() =>
              transition(() =>
                setFocused((current) => (current === tile.key ? null : tile.key)),
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function CallCard({
  tile,
  muted,
  focused,
  hidden,
  label,
  micOff,
  onToggle,
}: {
  tile: Tile;
  muted: boolean;
  focused: boolean;
  hidden: boolean;
  label: string;
  micOff: string;
  onToggle: () => void;
}) {
  const { mirrorVideo: mirror } = usePrefs();
  const speaking = useSpeaking(
    tile.stream,
    !tile.screen && tile.mic && tile.connected,
  );

  return (
    <button
      type="button"
      hidden={hidden}
      onClick={onToggle}
      title={label}
      aria-label={`${tile.name}. ${label}`}
      aria-pressed={focused}
      style={{ viewTransitionName: `tile-${tile.key}` }}
      className={`group cursor-pointer pointer-events-auto relative block shrink-0 aspect-video overflow-hidden ring-2 transition-shadow duration-200 ${
        focused
          ? "w-[min(100%,calc((100dvh-14rem)*16/9))] sm:w-[min(100%,calc((100dvh-12.5rem)*16/9))] rounded-3xl shadow-2xl"
          : "w-[var(--card)] rounded-2xl shadow-lg hover:shadow-xl"
      } ${
        tile.screen
          ? "bg-[#1c1c1e] ring-ok"
          : `bg-card ${speaking ? "ring-brand" : "ring-card/80"}`
      }`}
    >
      <CallStream
        stream={tile.stream}
        muted={muted}
        hidden={!tile.camera}
        seed={tile.id ?? tile.key}
        mirror={!!tile.self && !tile.screen && mirror}
        fit={tile.screen ? "contain" : "cover"}
      />
      {!tile.connected && (
        <div className="absolute inset-0 bg-card flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {tile.badge && (
        <span className="absolute top-2 start-2 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm">
          {tile.badge}
        </span>
      )}
      <span
        aria-hidden="true"
        className={`absolute top-2 end-2 w-7 h-7 rounded-full bg-card/90 backdrop-blur-sm text-foreground shadow-sm flex items-center justify-center transition-opacity duration-200 ${
          focused ? "opacity-70 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
        }`}
      >
        {focused ? (
          <Minimize2 className="w-3.5 h-3.5" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5" />
        )}
      </span>
      <span
        className={`absolute start-2 bottom-2 max-w-[calc(100%-1rem)] flex items-center gap-1.5 rounded-full backdrop-blur-sm px-2.5 py-1 text-[12px] font-semibold shadow-sm ${
          tile.screen
            ? "bg-ok text-white"
            : "bg-card/90 text-foreground"
        }`}
      >
        {tile.screen && (
          <MonitorUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        {!tile.screen && !tile.mic && (
          <MicOff
            className="w-3.5 h-3.5 shrink-0 text-brand"
            aria-label={micOff}
          />
        )}
        <span className="truncate">{tile.name}</span>
      </span>
    </button>
  );
}
