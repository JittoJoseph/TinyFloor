import { AUTHOR } from "@/lib/site";

/**
 * "By Jitto Joseph" in the page's language, the name linking to LinkedIn
 * wherever the language puts it: who wrote a page, which readers and search
 * engines both weigh (the same person is the author in its structured data).
 */
export function byline(text: string) {
  const at = text.indexOf(AUTHOR.name);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <a
        href={AUTHOR.linkedin}
        target="_blank"
        rel="author noopener noreferrer"
        className="text-foreground underline decoration-foreground/25 underline-offset-[3px] transition-colors hover:decoration-foreground"
      >
        {AUTHOR.name}
      </a>
      {text.slice(at + AUTHOR.name.length)}
    </>
  );
}
