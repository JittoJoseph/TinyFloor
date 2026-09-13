import React from "react";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  CalendarOff,
  Coffee,
  Copy,
  DoorOpen,
  Eye,
  Footprints,
  Globe,
  GraduationCap,
  Link2,
  Map as MapIcon,
  PenLine,
  Radio,
  ServerOff,
  ShieldCheck,
  Smartphone,
  Sun,
  TimerOff,
  UserPlus,
  Users,
  Video,
  VolumeX,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { SITE_URL } from "@/lib/site";
import {
  COMPARE_ROWS,
  LANDINGS,
  LANDING_GROUPS,
  type Landing,
  type LandingKey,
} from "@/lib/landings";
import { faqNode, pageGraph } from "@/lib/structured-data";
import { JsonLd } from "@/components/JsonLd";
import { OfficeScene } from "@/components/OfficeScene";
import { PixelAvatar } from "@/components/PixelAvatar";
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

/** An icon for each of a page's three reasons, in the order its copy lists them. */
const POINT_ICONS: Record<LandingKey, [LucideIcon, LucideIcon, LucideIcon]> = {
  gather: [CalendarOff, Globe, UserPlus],
  kumospace: [Users, DoorOpen, Smartphone],
  spatialchat: [TimerOff, Building2, Footprints],
  workadventure: [Users, MapIcon, ServerOff],
  wonder: [Footprints, Globe, Sun],
  virtualOffice: [Eye, Zap, Video],
  virtualCoworking: [Coffee, DoorOpen, Radio],
  onlineStudyRoom: [VolumeX, Users, PenLine],
  virtualClassroom: [GraduationCap, Users, PenLine],
  proximityChat: [Footprints, Users, ShieldCheck],
};

const ICON_TONES = [
  "bg-[var(--color-braun-orange)] text-white",
  "bg-[var(--color-braun-text)] text-[#f2efe6]",
  "bg-[#0f5741] text-[#eaf3ef]",
];

const ROOM_LINK = `${SITE_URL.replace("https://", "")}/room/public-room`;

const PICKER = ["Adam", "Amelia", "Alex", "Bob"];

const StepLink = () => (
  <div className="h-full flex flex-col items-center justify-center gap-4 px-5">
    <span className="w-11 h-11 rounded-xl bg-[var(--color-braun-orange)] text-white flex items-center justify-center">
      <DoorOpen aria-hidden="true" className="w-5 h-5" />
    </span>
    <span
      dir="ltr"
      className="w-full max-w-[17rem] flex items-center gap-2 rounded-xl border border-black/10 bg-[#f0f0eb] p-1.5 ps-3"
    >
      <Link2
        aria-hidden="true"
        className="w-3.5 h-3.5 shrink-0 text-[var(--color-braun-text)] opacity-45"
      />
      <span className="flex-1 min-w-0 truncate font-body text-[11px] font-medium text-[var(--color-braun-text)] opacity-60">
        {ROOM_LINK}
      </span>
      <span className="w-7 h-7 shrink-0 rounded-lg bg-[var(--color-braun-text)] text-[#f2efe6] flex items-center justify-center">
        <Copy aria-hidden="true" className="w-3.5 h-3.5" />
      </span>
    </span>
  </div>
);

const StepCharacter = () => (
  <div className="h-full flex flex-col items-center justify-center gap-4 px-5">
    <div className="flex gap-2">
      {PICKER.map((character, index) => (
        <span
          key={character}
          className={`relative w-12 h-14 rounded-xl border ${
            index === 1
              ? "border-[var(--color-braun-orange)] bg-[#fff4ee] ring-2 ring-[#ff4e00]/20"
              : "border-black/10 bg-[#fbfbf9]"
          }`}
        >
          <PixelAvatar
            character={character}
            width={24}
            style={{ left: "50%", top: "96%" }}
          />
        </span>
      ))}
    </div>
    <span className="w-full max-w-[13.5rem] flex items-center rounded-lg border border-black/10 bg-[#f0f0eb] px-3 py-2 font-body text-xs font-medium text-[var(--color-braun-text)]">
      Grace
      <span className="ms-0.5 w-px h-3.5 bg-[var(--color-braun-orange)]" />
    </span>
  </div>
);

const StepTalk = () => (
  <OfficeScene
    className="w-full h-full"
    focus="46% 62%"
    zoom="auto 400px"
    occupants={[
      {
        character: "Alex",
        left: "40%",
        top: "86%",
        direction: "right",
        name: "Jack",
        status: "in_call",
        width: 30,
      },
      {
        character: "Amelia",
        left: "60%",
        top: "86%",
        direction: "left",
        name: "Grace",
        status: "in_call",
        width: 30,
      },
    ]}
  />
);

const STEP_VISUALS = [StepLink, StepCharacter, StepTalk];

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
  const icons = POINT_ICONS[page.key];

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
        <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10 flex flex-col items-center">
          <div className="w-full max-w-4xl text-center flex flex-col items-center mb-12 md:mb-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 font-body text-sm font-medium text-[var(--color-braun-text)] mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-braun-orange)]" />
              {t(`pages.${page.key}.label`)}
            </span>
            <h1 className="font-body font-light text-[2.75rem] sm:text-6xl md:text-[4.75rem] text-[var(--color-braun-text)] tracking-tight leading-[1.05] mb-6 text-balance">
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

          <figure className="m-0 w-[calc(100%+1rem)] -mx-2 md:mx-0 md:w-full max-w-5xl">
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
                  className="cursor-pointer flex-1 h-5 md:h-6 rounded md:rounded-md bg-[#f0f0eb] border border-[rgba(0,0,0,0.06)] flex items-center justify-center px-4 overflow-hidden max-w-xl"
                >
                  <span className="font-body text-[11px] md:text-xs font-medium text-[var(--color-braun-text)] opacity-50 tracking-wide truncate">
                    {ROOM_LINK}
                  </span>
                </Link>
                <div className="w-[50px] md:w-[70px] shrink-0" />
              </div>
              <FloorScene className="aspect-square sm:aspect-[4/3] rounded-lg md:rounded-xl border border-[rgba(0,0,0,0.08)]" />
            </div>
          </figure>
        </section>

        <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 md:pt-24">
          <ul className="grid md:grid-cols-3 rounded-[1.5rem] md:rounded-[2rem] border border-black/10 bg-[#f2efe6] overflow-hidden">
            {copy.points.map((point, index) => {
              const Icon = icons[index % icons.length];
              return (
                <Reveal
                  as="li"
                  key={point.title}
                  y={16}
                  className={`p-7 md:p-9 lg:p-10 ${
                    index > 0
                      ? "border-t md:border-t-0 md:border-s border-black/10"
                      : ""
                  }`}
                >
                  <span
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      ICON_TONES[index % ICON_TONES.length]
                    }`}
                  >
                    <Icon aria-hidden="true" className="w-5 h-5" />
                  </span>
                  <h2 className="font-body text-xl md:text-2xl font-medium text-[var(--color-braun-text)] tracking-tight leading-snug mt-6 mb-2">
                    {point.title}
                  </h2>
                  <p className="font-body text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed">
                    {point.body}
                  </p>
                </Reveal>
              );
            })}
          </ul>
        </section>

        {page.competitor && them && (
          <section className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 md:pt-24">
            <Reveal className="max-w-2xl mb-8 md:mb-12">
              <h2 className={sectionTitle}>
                {t.rich("compareTitle", { name: page.competitor, em })}
              </h2>
            </Reveal>
            <Reveal y={16}>
              <div className="hidden sm:block overflow-hidden rounded-[1.5rem] border border-black/10 bg-white">
                <table className="w-full table-fixed border-collapse font-body text-[var(--color-braun-text)]">
                  <thead>
                    <tr className="border-b border-black/10">
                      <td className="w-[28%] px-6 py-5" />
                      <th
                        scope="col"
                        className="px-6 py-5 text-start bg-[#ff4e00]/[0.05]"
                      >
                        <span className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
                          <span className="w-2 h-2 rounded-full bg-[var(--color-braun-orange)]" />
                          TinyFloor
                        </span>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-5 text-start text-base font-semibold tracking-tight opacity-50"
                      >
                        {page.competitor}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARE_ROWS.map((row, index) => (
                      <tr
                        key={row}
                        className={`border-b border-black/[0.06] last:border-0 ${
                          index % 2 === 1 ? "bg-black/[0.018]" : ""
                        }`}
                      >
                        <th
                          scope="row"
                          className="px-6 py-5 text-start align-top text-[15px] font-normal opacity-60"
                        >
                          {t(`rows.${row}`)}
                        </th>
                        <td className="px-6 py-5 align-top bg-[#ff4e00]/[0.05] text-[15px] font-medium leading-snug">
                          {t(`us.${row}`)}
                        </td>
                        <td className="px-6 py-5 align-top text-[15px] leading-snug opacity-55">
                          {them[row]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <dl className="sm:hidden overflow-hidden rounded-[1.25rem] border border-black/10 bg-white font-body text-[var(--color-braun-text)]">
                <div className="grid grid-cols-2 border-b border-black/10 text-sm font-semibold tracking-tight">
                  <span className="flex items-center gap-2 px-4 py-3.5 bg-[#ff4e00]/[0.05]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-braun-orange)]" />
                    TinyFloor
                  </span>
                  <span className="px-4 py-3.5 opacity-50">
                    {page.competitor}
                  </span>
                </div>
                {COMPARE_ROWS.map((row) => (
                  <div
                    key={row}
                    className="border-b border-black/[0.06] last:border-0"
                  >
                    <dt className="px-4 pt-3.5 pb-1 text-xs font-medium opacity-50">
                      {t(`rows.${row}`)}
                    </dt>
                    <dd className="grid grid-cols-2 text-sm leading-snug">
                      <span className="px-4 pb-3.5 pt-1 font-medium">
                        {t(`us.${row}`)}
                      </span>
                      <span className="px-4 pb-3.5 pt-1 opacity-55">
                        {them[row]}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="font-body text-xs text-[var(--color-braun-text)] opacity-45 mt-4 px-1">
                {t("checked", { name: page.competitor })}
              </p>
            </Reveal>
          </section>
        )}

        <section
          id="how-it-works"
          className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-14 md:pt-24"
        >
          <Reveal className="max-w-2xl mb-8 md:mb-12">
            <h2 className={sectionTitle}>{t.rich("stepsTitle", { em })}</h2>
          </Reveal>
          <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
            {steps.map((step, index) => {
              const Visual = STEP_VISUALS[index % STEP_VISUALS.length];
              return (
                <Reveal as="li" key={step.title} y={16} className="h-full">
                  <div className="h-full flex flex-col rounded-[1.5rem] border border-black/10 bg-[#f2efe6] p-2.5">
                    <div
                      aria-hidden="true"
                      className="h-44 md:h-48 overflow-hidden rounded-[1.1rem] border border-black/[0.08] bg-white"
                    >
                      <Visual />
                    </div>
                    <div className="px-4 md:px-5 pt-5 pb-4 md:pb-5">
                      <span className="flex items-center gap-3">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-[var(--color-braun-text)] text-[#f2efe6] font-body text-xs font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-body text-xl font-medium tracking-tight text-[var(--color-braun-text)]">
                          {step.title}
                        </span>
                      </span>
                      <span className="block font-body text-base text-[var(--color-braun-text)] opacity-60 leading-relaxed mt-3">
                        {step.body}
                      </span>
                    </div>
                  </div>
                </Reveal>
              );
            })}
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
