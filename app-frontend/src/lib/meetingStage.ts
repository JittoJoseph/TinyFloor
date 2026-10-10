import type { VideoQuality } from "@shared/messages";
import type { MeetingPeer, VideoWant } from "./SfuMeeting";

/**
 * Where the meeting is being looked at, which decides how much video is worth
 * receiving (docs/12-meetings.md):
 *
 * - `stage`: the Meetings page on a computer. The four most recent speakers.
 * - `phone`: the Meetings page on a phone. Two, small.
 * - `mini`: the card over the floor or another view. Whoever is talking, small.
 * - `hidden`: the tab isn't showing. Voices only.
 */
export type StageMode = "stage" | "phone" | "mini" | "hidden";

/** Someone, or someone's shared screen, kept big on the stage by your choice (yours alone: nobody else sees it). */
export interface Pin {
  id: string;
  kind: "camera" | "screen";
}

export interface Stage {
  /** Whose cameras are shown, most relevant first. */
  cameras: string[];
  /** Whose shared screen fills the stage, if anyone's. */
  screen: string | null;
  /** What you pinned, while it's still there to show. */
  pinned: Pin | null;
  /** What to receive, and how sharp. */
  videos: VideoWant[];
}

export const EMPTY_STAGE: Stage = { cameras: [], screen: null, pinned: null, videos: [] };

/** A new speaker takes someone's place only once they have spoken this much more recently. */
const SWAP_AFTER_MS = 3000;

const LIMIT: Record<StageMode, { cameras: number; withScreen: number }> = {
  stage: { cameras: 4, withScreen: 3 },
  phone: { cameras: 2, withScreen: 1 },
  mini: { cameras: 1, withScreen: 0 },
  hidden: { cameras: 0, withScreen: 0 },
};

/**
 * Chooses whose video to receive: what you pinned first, then a shared screen,
 * then cameras by who spoke most recently, the way Meet does. Someone already
 * shown keeps their place until a newcomer has clearly spoken since, so tiles
 * don't flicker between two people trading words.
 */
export function chooseStage({
  peers,
  spokeAt,
  mode,
  previous,
  pin = null,
}: {
  peers: MeetingPeer[];
  spokeAt: ReadonlyMap<string, number>;
  mode: StageMode;
  previous: Stage;
  pin?: Pin | null;
}): Stage {
  const limit = LIMIT[mode];
  const onStage = mode === "stage" || mode === "phone";
  const sharing = peers.filter((peer) => peer.screen);
  // A pin holds while there's something to pin: they're still here (and still sharing, for a screen).
  // It holds whether or not the stage is showing, so the layout is the same when you come back.
  const pinned = pin && peers.some((peer) => peer.id === pin.id && (pin.kind === "camera" || peer.screen)) ? pin : null;
  const screen = onStage
    ? pinned?.kind === "screen"
      ? pinned.id
      : ((sharing.find((peer) => peer.id === previous.screen) ?? sharing[sharing.length - 1])?.id ?? null)
    : null;

  const count = screen ? limit.withScreen : limit.cameras;
  const score = (id: string) => spokeAt.get(id) ?? 0;
  const candidates = peers.filter((peer) => peer.cameraOn).map((peer) => peer.id);
  const ranked = [...candidates].sort((a, b) => score(b) - score(a));
  // A pinned camera is always received; the rest share what's left.
  const pinnedCamera = pinned?.kind === "camera" && candidates.includes(pinned.id) ? pinned.id : null;
  let chosen = pinnedCamera ? [pinnedCamera, ...ranked.filter((id) => id !== pinnedCamera)].slice(0, count) : ranked.slice(0, count);

  // Hold on to whoever was shown, unless someone has clearly taken the floor.
  for (const kept of previous.cameras) {
    if (!candidates.includes(kept) || chosen.includes(kept) || !chosen.length || chosen.length < count) continue;
    const swappable = chosen.filter((id) => id !== pinnedCamera);
    if (!swappable.length) continue;
    const weakest = swappable.reduce((low, id) => (score(id) < score(low) ? id : low), swappable[0]);
    if (score(weakest) - score(kept) < SWAP_AFTER_MS) chosen = chosen.map((id) => (id === weakest ? kept : id));
  }
  // Newly shown people join at the end, so the ones already there don't move.
  const cameras = [
    ...previous.cameras.filter((id) => chosen.includes(id)),
    ...chosen.filter((id) => !previous.cameras.includes(id)),
  ];

  // Whoever spoke last is the one worth seeing sharper; a pinned camera is the big one, so it's sharpest.
  const top = cameras.reduce<string | null>((best, id) => (best === null || score(id) > score(best) ? id : best), null);
  const videos: VideoWant[] = cameras.map((userId) => ({
    userId,
    kind: "camera",
    quality: pinnedCamera
      ? userId === pinnedCamera && mode === "stage"
        ? "high"
        : "low"
      : cameraQuality(mode, cameras.length, userId === top, !!screen),
  }));
  // A screen in the column beside a pinned camera needn't be sharp.
  if (screen) videos.push({ userId: screen, kind: "screen", quality: pinnedCamera ? "low" : "high" });
  return { cameras, screen, pinned, videos };
}

/**
 * The sharpest each tile needs. One speaker fills the stage; two sit side by
 * side; with more, the one talking is medium and the rest small. A shared
 * screen takes the stage, and cameras shrink to a strip beside it.
 */
function cameraQuality(mode: StageMode, shown: number, top: boolean, screen: boolean): VideoQuality {
  if (mode !== "stage") return mode === "phone" && shown === 1 && !screen ? "medium" : "low";
  if (screen) return "low";
  if (shown === 1) return "high";
  if (shown === 2) return "medium";
  return top ? "medium" : "low";
}
