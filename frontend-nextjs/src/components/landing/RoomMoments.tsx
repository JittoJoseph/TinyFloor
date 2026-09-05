import React from "react";
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
  Lock,
  Link2,
  Sparkles,
  Users,
} from "lucide-react";
import { OfficeScene } from "@/components/OfficeScene";
import { Reveal } from "./Reveal";

const chipBase =
  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] md:text-sm font-medium";

const frameTone = {
  light: "bg-white border-black/10",
  glass: "bg-white/95 border-white/60",
  dark: "bg-white/10 border-white/15",
};

const Frame: React.FC<{
  tone: keyof typeof frameTone;
  children: React.ReactNode;
}> = ({ tone, children }) => (
  <div
    className={`rounded-2xl border p-2 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.45)] ${frameTone[tone]}`}
  >
    {children}
  </div>
);

const EnterMockup = () => (
  <Frame tone="light">
    <OfficeScene
      className="aspect-[4/3] rounded-xl"
      focus="44% 78%"
      zoom="auto 500px"
      occupants={[
        {
          character: "Alex",
          left: "44%",
          top: "82%",
          direction: "right",
          running: true,
          name: "You",
          width: 36,
        },
      ]}
    />
  </Frame>
);

const CallMockup = () => (
  <Frame tone="glass">
    <OfficeScene
      className="aspect-[4/3] rounded-xl"
      focus="52% 78%"
      zoom="auto 540px"
      occupants={[
        {
          character: "Alex",
          left: "38%",
          top: "80%",
          direction: "right",
          name: "You",
          width: 36,
        },
        {
          character: "Bob",
          left: "62%",
          top: "80%",
          direction: "left",
          name: "Emma",
          width: 36,
        },
      ]}
    >
      <div className="absolute left-[62%] top-[80%]">
        <div className="absolute bottom-[106px] left-0 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-[#fbfbf9]/95 border border-black/5 shadow-md">
          <span className="w-7 h-7 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center font-body font-bold text-xs text-[var(--color-braun-text)]">
            E
          </span>
          <span className="w-7 h-7 rounded-full bg-[var(--color-braun-orange)] flex items-center justify-center text-white shadow-sm">
            <Video className="w-[13px] h-[13px]" />
          </span>
          <span className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center text-[var(--color-braun-text)]">
            <Mic className="w-[13px] h-[13px]" />
          </span>
          <span className="w-7 h-7 rounded-full bg-white border border-black/5 flex items-center justify-center text-[var(--color-braun-text)]">
            <MessageSquare className="w-[13px] h-[13px]" />
          </span>
        </div>
      </div>
    </OfficeScene>
  </Frame>
);

const PresenceMockup = () => (
  <Frame tone="dark">
    <OfficeScene
      className="aspect-[4/3] rounded-xl"
      focus="46% 74%"
      zoom="auto 460px"
      occupants={[
        { character: "Alex", left: "22%", top: "56%", name: "You", width: 32 },
        {
          character: "Bob",
          left: "64%",
          top: "50%",
          direction: "left",
          name: "Emma",
          status: "in_call",
          width: 32,
        },
        {
          character: "Amelia",
          left: "80%",
          top: "80%",
          direction: "down",
          name: "Grace",
          status: "busy",
          width: 32,
        },
        {
          character: "Adam",
          left: "40%",
          top: "92%",
          direction: "up",
          name: "Jack",
          status: "away",
          width: 32,
        },
      ]}
    />
  </Frame>
);

const RoomsMockup = () => (
  <div className="flex flex-col gap-3">
    <div className="rounded-2xl bg-[#fbfbf9] border border-black/10 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.5)] p-3.5 flex items-center gap-3">
      <OfficeScene className="w-14 h-14 rounded-xl shrink-0" focus="40% 55%" />
      <span className="min-w-0 flex-1">
        <span className="block font-body font-semibold text-sm text-[var(--color-braun-text)] truncate">
          Design team
        </span>
        <span className="flex items-center gap-1.5 font-body text-[11px] text-[var(--color-braun-text)] opacity-50 mt-0.5">
          <Users className="w-3 h-3" />5 here
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          Public
        </span>
      </span>
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
    </div>

    <div className="rounded-2xl bg-[#fbfbf9] border border-black/10 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.5)] p-3.5 flex items-center gap-3">
      <OfficeScene className="w-14 h-14 rounded-xl shrink-0" focus="70% 40%" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-body font-semibold text-sm text-[var(--color-braun-text)]">
          <Lock className="w-3 h-3 opacity-50" />
          Founders
        </span>
        <span className="flex items-center gap-1.5 font-body text-[11px] text-[var(--color-braun-text)] opacity-50 mt-0.5">
          <Users className="w-3 h-3" />2 here
          <span className="w-1 h-1 rounded-full bg-current opacity-40" />
          Private
        </span>
      </span>
      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
    </div>

    <div className="rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center gap-2">
      <span className="flex-1 min-w-0 rounded-xl bg-black/20 px-3 py-2 font-body text-[11px] text-white/70 truncate">
        Invite link copied
      </span>
      <span className="w-9 h-9 rounded-xl bg-white text-[var(--color-braun-text)] flex items-center justify-center shrink-0 shadow-sm">
        <Link2 className="w-4 h-4" />
      </span>
    </div>
  </div>
);

const moments = [
  {
    id: "enter",
    title: "Open a link and you are inside.",
    body: "Someone shares a room link. Pick a character, type a name, and you are standing on the floor with everyone else.",
    chips: [
      { icon: Download, label: "No download" },
      { icon: UserPlus, label: "Guests welcome" },
      { icon: Globe, label: "Any browser" },
    ],
    surface:
      "bg-[#f2efe6] text-[var(--color-braun-text)] border border-black/10",
    chip: "bg-black/[0.05] text-[var(--color-braun-text)]",
    muted: "opacity-70",
    mockup: <EnterMockup />,
  },
  {
    id: "call",
    title: "Walk over to start talking.",
    body: "Get close to a teammate and their call bar appears above them. One tap opens video or voice, straight between browsers.",
    chips: [
      { icon: Video, label: "Video or voice" },
      { icon: Zap, label: "Peer to peer" },
      { icon: Hand, label: "One tap" },
    ],
    surface: "bg-[var(--color-braun-orange)] text-white border border-black/10",
    chip: "bg-white/20 text-white",
    muted: "opacity-85",
    mockup: <CallMockup />,
  },
  {
    id: "presence",
    title: "You can tell who is around.",
    body: "Everyone carries a nameplate and a status. See who is free, who is heads down and who is already on a call before you walk up.",
    chips: [
      { icon: Radio, label: "Live nameplates" },
      { icon: Coffee, label: "Away and busy" },
      { icon: MessageSquare, label: "Room chat" },
    ],
    surface: "bg-[#2c2c2c] text-[#f2efe6] border border-white/10",
    chip: "bg-white/10 text-[#f2efe6]",
    muted: "opacity-70",
    mockup: <PresenceMockup />,
  },
  {
    id: "rooms",
    title: "The room is still there tomorrow.",
    body: "Rooms do not end when a meeting does. Keep one open for your team, make it public or lock it behind a password, and send the link once.",
    chips: [
      { icon: Globe, label: "Public or private" },
      { icon: Link2, label: "Share by link" },
      { icon: Sparkles, label: "Free" },
    ],
    surface: "bg-[#0f5741] text-[#eaf3ef] border border-white/10",
    chip: "bg-white/12 text-[#eaf3ef]",
    muted: "opacity-75",
    mockup: <RoomsMockup />,
  },
];

export const RoomMoments: React.FC = () => (
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
        An office you can <span className="font-medium">walk around in.</span>
      </h2>
      <p className="font-body text-base md:text-lg text-[var(--color-braun-text)] opacity-55 mt-4 leading-relaxed">
        SpatialMeet keeps the part of an office that calls never replaced:
        knowing who is there, and being able to walk over.
      </p>
    </Reveal>

    <div className="flex flex-col gap-5 md:gap-0">
      {moments.map((moment, index) => (
        <div
          key={moment.id}
          className="md:sticky md:min-h-screen"
          style={{
            top: `calc(max(5.5rem, (100vh - 36rem) / 2) + ${index * 24}px)`,
          }}
        >
          <article
            className={`relative overflow-hidden rounded-[1.5rem] md:rounded-[2rem] p-6 sm:p-8 md:p-10 lg:p-14 md:min-h-[34rem] shadow-[0_30px_70px_-32px_rgba(0,0,0,0.5)] grid gap-8 md:grid-cols-2 md:items-center md:gap-12 lg:gap-16 ${moment.surface}`}
          >
            <div className={index % 2 === 1 ? "md:order-2" : ""}>
              <h3 className="font-body text-[1.6rem] sm:text-3xl md:text-[2.4rem] font-medium tracking-tight leading-[1.1] mb-4 max-w-md">
                {moment.title}
              </h3>

              <p
                className={`font-body text-base md:text-lg leading-relaxed max-w-md ${moment.muted}`}
              >
                {moment.body}
              </p>

              <ul className="flex flex-wrap gap-2 mt-7">
                {moment.chips.map((chip, chipIndex) => (
                  <Reveal
                    key={chip.label}
                    as="li"
                    y={10}
                    delay={120 + chipIndex * 90}
                  >
                    <span className={`${chipBase} ${moment.chip}`}>
                      <chip.icon aria-hidden="true" className="w-4 h-4" />
                      {chip.label}
                    </span>
                  </Reveal>
                ))}
              </ul>
            </div>

            <Reveal
              y={20}
              delay={80}
              className={index % 2 === 1 ? "md:order-1" : ""}
            >
              {moment.mockup}
            </Reveal>
          </article>
        </div>
      ))}
      <div aria-hidden="true" className="hidden md:block h-[75vh]" />
    </div>
  </section>
);
