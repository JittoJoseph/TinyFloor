import { describe, expect, it } from "vitest";
import { FLOOR, fitsIn } from "shared-protocol";

// A single desk's spots: what you work at in the middle, the rest either side (shared-protocol office.ts fitsIn).
const [DESK, SPEC] = Object.entries(FLOOR.desks).find(([, desk]) => desk.spots.some((spot) => spot.holds === "middle"))!;
const MIDDLE = SPEC.spots.find((spot) => spot.holds === "middle")!;
const SIDE = SPEC.spots.find((spot) => spot.holds === "side")!;

describe("a single desk's spots", () => {
  it("keeps the middle for what you work at", () => {
    expect(fitsIn(DESK, MIDDLE, "ours-screen-teal")).toBe(true);
    expect(fitsIn(DESK, MIDDLE, "ours-book")).toBe(true);
    expect(fitsIn(DESK, MIDDLE, "ours-lamp-coral")).toBe(false);
    expect(fitsIn(DESK, MIDDLE, "ours-mug-teal")).toBe(false);
  });

  it("keeps the sides for the rest", () => {
    expect(fitsIn(DESK, SIDE, "ours-lamp-coral")).toBe(true);
    expect(fitsIn(DESK, SIDE, "ours-screen-teal")).toBe(false);
    expect(fitsIn(DESK, SIDE, "ours-book")).toBe(false);
  });

  it("has the floor's own desks keep a middle thing in the middle, what a desk goes back to when its own no longer fits", () => {
    const middle = `${DESK}/${MIDDLE.id}`;
    const own = FLOOR.pieces.find((piece) => piece.key === middle)?.item;
    expect(own && FLOOR.things[own].shelf).toBe("middle");
  });
});
