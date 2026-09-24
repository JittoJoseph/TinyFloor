import type { ReactNode } from "react";
import { FloorScene } from "./FloorScene";
import { EVERYONE, HALL, LOBBY, MEETING, PEOPLE } from "./scenes";
import { AfterScene, STEP_WALK } from "@/components/home/Moments";
import { GuestFloor } from "@/components/home/previews/GuestPreview";

/*
 * The floor scenes the website shows, as they are recorded into files by
 * scripts/scenes.mjs through /scene-render. Only that page and that script
 * use this; the pages themselves show the files (SceneMedia). A scene is
 * drawn in a box `size` CSS pixels big (the size it is shown at, so the
 * app's chips and cards on it keep their size) at `scale` device pixels to
 * one; one that moves repeats every `period` seconds, a whole number of the
 * sprites' own 3s cycle, so its recording loops without a seam. The words
 * on a scene (its people's names, a chip) are recorded in English.
 */

export interface SceneSpec {
  /** The box, in CSS pixels, and device pixels to a CSS pixel. */
  size: [number, number];
  scale: number;
  /** Seconds it repeats in; a still when absent. */
  period?: number;
  draw: () => ReactNode;
}

const box = "h-full w-full";

export const SCENES = {
  /** The hall on an ordinary day: the hero's floor, and the nav's small window onto it. */
  hall: {
    size: [1024, 640],
    scale: 1.5,
    period: 12,
    draw: () => <FloorScene {...HALL} period={12} className={box} />,
  },
  /** The lobby on a phone's hero: an upright patch of the hall. */
  lobby: {
    size: [448, 416],
    scale: 2,
    period: 12,
    draw: () => <FloorScene {...LOBBY} period={12} className={box} />,
  },
  /** Everyone at the meeting table. */
  meeting: {
    size: [768, 448],
    scale: 1.5,
    draw: () => <FloorScene {...MEETING} view={[0, 2, 24, 14]} className={box} />,
  },
  /** The whole floor on an ordinary afternoon, for the closing section and the About page. */
  everyone: {
    size: [768, 576],
    scale: 1.5,
    period: 12,
    draw: () => <FloorScene {...EVERYONE} view={[15, 1, 24, 18]} period={12} className={box} />,
  },
  /** You walking over to Jack, and the call a tap away once you're there. */
  "walk-over": {
    size: [520, 288],
    scale: 2,
    period: 12,
    draw: () => <AfterScene className={box} />,
  },
  /** Someone walking in on the first day. */
  "walk-in": {
    size: [374, 220],
    scale: 2,
    period: 12,
    draw: () => <FloorScene {...STEP_WALK} period={12} className={box} />,
  },
  /** A guest walking onto the floor through the link they were sent. */
  guest: {
    size: [330, 170],
    scale: 2,
    period: 12,
    draw: () => <GuestFloor className={box} />,
  },
  /** Behind every door: the hall, people at their desks. */
  door: {
    size: [960, 672],
    scale: 1,
    draw: () => (
      <FloorScene
        view={[14, 4, 30, 21]}
        sitting={[
          { ...PEOPLE.olivia, chair: [26, 8], status: "busy" },
          { ...PEOPLE.ryan, chair: [20, 11], status: "available" },
          { ...PEOPLE.grace, chair: [34, 13], status: "available" },
          { ...PEOPLE.lily, chair: [34, 16], status: "away" },
        ]}
        standing={[
          { ...PEOPLE.jack, at: [36, 10], face: "right", status: "available" },
          { ...PEOPLE.sam, at: [38, 10], face: "left", status: "available" },
        ]}
        className={box}
      />
    ),
  },
  /** Someone alone in the empty private office, wondering where everyone went. */
  lost: {
    size: [416, 320],
    scale: 2,
    draw: () => <FloorScene view={[1, 18, 13, 10]} standing={[{ character: "Bob", at: [10, 25], face: "down" }]} className={box} />,
  },
} satisfies Record<string, SceneSpec>;

export type SceneName = keyof typeof SCENES;
