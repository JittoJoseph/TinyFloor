/**
 * Where the people beside you are on screen, written straight onto their
 * cards every frame, outside React: the floor knows where they are
 * (ProximityManager), the overlay knows where their cards are
 * (ProximityOverlay). React only hears who's near and how they are, so the
 * cards glide with the camera instead of following it a re-render behind.
 */
type Placer = (id: string, x: number, y: number) => void;

let placer: Placer | null = null;

export function setCardPlacer(next: Placer | null) {
  placer = next;
}

/** Someone beside you is at (x, y) on screen, in CSS pixels: their card goes beside them. */
export function placeCard(id: string, x: number, y: number) {
  placer?.(id, x, y);
}
