/**
 * Mentions in chat (docs/product.md): the words say "@Ana Lima" and the
 * message carries Ana's id. Who's mentioned is read from the words when they're
 * sent or edited, so typing a name works as well as picking it, and the text
 * stays plain wherever it's shown, searched or quoted.
 */

export interface Mentionable {
  id: string;
  displayName: string;
}

/** Letters and digits in any script: what can't follow a name for it to be that name. */
const WORD = /[\p{L}\p{N}]/u;

/** Each "@" followed by someone's name, the longest name that fits, so "@Ana Lima" isn't also "@Ana". */
export function mentionSpans(text: string, people: Mentionable[]) {
  const spans: Array<{ start: number; end: number; person: Mentionable }> = [];
  const byLength = [...people].filter((one) => one.displayName.trim()).sort((a, b) => b.displayName.length - a.displayName.length);
  const lower = text.toLocaleLowerCase();
  for (let at = lower.indexOf("@"); at >= 0; at = lower.indexOf("@", at + 1)) {
    if (at > 0 && WORD.test(text[at - 1])) continue;
    const person = byLength.find((one) => {
      const name = one.displayName.toLocaleLowerCase();
      return lower.startsWith(name, at + 1) && !WORD.test(text[at + 1 + name.length] ?? "");
    });
    if (person) {
      spans.push({ start: at, end: at + 1 + person.displayName.length, person });
      at += person.displayName.length;
    }
  }
  return spans;
}

/** Who a message mentions, each once, never the author. */
export function mentionsIn(text: string, people: Mentionable[], author: string): string[] {
  return [...new Set(mentionSpans(text, people).map((span) => span.person.id))].filter((id) => id !== author);
}

/** The "@name" being typed just before the cursor, if there is one: what the picker offers people for. */
export function typingMention(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const found = /(^|\s)@([\p{L}\p{N}._' -]{0,30})$/u.exec(before);
  // Names have spaces in them, so the picker stays while what's typed still fits someone; it closes once nobody does.
  return found ? { start: before.length - found[2].length - 1, query: found[2] } : null;
}
