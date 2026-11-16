import { getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, ArrowUpRight, Rss } from "web-shared/components/ui/icons";
import { SOCIALS } from "web-shared/lib/site";
import { cn } from "web-shared/lib/utils";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import {
  CHANGELOG_FEED,
  changelogImage,
  changelogListPath,
  changelogOnPage,
  changelogPageCount,
  changelogPath,
  type ChangeKind,
  type ChangelogEntry,
} from "@/lib/changelog";
import { COLUMN, LEAD } from "@/components/home/Blocks";
import { linked } from "@/components/guides/ArticleSections";
import { GitHubMark } from "@/components/home/SiteFooter";
import { KIND_LABEL, changeDate } from "@/components/changelog/ChangeImage";

/** Each kind of change, as a dot of its own colour beside its name. */
const KIND_DOT: Record<ChangeKind, string> = { new: "bg-[#1fc79c]", improved: "bg-[#5865f2]", fixed: "bg-[#ff6a55]" };

const QUIET =
  "inline-flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[14px] font-medium text-foreground/80 transition-colors hover:bg-foreground/[0.04] hover:text-foreground";

/** The entries by the month they went live, newest first. */
function byMonth(entries: ChangelogEntry[]) {
  const months: Array<{ month: string; entries: ChangelogEntry[] }> = [];
  for (const entry of entries) {
    const month = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" });
    const last = months.at(-1);
    if (last?.month === month) last.entries.push(entry);
    else months.push({ month, entries: [entry] });
  }
  return months;
}

/**
 * One page of the changelog: a short header, then the changes on it by month,
 * one row each (its day and kind, what changed in a sentence or two, the
 * smaller changes that went with it, and a small picture of it from the app),
 * then the way to the older ones. The first page is /changelog, the rest
 * /changelog/page/<n>.
 */
export async function ChangelogList({ page, locale }: { page: number; locale: string }) {
  const t = await getTranslations("legal");
  const pages = changelogPageCount();

  return (
    <>
      <header className={cn(COLUMN, "pt-32 sm:pt-40")}>
        <div className="mx-auto flex max-w-[60rem] flex-wrap items-end justify-between gap-x-10 gap-y-6 border-b border-border pb-10 sm:pb-12">
          <div>
            <h1 className="text-[44px] font-normal leading-[1] tracking-[-0.045em] sm:text-[60px]">Changelog</h1>
            <p className={cn(LEAD, "mt-4 max-w-[30rem]")}>
              {page > 1 ? `Older changes to TinyFloor, page ${page} of ${pages}.` : "What's new in TinyFloor, by the day it went live."}
            </p>
            {locale !== "en" && <p className="mt-3 text-[13.5px] text-faint">{t("englishOnly")}</p>}
          </div>
          <div className="flex items-center gap-2">
            <a href={CHANGELOG_FEED} className={QUIET}>
              <Rss className="size-4" />
              RSS feed
            </a>
            <a href={SOCIALS.github} target="_blank" rel="noopener noreferrer" className={QUIET}>
              <GitHubMark className="size-4" />
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className={cn(COLUMN, "pb-24 pt-4 sm:pb-32")}>
        <div className="mx-auto max-w-[60rem]">
          {byMonth(changelogOnPage(page)).map(({ month, entries }) => (
            <section key={month} aria-labelledby={`month-${month}`} className="pt-10 sm:pt-12">
              <h2 id={`month-${month}`} className="text-[14px] font-semibold tracking-[-0.01em] text-muted-foreground">
                {month}
              </h2>
              <ol className="mt-2">
                {entries.map((entry) => (
                  <Row key={entry.slug} entry={entry} />
                ))}
              </ol>
            </section>
          ))}

          <nav aria-label="Changelog pages" className="mt-14 flex flex-wrap items-center justify-center gap-2 border-t border-border pt-10">
            {page > 1 && (
              <Link href={changelogListPath(page - 1)} className={QUIET}>
                <ArrowLeft className="size-3.5 rtl:rotate-180" />
                Newer changes
              </Link>
            )}
            {page < pages && (
              <Link
                href={changelogListPath(page + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-foreground/85"
              >
                Older changes
                <ArrowRight className="size-3.5 rtl:rotate-180" />
              </Link>
            )}
          </nav>
        </div>
      </div>
    </>
  );
}

/**
 * A change, in a row: its day and kind on the left, the words in the middle,
 * its picture small on the right. One with a page of its own leads there from
 * its title and its picture; the feature it belongs to is named under it.
 */
function Row({ entry }: { entry: ChangelogEntry }) {
  const page = entry.body ? changelogPath(entry) : null;
  const image = changelogImage(entry);
  return (
    <li
      id={entry.slug}
      className={cn(
        "grid scroll-mt-28 grid-cols-[1fr_6.5rem] gap-x-5 border-t border-border py-7 first:border-t-0 sm:gap-x-8",
        "md:grid-cols-[9rem_1fr_13.5rem]",
        !image && "grid-cols-1 md:grid-cols-[9rem_1fr_13.5rem]",
      )}
    >
      <p className="col-span-full mb-2 flex items-center gap-3 text-[13px] text-muted-foreground md:col-span-1 md:mb-0 md:flex-col md:items-start md:gap-1.5 md:pt-0.5">
        <time dateTime={entry.date}>{changeDate(entry.date)}</time>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn("size-1.5 rounded-full", KIND_DOT[entry.kind])} />
          {KIND_LABEL[entry.kind]}
        </span>
      </p>

      <div className="min-w-0">
        <h3 className="text-balance text-[18px] font-semibold leading-[1.3] tracking-[-0.015em] sm:text-[19px]">
          {page ? (
            <Link href={page} className="underline decoration-transparent decoration-[1.5px] underline-offset-4 transition-colors hover:decoration-foreground/40">
              {entry.title}
            </Link>
          ) : (
            entry.title
          )}
        </h3>
        <p className="mt-2 text-pretty text-[15px] leading-[1.65] text-foreground/75">{linked(entry.summary)}</p>
        {entry.also && (
          <ul className="mt-3 grid gap-1.5">
            {entry.also.map((item) => (
              <li key={item} className="relative ps-4 text-[14px] leading-[1.55] text-muted-foreground">
                <span aria-hidden className="absolute start-0 top-[0.6em] size-1 rounded-full bg-foreground/30" />
                {linked(item)}
              </li>
            ))}
          </ul>
        )}
        {(page || entry.more) && (
          <p className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[14px] font-medium">
            {page && (
              <Link href={page} className="inline-flex items-center gap-1 text-foreground transition-colors hover:text-foreground/70">
                Read the update
                <ArrowRight className="size-3.5 rtl:rotate-180" />
              </Link>
            )}
            {entry.more && (
              <Link href={entry.more.href} className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
                {entry.more.label}
                <ArrowUpRight className="size-3.5 rtl:-scale-x-100" />
              </Link>
            )}
          </p>
        )}
      </div>

      {image && entry.image && (
        <Thumb href={page} src={image} alt={entry.image.alt} />
      )}
    </li>
  );
}

/** The change's picture, small: the same 16:10 picture its page opens with. */
function Thumb({ href, src, alt }: { href: string | null; src: string; alt: string }) {
  const picture = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={1600}
      height={1000}
      loading="lazy"
      decoding="async"
      className="aspect-[16/10] h-auto w-full rounded-[12px] bg-muted object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] sm:rounded-[14px]"
    />
  );
  return href ? (
    <Link href={href} tabIndex={-1} className="group row-start-2 block self-start overflow-hidden rounded-[12px] md:row-start-1 md:col-start-3 sm:rounded-[14px]">
      {picture}
    </Link>
  ) : (
    <div className="row-start-2 self-start overflow-hidden rounded-[12px] md:row-start-1 md:col-start-3 sm:rounded-[14px]">{picture}</div>
  );
}
