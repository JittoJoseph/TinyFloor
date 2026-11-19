/**
 * The person beside you, between the floor and the page, every frame and
 * outside React: the floor knows where they are (ProximityManager), the page
 * holds what you can do with them, which takes their name tag's place
 * (ProximityOverlay). React only hears who it is and how they are, so it
 * glides with the camera instead of following it a re-render behind.
 */
type Placer = (id: string, x: number, y: number) => void;

let placer: Placer | null = null;
/** How wide the actions are on the page, in CSS pixels, so the floor can clear that much room around them. */
let width = 0;

export function setCardPlacer(next: Placer | null) {
  placer = next;
}

/** Their name tag's centre is at (x, y) on screen, in CSS pixels: the actions go there. */
export function placeCard(id: string, x: number, y: number) {
  placer?.(id, x, y);
}

export function setCardWidth(next: number) {
  width = next;
}

export function cardWidth(): number {
  return width;
}
