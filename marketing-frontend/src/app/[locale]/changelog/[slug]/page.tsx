import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "web-shared/lib/i18n/routing";
import { JsonLd } from "web-shared/components/JsonLd";
import { ArrowLeft, ArrowRight } from "web-shared/components/ui/icons";
import { absoluteUrl, articleNode, pageGraph } from "web-shared/lib/structured-data";
import { cn } from "web-shared/lib/utils";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { englishOnlyMetadata } from "@/lib/englishOnlyMetadata";
import { CHANGELOG, CHANGELOG_PAGES, CHANGELOG_PATH, changelogCard, changelogImage, changelogPath } from "@/lib/changelog";
import { COLUMN, Closing, INK, LEAD, MarketingShell } from "@/components/home/Blocks";
import { READ, linked } from "@/components/guides/ArticleSections";
import { ChangeImage, KIND_LABEL, changeDate } from "@/components/changelog/ChangeImage";

type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return CHANGELOG_PAGES().map(({ slug }) => ({ slug }));
}

const entryBySlug = (slug: string) => CHANGELOG_PAGES().find((entry) => entry.slug === slug);
/** A `[words](/path)` link's words alone, for markup that holds plain text. */
const unlinked = (text: string) => text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entry = entryBySlug(slug);
  if (!entry) return {};
  return englishOnlyMetadata({
    path: changelogPath(entry),
    title: `${entry.title} · TinyFloor Changelog`,
    description: unlinked(entry.summary),
    image: changelogCard(entry) ?? undefined,
    imageAlt: entry.image?.alt,
  });
}

/**
 * One change with a page of its own: the day it went live, what it does in a
 * few sentences an answer can quote, a picture of it from the app, how to use
 * it and what's behind it, what went out with it, and where the feature lives.
 * The changes either side of it lead on through the changelog.
 */
export default async function ChangelogEntryPage({ params }: Props) {
  const { locale, slug } = await params;
  const entry = entryBySlug(slug);
  if (!entry || !entry.body) notFound();
  setRequestLocale(locale as Locale);
  const t = await getTranslations("legal");
  const path = changelogPath(entry);
  const index = CHANGELOG.indexOf(entry);
  const newer = CHANGELOG.slice(0, index).reverse().find((one) => one.body);
  const older = CHANGELOG.slice(index + 1).find((one) => one.body);

  return (
    <MarketingShell path={path}>
      <JsonLd
        schema={pageGraph({
          locale: "en",
          path,
          name: entry.title,
          description: unlinked(entry.summary),
          parents: [{ name: "Changelog", path: CHANGELOG_PATH }],
          mainEntity: `${absoluteUrl("en", path)}#article`,
          image: changelogImage(entry) ?? undefined,
          nodes: [
            articleNode({
              locale: "en",
              path,
              headline: entry.title,
              description: unlinked(entry.summary),
              published: entry.date,
              updated: entry.date,
              image: changelogImage(entry) ?? undefined,
            }),
          ],
        })}
      />

      <article>
        <header className={cn(COLUMN, "pt-32 sm:pt-40")}>
          <div className={cn(READ, "text-center")}>
            <Link href={CHANGELOG_PATH} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="size-3.5 rtl:rotate-180" />
              Changelog
            </Link>
            <p className="mt-8 flex items-center justify-center gap-2 text-[14px] text-muted-foreground">
              <span className="font-medium text-brand">{KIND_LABEL[entry.kind]}</span>
              <span aria-hidden>·</span>
              <time dateTime={entry.date}>{changeDate(entry.date)}</time>
            </p>
            <h1 className="mt-4 text-balance text-[34px] font-normal leading-[1.06] tracking-[-0.04em] min-[400px]:text-[40px] sm:text-[52px]">{entry.title}</h1>
            {locale !== "en" && <p className="mt-4 text-[13.5px] text-faint">{t("englishOnly")}</p>}
          </div>
        </header>

        <div className={cn(COLUMN, "mt-10 sm:mt-14")}>
          <div className="mx-auto max-w-[56rem]">
            <ChangeImage entry={entry} priority />
          </div>
        </div>

        <div className={cn(COLUMN, "pb-20 sm:pb-24")}>
          <div className={READ}>
            <p className={cn(LEAD, "mt-10 text-pretty sm:mt-12")}>{linked(entry.summary)}</p>
            {entry.body.map((section) => (
              <section key={section.title} className="pt-12 sm:pt-14">
                <h2 className="text-balance text-[24px] font-normal leading-[1.15] tracking-[-0.03em] sm:text-[28px]">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-pretty text-[17px] leading-[1.75] text-foreground/80">
                    {linked(paragraph)}
                  </p>
                ))}
                {section.image && <SectionImage name={section.image.name} alt={section.image.alt} />}
              </section>
            ))}

            {entry.also && (
              <section className="pt-12 sm:pt-14">
                <h2 className="text-[20px] font-semibold tracking-[-0.02em]">Also in this release</h2>
                <ul className="mt-4 grid gap-3">
                  {entry.also.map((item) => (
                    <li key={item} className="relative ps-5 text-[16px] leading-[1.65] text-foreground/80">
                      <span aria-hidden className="absolute start-0 top-[0.65em] size-1.5 rounded-full bg-brand" />
                      {linked(item)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <aside className="mt-14 flex flex-wrap items-center gap-2 rounded-[24px] bg-muted/80 p-6 sm:mt-16 sm:p-7">
              <Link href="/lobby" data-cta="changelog" className={INK}>
                Try it in the demo office
              </Link>
              {entry.more && entry.more.href !== "/lobby" && (
                <Link
                  href={entry.more.href}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-background/70 px-4 text-[14px] font-medium transition-colors hover:bg-background"
                >
                  {entry.more.label}
                  <ArrowRight className="size-3.5 text-muted-foreground rtl:rotate-180" />
                </Link>
              )}
            </aside>

            {(newer || older) && (
              <nav aria-label="More changes" className="mt-14 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
                {[
                  { one: older, label: "Earlier" },
                  { one: newer, label: "Later" },
                ].map(({ one, label }) =>
                  one ? (
                    <Link key={label} href={changelogPath(one)} className="group rounded-[18px] p-4 transition-colors hover:bg-muted/70">
                      <span className="text-[12.5px] text-faint">
                        {label} · {changeDate(one.date)}
                      </span>
                      <span className="mt-1 block text-[16px] font-semibold leading-[1.3] tracking-[-0.01em]">{one.title}</span>
                    </Link>
                  ) : (
                    <span key={label} />
                  ),
                )}
              </nav>
            )}
          </div>
        </div>
      </article>
      <Closing />
    </MarketingShell>
  );
}

/** A picture inside the text: one more view of the change, as wide as the reading column. */
function SectionImage({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="mt-8 overflow-hidden rounded-[20px] bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/screens/${name}.webp`} alt={alt} width={1600} height={1000} loading="lazy" decoding="async" className="aspect-[16/10] h-auto w-full" />
    </figure>
  );
}
