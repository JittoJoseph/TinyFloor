/**
 * Which of a list's songs Spotify's player is on, from what it says about
 * itself. Signed out, it names each song (`playingURI` "spotify:track:…");
 * signed in, it names only what it was given (the playlist), so a new song is
 * told by its length changing or its place going back to the start, and the
 * list is followed in order, the order its player plays it in.
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

export function startFollowing(): Following {
  return { index: 0, uri: "", duration: 0, position: 0 };
}

/**
 * The state after an update, and whether the player went on to another song:
 * by name (`uri`, a track it named), or by the list's next one (`index`).
 */
export function follow(state: Following, update: Heard, uris: string[]): { state: Following; moved: boolean } {
  const named = update.playingURI?.startsWith("spotify:track:") ? update.playingURI : "";
  if (named) {
    const moved = !!state.uri && named !== state.uri;
    const at = uris.indexOf(named);
    return {
      state: { index: at >= 0 ? at : moved ? state.index + 1 : state.index, uri: named, duration: update.duration, position: update.position },
      moved,
    };
  }
  // Unnamed: a new length, or back to the start from well into the song.
  const known = state.duration > 0 && update.duration > 0;
  const moved =
    known && (update.duration !== state.duration || (state.position - update.position > RESTART_MS && update.position < RESTART_MS));
  return {
    state: { index: moved ? state.index + 1 : state.index, uri: state.uri, duration: update.duration || state.duration, position: update.position },
    moved,
  };
}
