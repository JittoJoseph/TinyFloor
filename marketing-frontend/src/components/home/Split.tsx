import { Fragment, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";

/*
 * A line split into its words, so they can arrive one after another (the
 * `.word` rules in globals.css). The spaces stay plain text between them, so
 * the line wraps, copies and reads exactly as before. A language written
 * without spaces (Chinese, Japanese) stays one piece: splitting it into
 * characters would let a line break anywhere.
 */

type Counter = { i: number };

function words(text: string, counter: Counter): ReactNode[] {
  return text.split(/(\s+)/).map((part, n) =>
    part === "" ? null : /^\s+$/.test(part) ? (
      part
    ) : (
      <span key={n} className="word" style={{ "--i": counter.i++ } as CSSProperties}>
        <span>{part}</span>
      </span>
    ),
  );
}

/** Marks a quieter run of words inside a split line (see `split`). */
export function Muted({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

/**
 * Splits text, or what `t.rich` returned, numbering the words in reading
 * order across the whole line. Pass `quiet` to style the runs a rich message
 * marks with `<Muted>` (`t.rich("text", { muted: (c) => <Muted>{c}</Muted> })`).
 */
export function split(node: ReactNode, quiet?: (children: ReactNode) => ReactElement, counter: Counter = { i: 0 }): ReactNode {
  if (typeof node === "string") return words(node, counter);
  if (Array.isArray(node)) return node.map((one, n) => <Fragment key={n}>{split(one, quiet, counter)}</Fragment>);
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Muted) {
    const inner = split(node.props.children, quiet, counter);
    return quiet ? quiet(inner) : inner;
  }
  return node;
}

/** A plain line, split. */
export function Split({ text, from = 0 }: { text: string; from?: number }) {
  return <>{split(text, undefined, { i: from })}</>;
}

/** How many words `Split` makes of a line, to number the next one after it. */
export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * How a part settles in (globals.css): after `d` milliseconds, from `y`
 * pixels below (or `x` to the side), at `scale`.
 */
export function rise(d = 0, { x, y, scale }: { x?: number; y?: number; scale?: number } = {}): CSSProperties {
  return {
    "--d": `${d}ms`,
    ...(x !== undefined && { "--rise-x": `${x}px` }),
    ...(y !== undefined && { "--rise-y": `${y}px` }),
    ...(scale !== undefined && { "--rise-scale": scale }),
  } as CSSProperties;
}
