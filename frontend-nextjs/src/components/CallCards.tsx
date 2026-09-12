"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { MicOff } from "lucide-react";
import type { CallPeer } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useSpeaking } from "@/lib/useSpeaking";
import { GUIDE_ID } from "@/lib/tutorial";
import { CallStream } from "./CallStream";

type Tile = Omit<CallPeer, "stream"> & {
  stream: MediaStream | null;
  self?: boolean;
};

/** Rows each headcount wraps into: two cards a row on phones, three from sm up. */
const ROWS = [
  "[--rows:1]",
  "[--rows:1]",
  "[--rows:2] sm:[--rows:1]",
  "[--rows:2]",
  "[--rows:3] sm:[--rows:2]",
  "[--rows:3] sm:[--rows:2]",
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

/** Everyone on the call or at the table, you first and then in the order they joined. */
export default function CallCards() {
  const t = useTranslations("call");
  const tc = useTranslations("common");
  const {
    meeting,
    peers,
    localStream,
    micEnabled,
    cameraEnabled,
    speakerEnabled,
  } = useCall();

  if (!meeting && !peers.length) return null;

  const tiles: Tile[] = [
    {
      id: "self",
      name: tc("you"),
      stream: localStream,
      mic: micEnabled,
      camera: cameraEnabled,
      connected: true,
      self: true,
    },
    ...peers,
  ];

  return (
    <div className="fixed inset-x-0 top-[8.5rem] sm:top-[5.5rem] z-40 px-4 pointer-events-none">
      <div
        className={`mx-auto flex flex-wrap justify-center gap-3 [--cols:2] sm:[--cols:3] ${
          ROWS[Math.min(tiles.length, ROWS.length) - 1]
        }`}
        style={GRID}
      >
        {tiles.map((tile) => (
          <CallCard
            key={tile.id}
            tile={tile}
            muted={!!tile.self || !speakerEnabled}
            micOff={t("micOff")}
            badge={tile.id === GUIDE_ID ? t("tutorial") : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function CallCard({
  tile,
  muted,
  micOff,
  badge,
}: {
  tile: Tile;
  muted: boolean;
  micOff: string;
  badge?: string;
}) {
  const speaking = useSpeaking(tile.stream, tile.mic && tile.connected);

  return (
    <div
      className={`relative w-[var(--card)] aspect-video rounded-2xl overflow-hidden bg-[#fbfbf9] shadow-lg ring-2 transition-shadow duration-200 ${
        speaking ? "ring-[#ff4e00]" : "ring-white/80"
      }`}
    >
      <CallStream
        stream={tile.stream}
        muted={muted}
        hidden={!tile.camera}
        initial={tile.name}
      />
      {!tile.connected && (
        <div className="absolute inset-0 bg-[#fbfbf9] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {badge && (
        <span className="absolute top-2 start-2 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-[var(--color-braun-text)] shadow-sm">
          {badge}
        </span>
      )}
      <span className="absolute start-2 bottom-2 max-w-[calc(100%-1rem)] flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-[var(--color-braun-text)] shadow-sm">
        {!tile.mic && (
          <MicOff
            className="w-3.5 h-3.5 shrink-0 text-[#ff4e00]"
            aria-label={micOff}
          />
        )}
        <span className="truncate">{tile.name}</span>
      </span>
    </div>
  );
}
