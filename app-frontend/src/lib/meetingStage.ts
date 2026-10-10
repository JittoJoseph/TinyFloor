import type { VideoQuality } from "@shared/messages";
import type { VideoWant } from "./SfuMeeting";

/** Someone else in the meeting, as far as the stage cares: whether there's a camera or a screen to show. */
export interface StagePerson {
  id: string;
  cameraOn: boolean;
  screen: boolean;
}

/**
 * Where the meeting is being looked at, which decides how much of it is shown
 * (docs/12-meetings.md):
 *
 * - `stage`: the Meetings page on a computer. One big card, and a column of
 *   three beside it (you are drawn there too, from your own camera).
 * - `phone`: the Meetings page on a phone. The big card, and two under it.
 * - `mini`: the card over the floor or another view. The big card's person, small.
 * - `hidden`: the tab isn't showing. Voices only.
 */
export type StageMode = "stage" | "phone" | "mini" | "hidden";

/** Someone, or someone's shared screen, kept big by your choice (yours alone: nobody else sees it). */
export interface Pin {
  id: string;
  kind: "camera" | "screen";
}

/** What fills the big card: someone (their camera or their circle), or a shared screen. */
export interface Focus {
  id: string;
  kind: "camera" | "screen";
}

export interface Stage {
  /** The big card. Null with nobody else here: then it's you. */
  focus: Focus | null;
  /** Since when the big card has shown who it shows, so it doesn't flick between two people. */
  focusSince: number;
  /** Who sits in the column beside it, besides you, in the order they took their places. */
  side: string[];
  /** How many more are in the meeting than the stage shows. */
  more: number;
  /** What you pinned, while it's still there to show. */
  pinned: Pin | null;
  /** What to receive, and how sharp: never more than the cards on screen. */
  videos: VideoWant[];
  /** When to look again: a change of speaker waiting out its pause. */
  recheckIn: number | null;
}

export const EMPTY_STAGE: Stage = { focus: null, focusSince: 0, side: [], more: 0, pinned: null, videos: [], recheckIn: null };

/** Others in the column beside the big card, at most. One goes to "+n more" when there are more. */
const SIDE: Record<StageMode, number> = { stage: 3, phone: 2, mini: 0, hidden: 3 };
/** The big card moves to a new speaker only once the one it shows has been quiet this long... */
const QUIET_MS = 1200;
/** ...and has been shown at least this long. */
const DWELL_MS = 2500;
/** Someone in the column gives up their place only to someone who has spoken this much more recently. */
const SWAP_MS = 3000;

const QUALITY: Record<StageMode, { focus: VideoQuality; screen: VideoQuality }> = {
  stage: { focus: "high", screen: "high" },
  phone: { focus: "medium", screen: "high" },
  mini: { focus: "low", screen: "low" },
  hidden: { focus: "low", screen: "low" },
};

/**
 * Chooses what the stage shows, the way Meet's spotlight does, and so whose
 * video to receive: only what's on screen, which is a handful of streams
 * however big the meeting. The big card is, in order: what you pinned, a
 * shared screen, whoever is talking (once the one before has paused), or,
 * before anyone has spoken, the first on camera, else the first to arrive.
 * The column holds the people who spoke most recently; someone already there
 * keeps their place until a newcomer has clearly spoken since, so nobody
 * jumps about while two people trade words. You are never received: your
 * card is your own camera.
 */
export function chooseStage({
  peers,
  speaking,
  spokeAt,
  mode,
  previous,
  pin = null,
  now = Date.now(),
}: {
  /** Everyone else in the meeting, in the order they came. */
  peers: StagePerson[];
  /** Who is talking right now. */
  speaking: ReadonlySet<string>;
  /** When each person last started or stopped talking. */
  spokeAt: ReadonlyMap<string, number>;
  mode: StageMode;
  previous: Stage;
  pin?: Pin | null;
  now?: number;
}): Stage {
  if (!peers.length) return { ...EMPTY_STAGE, pinned: null };
  const here = new Set(peers.map((peer) => peer.id));
  const heard = (id: string) => (speaking.has(id) ? now : (spokeAt.get(id) ?? 0));
  const order = new Map(peers.map((peer, index) => [peer.id, index]));
  const camera = new Set(peers.filter((peer) => peer.cameraOn).map((peer) => peer.id));
  const sharing = peers.filter((peer) => peer.screen).map((peer) => peer.id);

  // A pin holds while there's something to pin: they're still here (and still sharing, for a screen).
  const pinned = pin && here.has(pin.id) && (pin.kind === "camera" || sharing.includes(pin.id)) ? pin : null;

  let recheckIn: number | null = null;
  let focus: Focus;
  if (pinned) {
    focus = pinned;
  } else if (sharing.length) {
    const kept = previous.focus?.kind === "screen" && sharing.includes(previous.focus.id) ? previous.focus.id : null;
    focus = { kind: "screen", id: kept ?? sharing[sharing.length - 1] };
  } else {
    const loudest = peers.reduce<string | null>((best, peer) => (heard(peer.id) > (best ? heard(best) : 0) ? peer.id : best), null);
    const shown = previous.focus?.kind === "camera" && here.has(previous.focus.id) ? previous.focus.id : null;
    const first = peers.find((peer) => camera.has(peer.id))?.id ?? peers[0].id;
    if (!shown) {
      focus = { kind: "camera", id: loudest ?? first };
    } else if (loudest && loudest !== shown && heard(loudest) > heard(shown)) {
      const quietFor = speaking.has(shown) ? 0 : now - heard(shown);
      const shownFor = now - previous.focusSince;
      if (quietFor >= QUIET_MS && shownFor >= DWELL_MS) focus = { kind: "camera", id: loudest };
      else {
        focus = { kind: "camera", id: shown };
        // Look again once the pause is long enough, unless they start talking again first.
        if (!speaking.has(shown)) recheckIn = Math.max(QUIET_MS - quietFor, DWELL_MS - shownFor, 50);
      }
    } else {
      focus = { kind: "camera", id: shown };
    }
  }
  const sameFocus = previous.focus?.id === focus.id && previous.focus?.kind === focus.kind;

  // The column: everyone but the person in the big card (a screen's sharer can sit here).
  const candidates = peers.map((peer) => peer.id).filter((id) => !(focus.kind === "camera" && id === focus.id));
  const room = SIDE[mode] && candidates.length > SIDE[mode] ? SIDE[mode] - 1 : SIDE[mode];
  const ranked = [...candidates].sort(
    (a, b) => heard(b) - heard(a) || Number(camera.has(b)) - Number(camera.has(a)) || order.get(a)! - order.get(b)!,
  );
  let chosen = ranked.slice(0, room);
  // Whoever was already there stays, unless someone has clearly spoken since.
  for (const kept of previous.side) {
    if (!candidates.includes(kept) || chosen.includes(kept) || chosen.length < room || !chosen.length) continue;
    const weakest = chosen.reduce((low, id) => (heard(id) < heard(low) ? id : low), chosen[0]);
    if (heard(weakest) - heard(kept) < SWAP_MS) chosen = chosen.map((id) => (id === weakest ? kept : id));
  }
  // Newcomers join at the end, so the ones already there don't move.
  const side = [...previous.side.filter((id) => chosen.includes(id)), ...chosen.filter((id) => !previous.side.includes(id))];
  const more = candidates.length - side.length;

  const quality = QUALITY[mode];
  const videos: VideoWant[] = [];
  // Out of sight, the stage is still worked out, for coming back to; only the video stops.
  if (mode === "hidden") return { focus, focusSince: sameFocus ? previous.focusSince : now, side, more, pinned, videos, recheckIn };
  if (focus.kind === "screen") videos.push({ userId: focus.id, kind: "screen", quality: quality.screen });
  else if (camera.has(focus.id)) videos.push({ userId: focus.id, kind: "camera", quality: quality.focus });
  for (const id of side) if (camera.has(id)) videos.push({ userId: id, kind: "camera", quality: "low" });

  return { focus, focusSince: sameFocus ? previous.focusSince : now, side, more, pinned, videos, recheckIn };
}

/** Whether two stages show the same thing, so nothing needs redrawing or asking for. */
export function sameStage(a: Stage, b: Stage): boolean {
  return (
    a.focus?.id === b.focus?.id &&
    a.focus?.kind === b.focus?.kind &&
    a.more === b.more &&
    a.pinned?.id === b.pinned?.id &&
    a.pinned?.kind === b.pinned?.kind &&
    a.side.length === b.side.length &&
    a.side.every((id, index) => b.side[index] === id) &&
    a.videos.length === b.videos.length &&
    a.videos.every((video, index) => {
      const other = b.videos[index];
      return other.userId === video.userId && other.kind === video.kind && other.quality === video.quality;
    })
  );
}
