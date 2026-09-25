/**
 * The app's bold surface, taken from its shell: a black bezel, the way the
 * rail frames the view, with a panel set into it (docs/06-app-design.md,
 * "Doors and rings"). Whatever sits on the bezel itself wears the dark theme
 * in either theme (`onBezel`), so every token reads as light on black.
 */
export const bezel =
  "bg-[#09090a] shadow-[0_30px_70px_-34px_rgb(0_0_0/0.6)] dark:bg-black dark:shadow-[0_0_0_1px_rgb(255_255_255/0.07),0_30px_70px_-34px_rgb(0_0_0/0.8)]";

/** Anything laid on the bezel: the dark theme's tokens, and faces ringed in black. */
export const onBezel = "dark text-foreground [--face-ring:#09090a]";

/** The panel set into a bezel: the theme's own card, with what it asks inside. */
export const bezelPanel = "bg-card [--face-ring:var(--ui-card)]";
