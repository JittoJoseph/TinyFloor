import React from "react";
import { COVER_WIDTH, OfficeScene } from "@/components/OfficeScene";

const size = "max(4cqw, 6cqh, 22px)";

/** A walk as a share of the image's width, so it stays inside its aisle at any size. */
const lane = (share: number) => `calc(${COVER_WIDTH} * ${share})`;

export const HeroOfficeScene: React.FC = () => (
  <OfficeScene
    className="w-full h-full rounded-xl select-none"
    focus="center center"
    occupants={[
      { character: "Alex", left: "30%", top: "78%", width: size },
      { character: "Bob", left: "75%", top: "33%", width: size },
    ]}
  />
);

/**
 * The hero office with people strolling its aisles. Spots are on the image
 * itself, and every walk keeps clear of the desks, plants and the cubicle
 * whether the window shows the floor at 4:3 or 16:9.
 */
export const StrollingOfficeScene: React.FC = () => (
  <OfficeScene
    className="w-full h-full rounded-xl select-none"
    focus="center center"
    pinned
    occupants={[
      {
        character: "Bob",
        name: "Emma",
        left: "67.5%",
        top: "30%",
        width: size,
        stroll: { distance: lane(0.3), duration: 9400, pattern: "a" },
      },
      {
        character: "Amelia",
        name: "Grace",
        left: "25.8%",
        top: "43%",
        width: size,
        stroll: { distance: lane(0.24), duration: 9100, delay: -2600, pattern: "c" },
      },
      {
        character: "Alex",
        name: "Jack",
        left: "72.5%",
        top: "59%",
        width: size,
        stroll: { distance: lane(0.25), duration: 10300, delay: -4100, pattern: "b" },
      },
      {
        character: "Adam",
        name: "Noah",
        left: "19%",
        top: "75%",
        width: size,
        stroll: { distance: lane(0.17), duration: 7700, delay: -1500, pattern: "a" },
      },
      {
        character: "Bob",
        name: "Ivy",
        left: "57.5%",
        top: "88%",
        width: size,
        stroll: { distance: lane(0.22), duration: 8600, delay: -5200, pattern: "c" },
      },
    ]}
  />
);
