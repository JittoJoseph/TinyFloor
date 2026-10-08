/** Whether the floor is being driven by touch (the joystick) or a mouse and keyboard. */
export const INPUT_MODE_EVENT = "inputModeChanged";

let touchInput =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;

export function setTouchInput(value: boolean) {
  if (touchInput === value) return;
  touchInput = value;
  window.dispatchEvent(new Event(INPUT_MODE_EVENT));
}

export function isTouchInput() {
  return touchInput;
}
