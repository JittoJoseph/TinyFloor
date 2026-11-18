/**
 * Which of a list's songs Spotify's player is on, from what it says about
 * itself. Signed out, it names each song (`playingURI` "spotify:track:…");
 * signed in, it names only what it was given (the playlist), so a new song is
 * told by its length changing or its place going back to the start, and which
 * song it is by its length: the next one in the list that long, or, when the
 * player skipped some (a song it can't play here) or plays another order, the
 * first that long from the top. A length no song of the list has is a song
 * it can't name (index -1): better the list's name than the wrong song's.
 */
export interface Following {
  /** The song it's on, as an index into the list. */
  index: number;
  /** The last song it named, when it names them. */
  uri: string;
  duration: number;
  position: number;
}

export interface Heard {
  playingURI?: string;
  duration: number;
  position: number;
}

/** Back from more than this near the end to the start: the next song. */
const RESTART_MS = 3000;
/** A song this close to a list song's length is that song: the two are rounded differently. */
const SAME_LENGTH_MS = 1500;

export function startFollowing(): Following {
  return { index: 0, uri: "", duration: 0, position: 0 };
}

/**
 * The state after an update, and whether the player went on to another song:
 * by name (`uri`, a track it named), or by the list's next one (`index`).
 */
export function follow(state: Following, update: Heard, uris: string[], lengths: number[] = []): { state: Following; moved: boolean } {
  const named = update.playingURI?.startsWith("spotify:track:") ? update.playingURI : "";
  if (named) {
    const moved = !!state.uri && named !== state.uri;
    const at = uris.indexOf(named);
    return {
      state: { index: at >= 0 ? at : moved ? state.index + 1 : state.index, uri: named, duration: update.duration, position: update.position },
      moved,
    };
  }
  // Unnamed: a new length, or back to the start from well into the song. The length it gives for a song wavers
  // by a few milliseconds from one word to the next (341054, 341102, 341055), which isn't a new song.
  const known = state.duration > 0 && update.duration > 0;
  let moved =
    known &&
    (Math.abs(update.duration - state.duration) > SAME_LENGTH_MS ||
      (state.position - update.position > RESTART_MS && update.position < RESTART_MS));
  let index = state.index;
  const measured = lengths.some((length) => length > 0);
  if (moved) {
    index = measured ? byLength(update.duration, lengths, state.index) : state.index < 0 ? -1 : state.index + 1;
  } else if (measured && !state.duration && update.duration > 0 && !sameLength(lengths[state.index], update.duration)) {
    // Its first length isn't the song it was thought to start with: it started on another.
    index = byLength(update.duration, lengths, state.index - 1);
    moved = index !== state.index;
  }
  return {
    state: { index, uri: state.uri, duration: update.duration || state.duration, position: update.position },
    moved,
  };
}

function sameLength(length: number | undefined, duration: number): boolean {
  return !!length && Math.abs(length - duration) <= SAME_LENGTH_MS;
}

/** The first song that long after `after`, going round to the top; -1 when none is. */
function byLength(duration: number, lengths: number[], after: number): number {
  for (let step = 1; step <= lengths.length; step++) {
    const index = (((after + step) % lengths.length) + lengths.length) % lengths.length;
    if (sameLength(lengths[index], duration)) return index;
  }
  return -1;
}
