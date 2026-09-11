import React from "react";
import { useTranslations } from "next-intl";
import {
  Video,
  Mic,
  MessageSquare,
  Download,
  UserPlus,
  Globe,
  Zap,
  Hand,
  Radio,
  Coffee,
  Link2,
  Sparkles,
  Lock,
  Users,
  CalendarOff,
  Footprints,
} from "lucide-react";
import { OfficeScene, Occupant } from "@/components/OfficeScene";
import { Reveal } from "./Reveal";

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] md:text-sm font-medium";

const frameTone = {
  light: "bg-[#f2efe6] border-black/10",
  glass: "bg-white/95 border-white/60",
  dark: "bg-white/10 border-white/15",
};

const Frame: React.FC<{
  tone: keyof typeof frameTone;
  className?: string;
  children: React.ReactNode;
}> = ({ tone, className = "", children }) => (
  <div
    className={`rounded-2xl border p-2 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.45)] ${frameTone[tone]} ${className}`}
  >
    {children}
  </div>
);

const callChip =
  "cursor-pointer w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0";

const EnterMockup = () => {
  const t = useTranslations("common");
  return (
    <Frame tone="light">
      <OfficeScene
        className="aspect-[4/3] rounded-xl"
        focus="44% 90%"
        zoom="auto 150%"
        occupants={[
          {
            character: "Alex",
            left: "44%",
            top: "68%",
            name: t("you"),
            width: 36,
            stroll: { distance: 150, duration: 7900, pattern: "b" },
          },
        ]}
      />
    </Frame>
  );
};

const CallMockup = () => {
  const t = useTranslations("common");
  return (
    <Frame tone="glass">
      <OfficeScene
        className="aspect-[4/3] rounded-xl"
        focus="52% 88%"
        zoom="auto 160%"
        occupants={[
          {
            character: "Alex",
            left: "38%",
            top: "68%",
            direction: "right",
            name: t("you"),
            width: 36,
          },
          {
            character: "Bob",
            left: "62%",
            top: "68%",
            direction: "left",
            name: "Emma",
            width: 36,
          },
        ]}
      >
        <div className="absolute left-[62%] top-[68%]">
          <div className="absolute bottom-[96px] left-0 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-[#fbfbf9]/95 border border-black/5 shadow-md">
            <span className="w-7 h-7 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center font-body font-bold text-xs text-[var(--color-braun-text)]">
              E
            </span>
            <span
              className={`${callChip} bg-[var(--color-braun-orange)] text-white shadow-sm`}
            >
              <Video className="w-[13px] h-[13px]" />
            </span>
            <span
              className={`${callChip} bg-white border border-black/5 text-[var(--color-braun-text)]`}
            >
              <Mic className="w-[13px] h-[13px]" />
            </span>
            <span
              className={`${callChip} bg-white border border-black/5 text-[var(--color-braun-text)]`}
            >
              <MessageSquare className="w-[13px] h-[13px]" />
            </span>
          </div>
        </div>
      </OfficeScene>
    </Frame>
  );
};

const PresenceMockup = () => {
  const t = useTranslations("common");
  return (
    <Frame tone="dark">
      <OfficeScene
        className="aspect-[4/3] rounded-xl"
        focus="46% 86%"
        zoom="auto 140%"
        occupants={[
          {
            character: "Bob",
            left: "66%",
            top: "14%",
            name: "Emma",
            status: "in_call",
            width: 30,
          },
          { character: "Alex", left: "22%", top: "47%", name: t("you"), width: 32 },
          {
            character: "Amelia",
            left: "80%",
            top: "71%",
            name: "Grace",
            status: "busy",
            width: 32,
          },
          {
            character: "Adam",
            left: "38%",
            top: "81%",
            direction: "left",
            name: "Jack",
            status: "away",
            width: 32,
          },
        ]}
      />
    </Frame>
  );
};

const directory = [
  { id: "design", focus: "40% 55%", locked: false, live: true },
  { id: "founders", focus: "70% 40%", locked: true, live: true },
  { id: "jam", focus: "24% 78%", locked: false, live: false },
];

const RoomsMockup = () => {
  const t = useTranslations("moments");
  return (
    <div className="rounded-2xl overflow-hidden bg-[#fbfbf9] border border-black/10 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.5)]">
      <div className="flex items-baseline justify-between px-4 py-3 border-b border-black/8">
        <span className="font-body text-sm font-semibold text-[var(--color-braun-text)]">
          {t("roomsLabel")}
        </span>
        <span className="font-body text-[11px] text-[var(--color-braun-text)] opacity-45">
          {t("alwaysOn")}
        </span>
      </div>

      {directory.map((room) => (
        <div
          key={room.id}
          className="flex items-center gap-3 px-4 py-3 border-b border-black/8 last:border-b-0"
        >
          <OfficeScene
            className="w-11 h-11 rounded-lg shrink-0"
            focus={room.focus}
            zoom="auto 200px"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-body font-semibold text-[13px] text-[var(--color-braun-text)]">
              <span className="truncate">{t(`directory.${room.id}.name`)}</span>
              {room.locked && <Lock className="w-3 h-3 shrink-0 opacity-45" />}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[11px] text-[var(--color-braun-text)] opacity-50 mt-0.5">
              <Users className="w-3 h-3" />
              {t(`directory.${room.id}.here`)}
            </span>
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              room.live ? "bg-emerald-500" : "bg-black/15"
            }`}
          />
        </div>
      ))}
    </div>
  );
};

const floorLanes: Occupant[] = [
  {
    character: "Bob",
    name: "Emma",
    left: "22%",
    top: "30%",
    width: 30,
    stroll: { distance: 170, duration: 7400, pattern: "a" },
  },
  {
    character: "Amelia",
    name: "Grace",
    left: "68%",
    top: "30%",
    width: 30,
    stroll: { distance: 120, duration: 9100, delay: -2600, pattern: "c" },
  },
  {
    character: "Alex",
    name: "Jack",
    left: "40%",
    top: "62%",
    width: 32,
    stroll: { distance: 210, duration: 10300, delay: -4100, pattern: "b" },
  },
  {
    character: "Adam",
    name: "Noah",
    left: "74%",
    top: "62%",
    width: 32,
    stroll: { distance: 90, duration: 6700, delay: -1500, pattern: "a" },
  },
  {
    character: "Bob",
    name: "Ivy",
    left: "56%",
    top: "88%",
    width: 34,
    stroll: { distance: 160, duration: 8600, delay: -5200, pattern: "c" },
  },
];

const FloorMockup = () => (
  <Frame tone="glass">
    <OfficeScene
      className="aspect-square md:aspect-[4/3] rounded-xl"
      focus="50% 50%"
      zoom="auto 150%"
      occupants={floorLanes}
    />
  </Frame>
);

// Copy for each moment lives under `moments.<id>` in the messages.
const moments = [
  {
    id: "enter",
    icons: [Download, UserPlus, Globe],
    surface: "bg-white text-[var(--color-braun-text)] border border-black/10",
    chip: "bg-[#f2efe6] text-[var(--color-braun-text)]",
    muted: "opacity-70",
    mockup: <EnterMockup />,
  },
  {
    id: "call",
    icons: [Video, Zap, Hand],
    surface: "bg-[var(--color-braun-orange)] text-white border border-black/10",
    chip: "bg-white/20 text-white",
    muted: "opacity-85",
    mockup: <CallMockup />,
  },
  {
    id: "presence",
    icons: [Radio, Coffee, MessageSquare],
    surface: "bg-[#2c2c2c] text-[#f2efe6] border border-white/10",
    chip: "bg-white/10 text-[#f2efe6]",
    muted: "opacity-70",
    mockup: <PresenceMockup />,
  },
  {
    id: "rooms",
    icons: [Globe, Link2, Sparkles],
    surface: "bg-[#0f5741] text-[#eaf3ef] border border-white/10",
    chip: "bg-white/12 text-[#eaf3ef]",
    muted: "opacity-75",
    mockup: <RoomsMockup />,
  },
  {
    id: "floor",
    icons: [CalendarOff, Footprints, Users],
    chip: "bg-white/18 text-white",
    muted: "opacity-85",
    surface: "bg-[#2f4ad0] text-white border border-white/10",
    wide: true,
    mockup: <FloorMockup />,
  },
];

const STACK_STEP = 24;
const STACK_TOP = "max(5.5rem, (100vh - 36rem) / 2)";
const STACK_CARD = "34rem";
const STACK_PACE = "6rem";
const STACK_HOLD = "24vh";

function stackFrame(index: number, count: number): React.CSSProperties {
  const trailing = (count - 1 - index) * STACK_STEP;
  return {
    ["--stack-top" as string]: `calc(${STACK_TOP} + ${index * STACK_STEP}px)`,
    ["--stack-height" as string]: `calc(${STACK_CARD} + ${STACK_PACE} + ${trailing}px)`,
  };
}

export const RoomMoments: React.FC = () => {
  const t = useTranslations("moments");

  return (
    <section
      id="how-it-works"
      aria-labelledby="moments-title"
      className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-10 md:pt-24"
    >
      <Reveal className="max-w-2xl mb-10 md:mb-16">
        <h2
          id="moments-title"
          className="font-body text-[2rem] md:text-5xl font-light text-[var(--color-braun-text)] tracking-tight leading-[1.08]"
        >
          {t.rich("title", {
            em: (chunks) => <span className="font-medium">{chunks}</span>,
          })}
        </h2>
        <p className="font-body text-base md:text-lg text-[var(--color-braun-text)] opacity-55 mt-4 leading-relaxed">
          {t("subtitle")}
        </p>
      </Reveal>

      <div className="flex flex-col gap-5 md:gap-0">
        {moments.map((moment, index) => (
          <div
            key={moment.id}
            className="md:sticky md:top-[var(--stack-top)] md:min-h-[var(--stack-height)]"
            style={stackFrame(index, moments.length)}
          >
            <article
              className={`relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-6 sm:p-8 md:p-10 lg:p-14 min-h-[26rem] md:min-h-[34rem] shadow-[0_30px_70px_-32px_rgba(0,0,0,0.5)] ${
                moment.wide
                  ? "grid gap-8 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-10 lg:gap-14"
                  : "grid gap-8 md:grid-cols-2 md:items-center md:gap-12 lg:gap-16"
              } ${moment.surface}`}
            >
              <div
                className={index % 2 === 1 && !moment.wide ? "md:order-2" : ""}
              >
                <h3 className="font-body text-[1.6rem] sm:text-3xl md:text-[2.4rem] font-medium tracking-tight leading-[1.1] max-w-md">
                  {t(`${moment.id}.title`)}
                </h3>

                <p
                  className={`font-body text-base md:text-lg leading-relaxed max-w-md mt-4 ${moment.muted}`}
                >
                  {t(`${moment.id}.body`)}
                </p>

                <ul className="flex flex-wrap gap-2 mt-7">
                  {moment.icons.map((Icon, chip) => (
                    <Reveal key={chip} as="li" y={10}>
                      <span className={`${chipBase} ${moment.chip}`}>
                        <Icon aria-hidden="true" className="w-4 h-4" />
                        {t(`${moment.id}.chip${chip + 1}`)}
                      </span>
                    </Reveal>
                  ))}
                </ul>
              </div>

              <Reveal y={20} className={index % 2 === 1 ? "md:order-1" : ""}>
                {moment.mockup}
              </Reveal>
            </article>
          </div>
        ))}
        <div
          aria-hidden="true"
          className="hidden md:block"
          style={{ height: STACK_HOLD }}
        />
      </div>
    </section>
  );
};
