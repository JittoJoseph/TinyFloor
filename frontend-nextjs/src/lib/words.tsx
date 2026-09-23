import type { ReactNode } from "react";

/** Languages written without spaces, where a line can otherwise break in the middle of a word. */
const UNSPACED = ["ja", "zh"];

/**
 * A headline in Chinese or Japanese with each word kept whole, so its lines
 * break between words rather than inside one. Punctuation stays with the word
 * before it. Everything else is returned as it is.
 */
export function wholeWords(text: string, locale: string): ReactNode {
  if (!UNSPACED.includes(locale)) return text;
  const words: string[] = [];
  for (const { segment, isWordLike } of new Intl.Segmenter(locale, { granularity: "word" }).segment(text)) {
    if (!isWordLike && words.length) words[words.length - 1] += segment;
    else words.push(segment);
  }
  return words.map((word, i) => (
    <span key={i} className="inline-block">
      {word}
    </span>
  ));
}

/** Copy with its <em> parts set in `className`, each part's words kept whole. */
export function emphasised(text: string, locale: string, className: string): ReactNode {
  return text.split(/<em>|<\/em>/).map((part, i) =>
    i % 2 ? (
      <span key={i} className={className}>
        {wholeWords(part, locale)}
      </span>
    ) : (
      <span key={i}>{wholeWords(part, locale)}</span>
    ),
  );
}
