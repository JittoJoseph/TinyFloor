import type { ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";

/**
 * Text with `[words](/path)` links in it, as the content kept in lib/ writes
 * them: a page of the site through the localized Link, anywhere else in a
 * new tab. The same text reads as Markdown in llms-full.txt.
 */
export function Linked({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    parts.push(text.slice(last, match.index));
    const [, words, href] = match;
    parts.push(
      href.startsWith("/") ? (
        <Link key={match.index} href={href}>
          {words}
        </Link>
      ) : (
        <a key={match.index} href={href} target="_blank" rel="noopener noreferrer">
          {words}
        </a>
      ),
    );
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
