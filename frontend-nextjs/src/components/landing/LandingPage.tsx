import React from "react";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { SITE_URL } from "@/lib/site";
import {
  COMPARE_ROWS,
  LANDINGS,
  LANDING_GROUPS,
  type Landing,
} from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { Navbar } from "./Navbar";
import { FAQ } from "./FAQ";
import { CTA } from "./CTA";
import { Footer } from "./Footer";
import { Reveal } from "./Reveal";
import { FloorScene } from "./RoomMoments";

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
  "font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight leading-[1.08]";

/** The three reasons each get a surface of their own, the way the home page's moments do. */
const POINT_SURFACES = [
  {
    card: "bg-[var(--color-braun-orange)] text-white",
    number: "bg-white/20",
    body: "opacity-85",
  },
  {
    card: "bg-[#2c2c2c] text-[#f2efe6]",
    number: "bg-white/10",
    body: "opacity-70",
  },
  {
    card: "bg-[#0f5741] text-[#eaf3ef]",
    number: "bg-white/12",
    body: "opacity-75",
  },
];

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
  const steps = t.raw("steps") as Array<{ title: string; body: string }>;

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
        <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-10 md:pb-16 flex flex-col items-center">
          <div className="w-full max-w-4xl text-center flex flex-col items-center mb-12 md:mb-16">
            <h1 className="font-body font-light text-[2.75rem] sm:text-6xl md:text-[4.75rem] text-[var(--color-braun-text)] tracking-tight leading-[1.05] mb-6">
              {t.rich(`pages.${page.key}.title`, { em })}
            </h1>
            <p className="font-body text-[var(--color-braun-text)] opacity-60 text-base md:text-xl leading-relaxed max-w-2xl px-2 mb-10">
              {copy.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
              <Link
                href="/room/public-room"
                className="group relative flex items-center justify-center h-14 md:h-16 px-[5px] bg-[var(--color-braun-bg)] rounded-full shadow-[var(--shadow-braun-raised)] active:shadow-[var(--shadow-braun-pressed)] transition-all cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
              >
                <span className="h-[82%] px-7 md:px-9 rounded-full bg-[var(--color-braun-orange)] shadow-[inset_-1px_-1px_2px_rgba(0,0,0,0.15),inset_1px_1px_3px_rgba(255,255,255,0.4)] flex items-center text-white font-body font-medium uppercase tracking-widest text-xs md:text-sm whitespace-nowrap group-hover:brightness-110 group-active:shadow-[inset_2px_2px_6px_rgba(0,0,0,0.4)] transition-all duration-300">
                  {t("tryIt")}
                </span>
              </Link>
              <Link
                href="/create-room"
                className="cursor-pointer group inline-flex items-center gap-2 font-body text-sm md:text-base font-medium text-[var(--color-braun-text)] opacity-70 hover:opacity-100 transition-opacity"
              >
                {t("create")}
                <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </Link>
            </div>
            <p className="font-body text-xs text-[var(--color-braun-text)] opacity-45 mt-6">
              {t("free")}
            </p>
          </div>

          <figure className="m-0 w-full max-w-[46rem]">
            <div className="bg-white rounded-[1rem] md:rounded-[1.5rem] p-2 md:p-3 shadow-2xl border border-[rgba(0,0,0,0.15)]">
              <div className="flex items-center justify-between gap-2 md:gap-4 px-2 py-1 mb-1">
                <div
                  aria-hidden="true"
                  className="flex gap-1.5 shrink-0 w-[50px] md:w-[70px]"
                >
                  <div className="w-3 h-3 rounded-full bg-[#ed6a5e] border border-[rgba(0,0,0,0.1)]" />
                  <div className="w-3 h-3 rounded-full bg-[#f4bf4f] border border-[rgba(0,0,0,0.1)]" />
                  <div className="w-3 h-3 rounded-full bg-[#61c554] border border-[rgba(0,0,0,0.1)]" />
                </div>
                <Link
                  href="/room/public-room"
                  dir="ltr"
                  className="cursor-pointer flex-1 h-5 md:h-6 rounded md:rounded-md bg-[#f0f0eb] border border-[rgba(0,0,0,0.06)] flex items-center justify-center px-4 overflow-hidden max-w-md"
                >
                  <span className="font-body text-[11px] md:text-xs font-medium text-[var(--color-braun-text)] opacity-50 tracking-wide truncate">
                    {SITE_URL.replace("https://", "")}/room/public-room
                  </span>
                </Link>
                <div className="w-[50px] md:w-[70px] shrink-0" />
              </div>
              <FloorScene className="aspect-square sm:aspect-[4/3] rounded-lg md:rounded-xl border border-[rgba(0,0,0,0.08)]" />
            </div>
          </figure>
        </section>

        <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pb-14 md:pb-24">
          <ul className="grid gap-4 md:grid-cols-3 md:gap-5">
            {copy.points.map((point, index) => {
              const surface = POINT_SURFACES[index % POINT_SURFACES.length];
              return (
                <Reveal as="li" key={point.title} y={20} className="h-full">
                  <article
                    className={`h-full md:min-h-[20rem] flex flex-col rounded-[1.5rem] md:rounded-[2rem] p-7 md:p-9 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.5)] ${surface.card}`}
                  >
                    <span
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-pixel text-2xl leading-none ${surface.number}`}
                    >
                      {index + 1}
                    </span>
                    <h2 className="font-body text-[1.6rem] md:text-[1.85rem] font-medium tracking-tight leading-[1.1] mt-auto pt-10">
                      {point.title}
                    </h2>
                    <p
                      className={`font-body text-base leading-relaxed mt-3 ${surface.body}`}
                    >
                      {point.body}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        </section>

        {page.competitor && them && (
          <section className="w-full max-w-5xl mx-auto px-4 md:px-8 pb-14 md:pb-24">
            <Reveal className="max-w-2xl mb-8 md:mb-12">
              <h2 className={sectionTitle}>
                {t.rich("compareTitle", { name: page.competitor, em })}
              </h2>
            </Reveal>
            <Reveal y={20}>
              <div className="overflow-x-auto rounded-[1.5rem] md:rounded-[2rem] border border-black/10 bg-white shadow-[0_30px_70px_-45px_rgba(0,0,0,0.45)]">
                <table className="w-full min-w-[36rem] border-collapse font-body text-[var(--color-braun-text)]">
                  <thead>
                    <tr>
                      <td className="p-5 md:p-7 w-[28%]" />
                      <th
                        scope="col"
                        className="p-5 md:p-7 text-start align-bottom bg-[#fff4ee]"
                      >
                        <span className="inline-flex items-center gap-2.5 text-lg md:text-xl font-bold tracking-tight">
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-braun-orange)]" />
                          TinyFloor
                        </span>
                      </th>
                      <th
                        scope="col"
                        className="p-5 md:p-7 text-start align-bottom text-lg md:text-xl font-medium tracking-tight opacity-45"
                      >
                        {page.competitor}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((row) => (
                      <tr key={row} className="border-t border-black/[0.06]">
                        <th
                          scope="row"
                          className="p-5 md:p-7 text-start align-top text-[11px] md:text-xs font-bold uppercase tracking-[0.16em] opacity-40"
                        >
                          {t(`rows.${row}`)}
                        </th>
                        <td className="p-5 md:p-7 align-top bg-[#fff4ee] text-base md:text-lg font-medium leading-snug">
                          <span className="flex gap-2.5">
                            <Check
                              aria-hidden="true"
                              className="w-5 h-5 mt-0.5 shrink-0 text-[var(--color-braun-orange)]"
                            />
                            {t(`us.${row}`)}
                          </span>
                        </td>
                        <td className="p-5 md:p-7 align-top text-base md:text-lg leading-snug opacity-55">
                          {them[row]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-body text-xs text-[var(--color-braun-text)] opacity-45 mt-4 px-1">
                {t("checked", { name: page.competitor })}
              </p>
            </Reveal>
          </section>
        )}

        <section
          id="how-it-works"
          className="w-full max-w-6xl mx-auto px-4 md:px-8"
        >
          <Reveal className="max-w-2xl mb-8 md:mb-12">
            <h2 className={sectionTitle}>{t.rich("stepsTitle", { em })}</h2>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => (
              <Reveal as="li" key={step.title} y={16} className="h-full">
                <div className="h-full rounded-[1.5rem] md:rounded-[2rem] border border-black/10 bg-[#f2efe6] p-7 md:p-9">
                  <span className="block font-pixel text-5xl md:text-6xl leading-none text-[var(--color-braun-orange)]">
                    0{index + 1}
                  </span>
                  <span className="block font-body text-xl md:text-2xl font-medium tracking-tight text-[var(--color-braun-text)] mt-8 mb-2">
                    {step.title}
                  </span>
                  <span className="block font-body text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed">
                    {step.body}
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        <FAQ title={t.rich("faqTitle", { em })} items={copy.faq} />

        <section className="w-full max-w-6xl mx-auto px-4 md:px-8">
          <Reveal className="max-w-2xl mb-8 md:mb-12">
            <h2 className={sectionTitle}>{t.rich("relatedTitle", { em })}</h2>
          </Reveal>
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
