import React from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import {
  COMPARE_ROWS,
  LANDINGS,
  LANDING_GROUPS,
  type Landing,
} from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { Navbar } from "./Navbar";
import { FloorMockup } from "./RoomMoments";
import { FAQ } from "./FAQ";
import { CTA } from "./CTA";
import { Footer } from "./Footer";

interface LandingCopy {
  subtitle: string;
  points: Array<{ title: string; body: string }>;
  them?: Record<(typeof COMPARE_ROWS)[number], string>;
  faq: Array<{ q: string; a: string }>;
}

const em = (chunks: React.ReactNode) => (
  <span className="font-medium">{chunks}</span>
);

const sectionTitle =
  "font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight leading-[1.1] mb-8 md:mb-12";

const buttonBase =
  "cursor-pointer inline-flex items-center justify-center whitespace-nowrap h-12 md:h-14 px-7 md:px-8 rounded-full font-body font-medium uppercase tracking-widest text-xs md:text-sm transition-all duration-300";

/** One page written for a search: a pitch, the proof, how it works and the questions people ask. */
export async function LandingPage({
  page,
  locale,
}: {
  page: Landing;
  locale: string;
}) {
  const t = await getTranslations("landings");
  const copy = t.raw(`pages.${page.key}`) as LandingCopy;
  const them = copy.them;
  const path = `/${page.slug}`;

  return (
    <div className="min-h-screen w-full relative">
      <JsonLd
        schema={pageGraph({
          locale,
          path,
          name: t(`pages.${page.key}.meta.title`),
          description: t(`pages.${page.key}.meta.description`),
          nodes: [faqNode(locale, path, copy.faq)],
        })}
      />
      <Navbar />

      <main className="pt-24 md:pt-32">
        <section className="max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 grid gap-10 lg:gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <h1 className="font-body font-light text-[2.6rem] md:text-6xl lg:text-[3.6rem] text-[var(--color-braun-text)] tracking-tight leading-[1.05] mb-6">
              {t.rich(`pages.${page.key}.title`, { em })}
            </h1>
            <p className="font-body text-[var(--color-braun-text)] opacity-60 text-base md:text-xl leading-relaxed max-w-2xl mb-10">
              {copy.subtitle}
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3 md:gap-4">
              <Link
                href="/room/public-room"
                className={`${buttonBase} bg-[var(--color-braun-orange)] text-white shadow-[0_12px_28px_-14px_rgba(255,78,0,0.8)] hover:brightness-110`}
              >
                {t("tryIt")}
              </Link>
              <Link
                href="/create-room"
                className={`${buttonBase} bg-white border border-black/10 text-[var(--color-braun-text)] shadow-sm hover:shadow-md`}
              >
                {t("create")}
              </Link>
            </div>
            <p className="font-body text-xs text-[var(--color-braun-text)] opacity-45 mt-5">
              {t("free")}
            </p>
          </div>

          <FloorMockup />
        </section>

        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14 md:py-24">
          <ul className="grid gap-4 md:grid-cols-3 md:gap-6">
            {copy.points.map((point, index) => (
              <li
                key={point.title}
                className="rounded-[1.5rem] border border-black/10 bg-[#f2efe6] p-6 md:p-8"
              >
                <span className="font-body text-sm font-bold text-[var(--color-braun-orange)]">
                  0{index + 1}
                </span>
                <h2 className="font-body text-xl md:text-2xl font-medium text-[var(--color-braun-text)] tracking-tight mt-3 mb-3">
                  {point.title}
                </h2>
                <p className="font-body text-sm md:text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed">
                  {point.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {page.competitor && them && (
          <section className="max-w-4xl mx-auto px-4 md:px-8 pb-14 md:pb-24">
            <h2 className={sectionTitle}>
              {t.rich("compareTitle", { name: page.competitor, em })}
            </h2>
            <div className="overflow-x-auto rounded-[1.5rem] border border-black/10 bg-white">
              <table className="w-full min-w-[34rem] font-body text-sm md:text-base text-[var(--color-braun-text)]">
                <thead>
                  <tr className="border-b border-black/10">
                    <td className="p-4 md:p-5" />
                    <th scope="col" className="p-4 md:p-5 text-start font-bold">
                      SpatialMeet
                    </th>
                    <th scope="col" className="p-4 md:p-5 text-start font-bold opacity-60">
                      {page.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row} className="border-b border-black/5 last:border-0">
                      <th scope="row" className="p-4 md:p-5 text-start font-medium opacity-60 w-[30%]">
                        {t(`rows.${row}`)}
                      </th>
                      <td className="p-4 md:p-5">{t(`us.${row}`)}</td>
                      <td className="p-4 md:p-5 opacity-60">{them[row]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-body text-xs text-[var(--color-braun-text)] opacity-45 mt-4">
              {t("checked", { name: page.competitor })}
            </p>
          </section>
        )}

        <section id="how-it-works" className="max-w-6xl mx-auto px-4 md:px-8 pb-4">
          <h2 className={sectionTitle}>{t.rich("stepsTitle", { em })}</h2>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-6">
            {(t.raw("steps") as Array<{ title: string; body: string }>).map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 rounded-[1.5rem] border border-black/10 bg-white p-6 md:p-8"
              >
                <span className="w-9 h-9 shrink-0 rounded-full bg-[var(--color-braun-text)] text-[#f2efe6] font-body text-sm font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span>
                  <span className="block font-body text-lg md:text-xl font-medium text-[var(--color-braun-text)] tracking-tight mb-2">
                    {step.title}
                  </span>
                  <span className="block font-body text-sm md:text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed">
                    {step.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <FAQ title={t.rich("faqTitle", { em })} items={copy.faq} />

        <section className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className={sectionTitle}>{t.rich("relatedTitle", { em })}</h2>
          <div className="grid gap-8 md:grid-cols-2">
            {LANDING_GROUPS.map((group) => (
              <nav key={group} aria-label={t(group)}>
                <h3 className="font-body text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-braun-text)] opacity-35 mb-4">
                  {t(group)}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {LANDINGS.filter(
                    (other) => other.group === group && other.key !== page.key,
                  ).map((other) => (
                    <li key={other.slug}>
                      <Link
                        href={`/${other.slug}`}
                        className="cursor-pointer inline-flex rounded-full border border-black/10 bg-white px-4 py-2 font-body text-sm text-[var(--color-braun-text)] shadow-sm hover:shadow-md hover:text-[var(--color-braun-orange)] transition-all"
                      >
                        {t(`pages.${other.key}.label`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </section>

        <CTA />
      </main>

      <Footer />
    </div>
  );
}
