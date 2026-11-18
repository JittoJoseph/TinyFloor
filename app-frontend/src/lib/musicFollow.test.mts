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

function runMeasured(updates: Heard[], lengths: number[]) {
  let state = startFollowing();
  const moves: number[] = [];
  for (const update of updates) {
    const next = follow(state, update, songs, lengths);
    if (next.moved) moves.push(next.state.index);
    state = next.state;
  }
  return { state, moves };
}

test("signed in, a song the player can't play is skipped: the song is told by its length", () => {
  // The second song isn't playable here, so the player goes from the first straight to the third.
  const { state, moves } = runMeasured(
    [
      { playingURI: LIST, duration: 214000, position: 1000 },
      { playingURI: LIST, duration: 214000, position: 213800 },
      { playingURI: LIST, duration: 187000, position: 200 },
    ],
    [214000, 251000, 187000],
  );
  assert.deepEqual(moves, [2]);
  assert.equal(state.index, 2);
});

test("signed in, a list that starts on another song is named by that song's length", () => {
  const { state, moves } = runMeasured([{ playingURI: LIST, duration: 251400, position: 500 }], [214000, 251000, 187000]);
  assert.deepEqual(moves, [1]);
  assert.equal(state.index, 1);
});

test("signed in, a length none of the list's songs has is a song it can't name", () => {
  const { state, moves } = runMeasured(
    [
      { playingURI: LIST, duration: 214000, position: 1000 },
      { playingURI: LIST, duration: 333000, position: 300 },
    ],
    [214000, 251000, 187000],
  );
  assert.deepEqual(moves, [-1]);
  assert.equal(state.index, -1);
});

test("signed in, lengths within a second and a half are the same song", () => {
  const { moves } = runMeasured(
    [
      { playingURI: LIST, duration: 213200, position: 1000 },
      { playingURI: LIST, duration: 187900, position: 300 },
    ],
    [214000, 187000, 251000],
  );
  assert.deepEqual(moves, [1]);
});

test("signed in, the length wavering by a few milliseconds is the same song", () => {
  // As Spotify's player reports it: 341054, 341102, 341055 for one song, then 309640, 309687 for the next.
  const { state, moves } = runMeasured(
    [
      { playingURI: LIST, duration: 341054, position: 500 },
      { playingURI: LIST, duration: 341102, position: 800 },
      { playingURI: LIST, duration: 341055, position: 1100 },
      { playingURI: LIST, duration: 309640, position: 300 },
      { playingURI: LIST, duration: 309687, position: 600 },
      { playingURI: LIST, duration: 309640, position: 900 },
    ],
    [341054, 309640, 309100],
  );
  assert.deepEqual(moves, [1]);
  assert.equal(state.index, 1);
});

test("without lengths, a wavering length isn't the next song either", () => {
  const { moves } = run([
    { playingURI: LIST, duration: 341054, position: 500 },
    { playingURI: LIST, duration: 341102, position: 800 },
    { playingURI: LIST, duration: 341055, position: 1100 },
  ]);
  assert.deepEqual(moves, []);
});
