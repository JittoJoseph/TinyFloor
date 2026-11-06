import { test } from "node:test";
import assert from "node:assert/strict";
import { follow, startFollowing, type Heard } from "./musicFollow.ts";

const LIST = "spotify:playlist:37i9dQZF1DWWQRwui0ExPn";
const songs = ["spotify:track:aaaaaaaaaaaaaaaaaaaaaa", "spotify:track:bbbbbbbbbbbbbbbbbbbbbb", "spotify:track:cccccccccccccccccccccc"];

function run(updates: Heard[]) {
  let state = startFollowing();
  const moves: number[] = [];
  for (const update of updates) {
    const next = follow(state, update, songs);
    if (next.moved) moves.push(next.state.index);
    state = next.state;
  }
  return { state, moves };
}

test("signed out, it follows the songs the player names", () => {
  const { state, moves } = run([
    { playingURI: songs[0], duration: 30000, position: 0 },
    { playingURI: songs[0], duration: 30000, position: 29600 },
    { playingURI: songs[1], duration: 28000, position: 0 },
    { playingURI: songs[1], duration: 28000, position: 5000 },
  ]);
  assert.deepEqual(moves, [1]);
  assert.equal(state.index, 1);
});

test("signed in, the player names only the playlist: a new length is the next song", () => {
  const { state, moves } = run([
    { playingURI: LIST, duration: 0, position: 0 },
    { playingURI: LIST, duration: 214000, position: 1000 },
    { playingURI: LIST, duration: 214000, position: 213800 },
    { playingURI: LIST, duration: 187000, position: 200 },
    { playingURI: LIST, duration: 187000, position: 90000 },
  ]);
  assert.deepEqual(moves, [1]);
  assert.equal(state.index, 1);
});

test("signed in, two songs of the same length: going back to the start is the next song", () => {
  const { state, moves } = run([
    { playingURI: LIST, duration: 200000, position: 1000 },
    { playingURI: LIST, duration: 200000, position: 199500 },
    { playingURI: LIST, duration: 200000, position: 300 },
  ]);
  assert.deepEqual(moves, [1]);
  assert.equal(state.index, 1);
});

test("seeking back a little, or pausing and going on, is the same song", () => {
  const { moves } = run([
    { playingURI: LIST, duration: 200000, position: 60000 },
    { playingURI: LIST, duration: 200000, position: 58000 },
    { playingURI: LIST, duration: 200000, position: 58000 },
    { playingURI: LIST, duration: 200000, position: 61000 },
  ]);
  assert.deepEqual(moves, []);
});

test("the player's first report, before a length is known, isn't a move", () => {
  const { moves } = run([
    { playingURI: "", duration: 0, position: 0 },
    { playingURI: LIST, duration: 214000, position: 0 },
  ]);
  assert.deepEqual(moves, []);
});
