export type CardinalDirection = "right" | "up" | "left" | "down";

/** How much further one way than the other a walk has to go before a character turns to face it. */
const TURN = 1.25;

/**
 * Which way a character walking (dx, dy) faces, having faced `was`: along
 * the way it goes furthest, so a walk that is mostly sideways faces sideways.
 * Near a diagonal it keeps facing as it was, if that is one of the two ways
 * it's going, rather than flicking between them. Every client works it out
 * the same way from the same walk.
 */
export function facing(dx: number, dy: number, was: CardinalDirection): CardinalDirection {
  const [across, along] = [Math.abs(dx), Math.abs(dy)];
  if (!across && !along) return was;
  const sideways: CardinalDirection = dx < 0 ? "left" : "right";
  const upDown: CardinalDirection = dy < 0 ? "up" : "down";
  if (was === sideways && across && along <= across * TURN) return sideways;
  if (was === upDown && along && across <= along * TURN) return upDown;
  return across >= along ? sideways : upDown;
}
