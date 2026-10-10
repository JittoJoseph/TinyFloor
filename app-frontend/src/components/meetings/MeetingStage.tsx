"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Headphones, HeadphoneOff, Mic, MicOff, MonitorUp, MonitorX, PhoneOff, UserPlus, Video, VideoOff } from "@/components/ui/icons";
import type { MeetingInfo, MeetingPerson } from "@shared/messages";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/lib/prefs";
import { IconButton } from "@/components/ui/IconButton";
import { FaceStack } from "@/components/ui/Face";
import { Button } from "@/components/motion/button/base";
import { cn } from "@/lib/utils";
import { MeetingTile } from "./MeetingTile";
import { InviteDialog } from "./MeetingDialogs";
import { clock, useElapsed, useMeetingName } from "./hooks";
import { VideoPausedNote } from "./MeetingHours";

const GAP = 12;
/** Tiles the grid shows before the rest fold into "+ n more". */
const MOST_TILES = { wide: 16, narrow: 6 };
/** Tiles are video-shaped, whether there's video in them or a face. */
const ASPECT = 16 / 9;

/** The size of a box, as it changes. */
function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, box] as const;
}

/** The grid that makes this many tiles as big as the box allows: every column count tried, the widest tile kept. */
function fitGrid(count: number, width: number, height: number): { columns: number; tile: number } {
  let best = { columns: 1, tile: 0 };
  for (let columns = 1; columns <= count; columns++) {
    const rows = Math.ceil(count / columns);
    const tile = Math.min((width - (columns - 1) * GAP) / columns, ((height - (rows - 1) * GAP) / rows) * ASPECT);
    if (tile > best.tile) best = { columns, tile };
  }
  return { columns: best.columns, tile: Math.max(96, Math.floor(best.tile)) };
}

/** One tile on the stage: someone (you among them), or a shared screen. */
type Item = { key: string; kind: "person"; member: MeetingPerson; me: boolean } | { key: string; kind: "screen"; id: string; name: string };

/**
 * Inside a meeting (docs/12-meetings.md): everyone in it, you included, laid
 * out the way Meet does. With nothing pinned and no screen shared, a grid that
 * fills the stage; pin someone (or a screen is shared) and that takes the
 * stage, with everyone else in a column beside it (a strip under it on a
 * phone). Only the four most recent speakers' cameras, or the one pinned, are
 * received (meetingStage); everyone else is their face, which costs nothing.
 */
export function MeetingStage({ meeting, office }: { meeting: MeetingInfo; office: string }) {
  const t = useTranslations("meetings");
  const tControls = useTranslations("controls");
  const { user } = useAuth();
  const { mirrorVideo } = usePrefs();
  const { meetingPeers, stage, localStream, micEnabled, cameraEnabled, speakerEnabled, screenStream, alone } = useCall();
  const nameOf = useMeetingName();
  const elapsed = useElapsed(meeting.startedAt);
  const [inviting, setInviting] = useState(false);
  const [areaRef, area] = useBox<HTMLDivElement>();
  const narrow = area.width > 0 && area.width < 640;
  const canShareScreen = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // The stage wants the speakers' video; leaving it, the floor's card wants one small.
  useEffect(() => {
    callManager.setStageMode("stage");
    return () => callManager.setStageMode("mini");
  }, []);

  const peers = new Map(meetingPeers.map((peer) => [peer.id, peer]));
  const me = meeting.members.find((member) => member.id === user?.id);
  const others = meeting.members.filter((member) => member.id !== user?.id);
  // Who gets a tile when not everyone fits: the people on camera, then whoever is talking.
  const onCamera = stage.cameras.flatMap((id) => others.filter((member) => member.id === id));
  const ranked = [
    ...onCamera,
    ...others.filter((member) => !stage.cameras.includes(member.id)).sort((a, b) => Number(b.speaking) - Number(a.speaking) || a.since - b.since),
  ].map((member) => member.id);

  // Everyone in the order they came, you last, the way Meet keeps you in the grid. Tiles
  // hold their places while people talk, so nothing moves under the pointer.
  const people: Item[] = [
    ...[...others].sort((a, b) => a.since - b.since).map((member): Item => ({ key: member.id, kind: "person", member, me: false })),
    ...(me ? [{ key: me.id, kind: "person", member: me, me: true } as Item] : []),
  ];
  /** The first `room` of these that matter most right now, kept in their order; you always among them. */
  const fit = (items: Item[], room: number): { shown: Item[]; hidden: Item[] } => {
    if (items.length <= room) return { shown: items, hidden: [] };
    const keep = new Set<string>(items.filter((item) => item.kind === "screen" || (item.kind === "person" && item.me)).map((item) => item.key));
    for (const id of ranked) if (keep.size < room - 1) keep.add(id);
    return { shown: items.filter((item) => keep.has(item.key)), hidden: items.filter((item) => !keep.has(item.key)) };
  };
  const more = (hidden: Item[], { className, width }: { className?: string; width?: number } = {}) => (
    <div
      key="more"
      className={cn("flex aspect-video shrink-0 flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-muted-foreground [--face-ring:var(--ui-muted)]", className)}
      style={width ? { width } : undefined}
    >
      <FaceStack seeds={hidden.map((item) => (item.kind === "person" ? item.member.id : item.key))} size={28} max={3} more={false} />
      <span className="text-[12.5px] font-medium">{t("more", { count: hidden.length })}</span>
    </div>
  );
  const sharer = stage.screen ? peers.get(stage.screen) : undefined;
  const screen: Item | null = sharer
    ? { key: `${sharer.id}-screen`, kind: "screen", id: sharer.id, name: t("screenOf", { name: others.find((one) => one.id === sharer.id)?.name ?? "" }) }
    : null;
  // What takes the stage: whatever you pinned, else a shared screen.
  const pinned = stage.pinned;
  const focus: Item | null =
    pinned?.kind === "camera"
      ? (people.find((item) => item.kind === "person" && item.member.id === pinned.id) ?? null)
      : screen;
  const beside = focus ? [...(screen && focus !== screen ? [screen] : []), ...people.filter((item) => item !== focus)] : [];

  const tile = (item: Item, { compact = false, className, width }: { compact?: boolean; className?: string; width?: number } = {}) => {
    if (item.kind === "screen") {
      const isPinned = pinned?.kind === "screen" && pinned.id === item.id;
      return (
        <MeetingTile
          key={item.key}
          id={item.key}
          name={item.name}
          video={sharer?.screenStream ?? null}
          speaking={false}
          micOff={false}
          screen
          compact={compact}
          className={className}
          style={width ? { width } : undefined}
          pin={{
            pinned: isPinned,
            label: isPinned ? t("unpin") : t("pin"),
            onToggle: () => callManager.setPin(isPinned ? null : { id: item.id, kind: "screen" }),
          }}
        />
      );
    }
    const { member } = item;
    const peer = peers.get(member.id);
    const isPinned = pinned?.kind === "camera" && pinned.id === member.id;
    const video = item.me ? (cameraEnabled ? localStream : null) : stage.cameras.includes(member.id) && peer?.cameraOn ? peer.camera : null;
    return (
      <MeetingTile
        key={item.key}
        id={member.id}
        name={item.me ? t("you") : member.name}
        video={video}
        speaking={member.speaking}
        micOff={item.me ? !micEnabled : !!peer && !peer.mic}
        mirror={item.me && mirrorVideo}
        compact={compact}
        className={className}
        style={width ? { width } : undefined}
        // You can't pin yourself: your own picture is always yours to see.
        pin={
          item.me
            ? undefined
            : {
                pinned: isPinned,
                label: isPinned ? t("unpin") : t("pin"),
                onToggle: () => callManager.setPin(isPinned ? null : { id: member.id, kind: "camera" }),
              }
        }
      />
    );
  };

  const stageView = () => {
    // Nobody else yet: you, and the way to bring people in.
    if (alone && !screen) {
      return (
        <div className="flex size-full flex-col items-center justify-center gap-5 text-center">
          {me && tile(people[people.length - 1], { className: "aspect-video w-full max-w-[min(100%,640px)]" })}
          <div>
            <p className="text-[15px] font-medium text-foreground">{t("aloneTitle")}</p>
            <Button size="sm" variant="secondary" className="mt-3 h-10 gap-2 px-4 text-[13px]" onClick={() => setInviting(true)}>
              <UserPlus className="size-4" />
              {t("invite")}
            </Button>
          </div>
        </div>
      );
    }

    // Something pinned or shared: it takes the stage, and everyone else waits beside it,
    // as many as the column holds and a count of the rest.
    if (focus) {
      const column = Math.round(Math.min(248, Math.max(176, area.width * 0.2)));
      const strip = 96;
      const room = narrow
        ? Math.max(1, Math.floor((area.width + GAP) / (strip * ASPECT + GAP)))
        : Math.max(1, Math.floor((area.height + GAP) / (column / ASPECT + GAP)));
      const { shown, hidden } = fit(beside, room);
      const sized = narrow ? "h-full aspect-video shrink-0" : "w-full aspect-video shrink-0";
      return (
        <div className={cn("flex size-full gap-3", narrow ? "flex-col" : "flex-row")}>
          {tile(focus, { className: "min-h-0 min-w-0 flex-1" })}
          {beside.length > 0 && (
            <div className={cn("flex shrink-0 justify-center gap-3", narrow ? "flex-row" : "flex-col")} style={narrow ? { height: strip } : { width: column }}>
              {shown.map((item) => tile(item, { compact: true, className: sized }))}
              {hidden.length > 0 && more(hidden, { className: sized })}
            </div>
          )}
        </div>
      );
    }

    // Everyone in a grid, as big as the stage allows.
    const { shown, hidden } = fit(people, narrow ? MOST_TILES.narrow : MOST_TILES.wide);
    const { tile: width } = fitGrid(shown.length + (hidden.length ? 1 : 0), area.width, area.height);
    return (
      <div className="flex size-full flex-wrap content-center items-center justify-center" style={{ gap: GAP }}>
        {shown.map((item) => tile(item, { className: "aspect-video shrink-0", width }))}
        {hidden.length > 0 && more(hidden, { width })}
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col bg-background">
      {/* On a phone, what the bar at the bottom has no room for: which meeting, and how long. */}
      <header className="flex items-center gap-2 px-4 pt-3 sm:hidden">
        <Live />
        <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">{nameOf(meeting, office)}</p>
        <span className="text-[12px] tabular-nums text-muted-foreground">{clock(elapsed)}</span>
        <IconButton label={t("invite")} tone="soft" size="md" onClick={() => setInviting(true)} icon={<UserPlus />} className="ms-auto" />
      </header>
      <VideoPausedNote compact className="mx-auto mt-3 w-fit max-w-[calc(100%-1.5rem)]" />

      <div ref={areaRef} className="relative mx-3 mt-3 min-h-0 flex-1 sm:mx-5">
        {area.width > 0 && stageView()}
      </div>

      {/* The bar, as Meet has it: which meeting on the left, the controls in the middle, who's in on the right. */}
      <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 sm:px-5 sm:pb-4">
        <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
          <Live />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13.5px] font-semibold text-foreground">{nameOf(meeting, office)}</p>
            <p className="text-[12px] tabular-nums text-muted-foreground">
              {clock(elapsed)} · {t("people", { count: meeting.members.length })}
            </p>
          </div>
        </div>

        <div className="col-start-2 flex items-center gap-1.5 rounded-full border border-border bg-card p-1.5 shadow-float">
          <IconButton
            label={micEnabled ? tControls("muteMic") : tControls("unmuteMic")}
            tone={micEnabled ? "soft" : "off"}
            size="lg"
            aria-pressed={!micEnabled}
            onClick={() => callManager.setMic(!micEnabled)}
            icon={micEnabled ? <Mic /> : <MicOff />}
          />
          <IconButton
            label={cameraEnabled ? tControls("cameraOff") : tControls("cameraOn")}
            tone={cameraEnabled ? "solid" : "soft"}
            size="lg"
            aria-pressed={cameraEnabled}
            onClick={() => callManager.setCamera(!cameraEnabled)}
            icon={cameraEnabled ? <Video /> : <VideoOff />}
          />
          {canShareScreen && (
            <IconButton
              label={screenStream ? tControls("stopSharing") : tControls("shareScreen")}
              tone={screenStream ? "solid" : "soft"}
              size="lg"
              aria-pressed={!!screenStream}
              onClick={() => callManager.setScreen(!screenStream)}
              icon={screenStream ? <MonitorX /> : <MonitorUp />}
            />
          )}
          <IconButton
            label={speakerEnabled ? tControls("muteSpeaker") : tControls("unmuteSpeaker")}
            tone={speakerEnabled ? "ghost" : "off"}
            size="lg"
            aria-pressed={!speakerEnabled}
            onClick={() => callManager.setSpeaker(!speakerEnabled)}
            icon={speakerEnabled ? <Headphones /> : <HeadphoneOff />}
          />
          <span className="mx-1 h-6 w-px bg-border" aria-hidden />
          <button
            type="button"
            onClick={() => callManager.leaveMeeting()}
            aria-label={t("leave")}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-destructive px-4 text-[14px] font-semibold text-white outline-none transition-[background-color,transform] hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-destructive/50 active:scale-[0.97]"
          >
            <PhoneOff className="size-4" />
            <span className="max-sm:sr-only">{t("leave")}</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <span className="hidden md:flex [--face-ring:var(--ui-background)]">
            <FaceStack seeds={meeting.members.map((member) => member.id)} size={24} max={4} />
          </span>
          <IconButton label={t("invite")} tone="soft" size="lg" onClick={() => setInviting(true)} icon={<UserPlus />} className="max-sm:hidden" />
        </div>
      </footer>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} meeting={meeting.id} />
    </div>
  );
}

/** The live dot. */
function Live() {
  return (
    <span className="relative flex size-2.5 shrink-0" aria-hidden>
      <span className="absolute inset-0 animate-ping rounded-full bg-ok/60 [animation-duration:2s] motion-reduce:hidden" />
      <span className="relative size-2.5 rounded-full bg-ok" />
    </span>
  );
}
