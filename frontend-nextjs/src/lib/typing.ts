/**
 * Whether the keyboard belongs to a text field right now. The floor's keys are
 * not captured, so without this, typing "w" in chat would also walk you north.
 */
export function typingElsewhere(): boolean {
  const element = typeof document === "undefined" ? null : document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return element.isContentEditable || element.matches("input, textarea, select");
}
