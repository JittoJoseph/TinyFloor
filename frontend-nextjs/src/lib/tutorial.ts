export const GUIDE_ID = "spatialmeet-guide";
export const GUIDE_NAME = "Guide";
export const TUTORIAL_KEY = "spacialMeetTutorialDone";
export const TUTORIAL_FINISHED_EVENT = "tutorialFinished";
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

export function tutorialDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(TUTORIAL_KEY) !== null;
}

export function completeTutorial() {
  localStorage.setItem(TUTORIAL_KEY, "1");
  window.dispatchEvent(new Event(TUTORIAL_FINISHED_EVENT));
}
