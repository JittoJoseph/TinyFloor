import { decorateState } from "./decorate";
import { callManager } from "./CallManager";
import { whiteboard } from "./WhiteboardManager";
import { characterCreatorShown } from "@/components/character/creatorOpen";

/**
 * Whether someone is in the middle of something on the floor: decorating
 * their desk, dressing their character, at the whiteboard, talking, or
 * reading a dialog. Anything that comes up unasked (a prompt, a tip) waits
 * until they're not, rather than landing on top of what they're doing.
 */
export function busyNow(): boolean {
  if (typeof document === "undefined") return true;
  if (decorateState().desk || characterCreatorShown()) return true;
  if (whiteboard.getSnapshot().open) return true;
  const call = callManager.getSnapshot();
  if (call.peers.length > 0 || call.meeting) return true;
  return !!document.querySelector("[aria-modal=true]");
}

/**
 * Calls `then` as soon as someone isn't busy (now, if they aren't), checking
 * once a second; the returned function gives up waiting.
 */
export function whenFree(then: () => void): () => void {
  if (!busyNow()) {
    then();
    return () => {};
  }
  const timer = window.setInterval(() => {
    if (busyNow()) return;
    window.clearInterval(timer);
    then();
  }, 1000);
  return () => window.clearInterval(timer);
}
