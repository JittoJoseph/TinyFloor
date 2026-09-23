import { CAST } from "@/components/home/previews/Frame";
import type { Sitter, Stander, Walker } from "./FloorScene";

/*
 * The floor's everyday moments, placed on the real map in tiles. The map's
 * rooms: the meeting room top left (table at 3-9 by 7-9), a private office
 * under it, the open hall to the right with four rows of desks, and a lounge
 * in the hall's top right with the sofa and the speaker.
 */

const [emma, jack, olivia, sam, lily, noah] = CAST;
const ryan = { id: "ryan-4", name: "Ryan", character: "Ash" };
const grace = { id: "grace-9", name: "Grace", character: "Alex" };

export const PEOPLE = { emma, jack, olivia, sam, lily, noah, ryan, grace };

type Scene = { view: [number, number, number, number]; standing?: Stander[]; sitting?: Sitter[]; walking?: Walker[] };

const person = ({ name, character }: { name: string; character: string }) => ({ name, character });

/** The hall on an ordinary day: a few at their desks, two chatting in the aisle, the rest on the move. */
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
  ],
  walking: [
    { ...person(emma), status: "available", path: [[16, 11, 1.5], [30, 11], [30, 5, 2], [16, 5]], offset: 3 },
    { ...person(ryan), status: "available", path: [[31, 17, 2], [44, 17], [44, 21, 1.2], [31, 21]], offset: 1 },
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
  ],
  walking: [
    { ...person(emma), status: "available", path: [[16, 11, 1.5], [30, 11], [30, 6, 2], [16, 6]], offset: 3 },
    { name: "Kai", character: "Ash", status: "available", path: [[31, 18, 2], [44, 18], [44, 21, 1.2], [31, 21]], offset: 1 },
    { name: "Nora", character: "Alex", status: "available", path: [[16, 24, 1], [16, 27], [30, 27, 2.5], [30, 24]], offset: 5 },
  ],
};
