import { CAST } from "@/components/home/previews/Frame";
import type { Sitter, Stander } from "./FloorScene";

/*
 * The floor's everyday moments, placed on the real map in tiles. Everyone
 * holds their spot, idling the way characters do in the app: a scene that
 * holds still costs the browser next to nothing to draw. The map's
 * rooms: the meeting room top left (table at 3-9 by 7-9), a private office
 * under it, the open hall to the right with four rows of desks, and a lounge
 * in the hall's top right with the sofa and the speaker.
 */

const [emma, jack, olivia, sam, lily, noah] = CAST;
const ryan = { id: "ryan-4", name: "Ryan", character: "Ash" };
const grace = { id: "grace-9", name: "Grace", character: "Alex" };

export const PEOPLE = { emma, jack, olivia, sam, lily, noah, ryan, grace };

type Scene = { view: [number, number, number, number]; standing?: Stander[]; sitting?: Sitter[] };

const person = ({ name, character }: { name: string; character: string }) => ({ name, character });

/** The hall on an ordinary day: a few at their desks, two chatting in the aisle, a couple more about. */
export const HALL: Scene = {
  view: [15, 3, 32, 20],
  sitting: [
    { ...person(sam), chair: [20, 11], status: "busy" },
    { ...person(noah), chair: [26, 8], status: "available" },
    { ...person(lily), chair: [34, 16], status: "away" },
    { ...person(grace), chair: [40, 13], status: "busy" },
  ],
  standing: [
    { ...person(jack), at: [36, 10], face: "right", status: "available" },
    { ...person(olivia), at: [38, 10], face: "left", status: "available" },
    { ...person(emma), at: [22, 5], face: "down", status: "available" },
    { ...person(ryan), at: [43, 21], face: "left", status: "available" },
  ],
};

/** A meeting at the table in the meeting room. */
export const MEETING: Scene = {
  view: [1, 3, 13, 12],
  sitting: [
    { ...person(emma), chair: [4, 11], status: "in_call" },
    { ...person(jack), chair: [6, 8], status: "in_call" },
    { ...person(olivia), chair: [8, 11], status: "in_call" },
    { ...person(sam), chair: [4, 8], status: "in_call" },
  ],
};

/** Everyone, everywhere at once: the whole floor on an ordinary afternoon, a meeting on and someone heads-down. */
export const EVERYONE: Scene = {
  view: [0, 0, 48, 32],
  sitting: [
    { name: "Ava", character: "Amelia", chair: [4, 11], status: "in_call" },
    { name: "Leo", character: "Adam", chair: [6, 8], status: "in_call" },
    { name: "Zoe", character: "Lucy", chair: [8, 11], status: "in_call" },
    { name: "Ben", character: "Bob", chair: [4, 8], status: "in_call" },
    { ...person(noah), chair: [7, 24], status: "busy" },
    { ...person(sam), chair: [20, 11], status: "busy" },
    { name: "Mia", character: "Molly", chair: [34, 16], status: "available" },
    { ...person(grace), chair: [40, 13], status: "busy" },
    { name: "Max", character: "Dan", chair: [27, 23], status: "available" },
  ],
  standing: [
    { ...person(jack), at: [36, 10], face: "right", status: "available" },
    { ...person(olivia), at: [38, 10], face: "left", status: "available" },
    { ...person(lily), at: [38, 4], face: "right", status: "away" },
    { ...person(ryan), at: [40, 4], face: "left", status: "away" },
    { ...person(emma), at: [22, 6], face: "down", status: "available" },
    { name: "Kai", character: "Ash", at: [43, 21], face: "left", status: "available" },
    { name: "Nora", character: "Alex", at: [18, 27], face: "right", status: "available" },
  ],
};

/** The lobby on a phone's hero: an upright patch of the hall, everyone inside x 23 to 37. */
export const LOBBY: Scene = {
  view: [23, 5, 14, 13],
  sitting: [
    { ...person(sam), chair: [26, 11], status: "available" },
    { ...person(lily), chair: [34, 16], status: "away" },
    { ...person(grace), chair: [34, 13], status: "busy" },
  ],
  standing: [
    { ...person(jack), at: [28, 14], face: "right", status: "available" },
    { ...person(olivia), at: [30, 14], face: "left", status: "available" },
    { ...person(emma), at: [31, 10], face: "down", status: "available" },
    { ...person(ryan), at: [26, 18], face: "right", status: "available" },
  ],
};
