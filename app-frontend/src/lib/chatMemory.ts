import { GENERAL_CHANNEL } from "@shared/chat";

/**
 * What chat remembers for you between visits to it (docs/product.md): the
 * conversation you were last in, per office, so coming back to Chat opens it
 * rather than #general; and what you'd started writing in each conversation,
 * so moving to another one, or to the floor and back, doesn't lose it. Drafts
 * last for the tab, the last conversation across visits.
 */

const LAST = "tf:chat-last:";
const DRAFTS = "tf:chat-drafts";

const drafts: Map<string, string> = (() => {
  try {
    return new Map(Object.entries(JSON.parse(sessionStorage.getItem(DRAFTS) ?? "{}") as Record<string, string>));
  } catch {
    return new Map();
  }
})();

export function lastConversation(place: string): string | null {
  try {
    return localStorage.getItem(LAST + place);
  } catch {
    return null;
  }
}

/**
 * Where Chat opens on a wide screen: the conversation you were last in, if
 * `stillThere` says you can still open it (a direct message with someone who
 * has left can't be); otherwise it's forgotten, and Chat opens on #general.
 */
export function conversationToOpen(place: string, stillThere: (channel: string) => boolean): string | null {
  const last = lastConversation(place);
  if (!last || last === GENERAL_CHANNEL) return null;
  if (stillThere(last)) return last;
  rememberConversation(place, null);
  return null;
}

export function rememberConversation(place: string, channel: string | null) {
  try {
    if (channel) localStorage.setItem(LAST + place, channel);
    else localStorage.removeItem(LAST + place);
  } catch {
    // Private mode: Chat opens on #general, as it always did.
  }
}

export function draftFor(key: string): string {
  return drafts.get(key) ?? "";
}

export function keepDraft(key: string, text: string) {
  if (text.trim()) drafts.set(key, text);
  else drafts.delete(key);
  try {
    sessionStorage.setItem(DRAFTS, JSON.stringify(Object.fromEntries(drafts)));
  } catch {
    // Kept for this page, at least.
  }
}

/** A found message to open: picked in search, carried to its conversation, read once there. */
let jump: { channel: string; seq: number } | null = null;

export function jumpTo(channel: string, seq: number) {
  jump = { channel, seq };
}

export function takeJump(channel: string): number | null {
  if (jump?.channel !== channel) return null;
  const { seq } = jump;
  jump = null;
  return seq;
}
