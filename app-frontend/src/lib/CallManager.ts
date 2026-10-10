import { onPrefsChange, prefs } from "./prefs";
import type {
  CallKind,
  MediaFlags,
  ServerMessage,
  VideoKind,
  VideoQuality,
} from "@shared/messages";
import type { RoomSocket } from "./RoomSocket";
import { api } from "@/lib/api";
import {
  CAMERA_CAPTURE,
  SCREEN_CAPTURE,
  deviceConstraint,
  savedDevices,
  screenTooSmallForDetail,
  preferRedundantAudio,
  sendAtQuality,
  udpRelay,
} from "./media";
import { SfuMeeting, type MeetingPeer } from "./SfuMeeting";
import { chooseStage, EMPTY_STAGE, sameStage, type Pin, type Stage, type StageMode } from "./meetingStage";
import { meetingsState, setMeetings, setSpeaking, subscribeMeetings, WALK_TO_MEETING_EVENT } from "./meetings";
import { VoiceActivity } from "./voiceActivity";
import { playSound, loopSound, stopSound } from "./sounds";
import { isSpeakerMuted, onSpeakerChange, setSpeakerMuted } from "./speaker";

// Error codes, not copy: the call overlay turns them into translated text.
export type CallError = "connection" | "unsupported" | "media" | "camera";

/**
 * How a ring ended without a call, said for a moment afterwards: to the caller
 * (turned down, busy, or no answer) and to whoever was rung and missed it.
 */
export interface CallOutcome {
  id: string;
  name: string;
  kind: "declined" | "busy" | "unanswered" | "missed";
}

export interface CallPeer {
  id: string;
  name: string;
  stream: MediaStream;
  connected: boolean;
  mic: boolean;
  camera: boolean;
  screen: boolean;
  screenStream: MediaStream | null;
}

/** Someone asking you into their meeting. */
export interface MeetingInvite {
  from: string;
  fromName: string;
  meeting: string;
  name: string | null;
}

/** Something to say about your meeting for a moment: you walked out of the room, or it had ended. */
export interface MeetingNotice {
  kind: "walked_out" | "ended";
  meeting: string;
}

export interface CallSnapshot {
  incoming: { id: string; name: string } | null;
  outgoing: { id: string; name: string } | null;
  /** Who you are on a one-to-one call with (a call is two people; more is a meeting). */
  peers: CallPeer[];
  /** Everyone else in your meeting, with their voice and, when shown, their video. */
  meetingPeers: MeetingPeer[];
  /** Whose video the meeting shows right now, and whose screen. */
  stage: Stage;
  /** A meeting you were just asked into. */
  invite: MeetingInvite | null;
  notice: MeetingNotice | null;
  /** Whether you are the only one in your meeting, so nothing you do is being sent. */
  alone: boolean;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  meeting: string | null;
  error: CallError | null;
  outcome: CallOutcome | null;
}

interface Signal {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  media?: { mic: boolean; camera: boolean; screen?: boolean };
  /** The quality the other side's cards can show, so we send no more than that. */
  want?: Record<VideoKind, VideoQuality>;
  /** The answerer's relay needs TCP or TLS: the offerer gathers again. */
  restart?: boolean;
}

interface PeerEntry extends CallPeer {
  pc?: RTCPeerConnection;
  /** What they asked us for, and what we last asked them for. */
  wants: Record<VideoKind, VideoQuality>;
  asked?: string;
  offerer?: boolean;
  /** The relay gave us a UDP address, so UDP isn't blocked on our side. */
  gathered?: boolean;
  /** Offered the relay's TCP and TLS addresses too, once UDP didn't connect. */
  widened?: boolean;
  fallback?: ReturnType<typeof setTimeout>;
}

/** Which card is enlarged, and so the only one worth sending in high quality. */
export interface Focus {
  id: string;
  kind: VideoKind;
}

const LOW: Record<VideoKind, VideoQuality> = { camera: "low", screen: "low" };

interface MeetingMember {
  id: string;
  name?: string;
}

type CallMessage = Extract<ServerMessage, { t: "call" }>;
type MeetingMessage = Extract<
  ServerMessage,
  {
    t:
      | "meeting_joined"
      | "meeting_member_joined"
      | "meeting_member_left"
      | "meetings"
      | "speaking"
      | "meeting_invited"
      | "meeting_error"
      | "sfu";
  }
>;

const RELAY_ONLY: RTCIceTransportPolicy = "relay";
/** No UDP address from the relay by now: this network blocks UDP, so TCP and TLS join. */
const UDP_GRACE_MS = 3500;
/** A UDP address but still no connection by now: the other end may be the one blocked. */
const UDP_SLOW_MS = 10_000;
/** Credentials are refreshed this long before they expire. */
const ICE_REFRESH_MARGIN_MS = 15 * 60 * 1000;
const RING_TIMEOUT = 30000;
/** How long a meeting invitation waits for an answer. */
const INVITE_TIMEOUT = 30000;
/** What the browser does to your voice, as your settings ask (lib/prefs.ts). */
function audioConstraints() {
  const { echoCancellation, noiseSuppression } = prefs();
  return { echoCancellation, noiseSuppression, autoGainControl: true };
}
// Every connection carries the same slots in the same order on both ends, so a
// track's slot says what it is: the mic, the camera or a shared screen.
const SLOTS = ["audio", "video", "video"] as const;
const SLOT_KIND: Record<number, VideoKind> = { 1: "camera", 2: "screen" };
const SCREEN_SLOT = 2;

const PREFS_KEY = "spacialMeetCallPrefs";

/** Whether your microphone was on last time. The camera is not remembered: every call starts without it. */
function micPreference() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}").mic !== false;
  } catch {
    return true;
  }
}

function saveMicPreference(mic: boolean) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mic }));
  } catch {}
}

const EMPTY: CallSnapshot = {
  incoming: null,
  outgoing: null,
  peers: [],
  meetingPeers: [],
  stage: EMPTY_STAGE,
  invite: null,
  notice: null,
  alone: true,
  localStream: null,
  screenStream: null,
  micEnabled: true,
  cameraEnabled: false,
  speakerEnabled: true,
  meeting: null,
  error: null,
  outcome: null,
};

const MIC_ON = typeof window === "undefined" ? true : micPreference();

/**
 * A call is two people, on one WebRTC connection through the TURN relay (see
 * RELAY_ONLY), over UDP unless the network blocks it (widenRelay), with the
 * voice sent redundantly so a lost packet isn't heard (preferRedundantAudio). It starts with voice, and the camera and a shared screen are
 * there to switch on, never on by themselves. One side offers and the other
 * answers, so two offers never cross. The connection carries a fixed mic,
 * camera and screen slot, and switching any of them swaps what is in the slot
 * instead of renegotiating.
 *
 * Three or more people is a meeting: the room's, through the SFU (SfuMeeting),
 * with only the speakers' video received (meetingStage) and your talking
 * reported so everyone can see who speaks (VoiceActivity).
 */
class CallManager {
  private ws: RoomSocket | null = null;
  private peers = new Map<string, PeerEntry>();
  private sfu: SfuMeeting | null = null;
  /** The place is past its meeting hours: meetings are voice only (docs/14). */
  private videoPaused = false;
  private local: MediaStream | null = null;
  /** Voice settings being applied to an open call, one change after another. */
  private voiceChange: Promise<void> = Promise.resolve();
  private voiceApplied = "";
  private screen: MediaStream | null = null;
  private incoming: { id: string; name: string } | null = null;
  private outgoing: { id: string; name: string } | null = null;
  private micEnabled = MIC_ON;
  private cameraEnabled = false;
  /** The camera, chosen before joining (the Meetings page, as Meet asks): on for the next meeting you go into. */
  private cameraOnJoin = false;
  private meeting: string | null = null;
  /** Whose video the meeting shows, and where it is being looked at. */
  private stage: Stage = EMPTY_STAGE;
  /** Who we are on this floor, to leave ourselves off the stage. */
  private selfId: string | null = null;
  /** HD video in meetings: the office's plan has it (Pro). */
  private hd = false;
  private stageTimer?: ReturnType<typeof setTimeout>;
  private stageMode: StageMode = "mini";
  /** What you pinned on the stage, if anything. */
  private pin: Pin | null = null;
  private invitation: MeetingInvite | null = null;
  private inviteTimer?: ReturnType<typeof setTimeout>;
  private notice: MeetingNotice | null = null;
  private noticeTimer?: ReturnType<typeof setTimeout>;
  private readonly voice = new VoiceActivity((on) => this.ws?.send({ t: "speaking", on }));
  private error: CallError | null = null;
  private outcome: CallOutcome | null = null;
  private outcomeTimer?: ReturnType<typeof setTimeout>;
  private ringTimer?: ReturnType<typeof setTimeout>;
  /** Cloudflare TURN credentials, fetched on the floor; empty until they arrive. */
  private iceServers: RTCIceServer[] = [];
  private focus: Focus | null = null;
  private iceTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private snap: CallSnapshot = {
    ...EMPTY,
    micEnabled: MIC_ON,
    speakerEnabled: !isSpeakerMuted(),
  };

  constructor() {
    onSpeakerChange(() => this.emit());
    // Who is talking changes whose video is worth receiving.
    subscribeMeetings(() => {
      if (this.sfu) this.refreshStage();
    });
    // A phone turned sideways, or a window resized past the phone width.
    if (typeof window !== "undefined") {
      window.matchMedia("(max-width: 767px)").addEventListener("change", () => {
        this.shareQuality();
        this.refreshStage();
      });
      // A tab in the background shows nothing, so it receives no video.
      document.addEventListener("visibilitychange", () => this.refreshStage());
      // Voice settings reach the call that is already open, not only the next.
      onPrefsChange(() => {
        this.voiceChange = this.voiceChange.then(() => this.applyVoicePrefs());
      });
    }
  }

  attach(ws: RoomSocket) {
    this.ws = ws;
    void this.loadIceServers();
  }

  detach() {
    this.leaveMeeting(false);
    this.hangUp();
    stopSound("ring");
    clearTimeout(this.iceTimer);
    this.ws = null;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  getServerSnapshot = () => EMPTY;

  isPeer(id: string) {
    return this.peers.has(id);
  }

  /** Calls someone, with voice. A call is two people: a third makes it a meeting (startMeeting). */
  invite(id: string, name: string) {
    if (this.busy() || this.peers.size || !this.ws) return;

    this.error = null;
    this.outcome = null;
    this.outgoing = { id, name };
    loopSound("ring");

    this.send("invite", id);
    this.ring(() => {
      this.tell({ id, name, kind: "unanswered" });
      this.cancel();
    });
    this.emit();
  }

  async accept() {
    const call = this.incoming;
    if (!call) return;

    this.clearRing();
    stopSound("ring");
    this.incoming = null;

    this.createPeer(call.id, call.name, false);
    this.send("accept", call.id);
    this.emit();

    await this.startCall(call.id);
  }

  /** Turns the ring down; left to ring out, it counts as missed on both ends. */
  decline(reason: "declined" | "missed" = "declined") {
    if (!this.incoming) return;
    this.clearRing();
    stopSound("ring");
    this.send("decline", this.incoming.id, { reason });
    if (reason === "missed") this.tell({ ...this.incoming, kind: "missed" });
    this.incoming = null;
    this.emit();
  }

  /** Puts the last word on the screen for a moment, then takes it away. */
  dismissOutcome() {
    clearTimeout(this.outcomeTimer);
    this.outcome = null;
    this.emit();
  }

  private tell(outcome: CallOutcome) {
    clearTimeout(this.outcomeTimer);
    this.outcome = outcome;
    this.outcomeTimer = setTimeout(() => this.dismissOutcome(), outcome.kind === "missed" ? 9000 : 3500);
  }

  cancel() {
    if (!this.outgoing) return;
    this.clearRing();
    stopSound("ring");
    this.send("end", this.outgoing.id);
    this.outgoing = null;
    this.emit();
  }

  hangUp(id?: string) {
    const targets = id ? [id] : [...this.peers.keys()];
    targets.forEach((peerId) => {
      this.send("end", peerId);
      this.closePeer(peerId);
    });
    if (!id) {
      this.cancel();
      this.decline();
    }
    this.emit();
  }

  dropPeer(id: string) {
    if (this.incoming?.id === id) {
      // They gave up before we answered.
      this.clearRing();
      stopSound("ring");
      this.tell({ ...this.incoming, kind: "missed" });
      this.incoming = null;
    }
    if (this.outgoing?.id === id) {
      this.clearRing();
      this.outgoing = null;
    }
    this.closePeer(id);
    this.sfu?.removeMember(id);
    this.emit();
  }

  handleCall({ kind, from, fromName, data }: CallMessage) {
    if (!from) return;
    const payload = (data ?? {}) as Record<string, unknown>;

    switch (kind) {
      case "invite":
        this.onInvite(from, fromName);
        break;
      case "accept":
        void this.onAccept(from);
        break;
      case "decline":
        if (this.outgoing?.id === from) {
          const kind = payload.reason === "busy" ? "busy" : payload.reason === "missed" ? "unanswered" : "declined";
          this.tell({ ...this.outgoing, kind });
          this.cancelOutgoing();
        }
        break;
      case "signal":
        void this.onSignal(from, payload.signal as Signal);
        break;
      case "end":
        this.dropPeer(from);
        break;
    }
  }

  /** What the room says about meetings: yours through the SFU, everyone's for the lists. */
  handleMeeting(message: MeetingMessage) {
    switch (message.t) {
      case "meeting_joined":
        void this.enterMeeting(message.meeting, message.members);
        break;
      case "meeting_member_joined":
        this.sfu?.addMember(message.id, message.name);
        break;
      case "meeting_member_left":
        this.sfu?.removeMember(message.id);
        break;
      case "meetings":
        setMeetings(message.meetings);
        // An invitation to a meeting that has since ended goes with it.
        if (this.invitation && !message.meetings.some((meeting) => meeting.id === this.invitation?.meeting)) this.dismissInvite();
        break;
      case "speaking":
        setSpeaking(message.id, message.on);
        break;
      case "meeting_invited":
        this.onMeetingInvite(message);
        break;
      case "meeting_error":
        if (message.code === "not_found") this.tellMeeting({ kind: "ended", meeting: "" });
        break;
      case "sfu":
        this.sfu?.handle(message);
        break;
    }
  }

  /** The id of the meeting you are in, if any. */
  currentMeeting(): string | null {
    return this.meeting;
  }

  /**
   * Joins a meeting: the room answers with `meeting_joined`, which opens the
   * media and walks you into the meeting room. A one-to-one call ends first.
   */
  joinMeeting(id: string) {
    if (!this.ws || this.meeting === id) return;
    this.dismissInvite();
    if (this.peers.size) this.hangUp();
    this.ws.send({ t: "meeting_join", meeting: id });
  }

  /** Starts a meeting of your own, asking these people in: a call becoming a meeting asks its other half. */
  startMeeting(name: string, invite: string[] = []) {
    if (!this.ws) return;
    const everyone = new Set([...invite, ...this.peers.keys()]);
    if (this.peers.size) this.hangUp();
    this.ws.send({ t: "meeting_start", name, invite: [...everyone] });
  }

  inviteToMeeting(ids: string[]) {
    if (!this.meeting || !ids.length) return;
    this.ws?.send({ t: "meeting_invite", to: ids });
  }

  acceptInvite() {
    const invitation = this.invitation;
    if (invitation) this.joinMeeting(invitation.meeting);
  }

  dismissInvite() {
    clearTimeout(this.inviteTimer);
    if (!this.invitation) return;
    this.invitation = null;
    stopSound("ring");
    this.emit();
  }

  dismissNotice() {
    clearTimeout(this.noticeTimer);
    this.notice = null;
    this.emit();
  }

  /** Walked out of the meeting room while in a meeting: that is leaving it. */
  walkedOut() {
    const meeting = this.meeting;
    if (!meeting) return;
    this.leaveMeeting();
    this.tellMeeting({ kind: "walked_out", meeting });
  }

  /** Out of your meeting: the room is told unless it already let you go. */
  leaveMeeting(tell = true) {
    if (!this.meeting) return;
    if (tell) this.ws?.send({ t: "meeting_leave" });
    this.meeting = null;
    this.voice.stop();
    this.sfu?.close();
    this.sfu = null;
    clearTimeout(this.stageTimer);
    this.stage = EMPTY_STAGE;
    this.pin = null;
    this.releaseMedia();
    playSound("end");
    this.emit();
  }

  /**
   * Back after a reconnect: the room has forgotten your meeting, so rejoin it
   * if it is still going (the main one always is).
   */
  rejoinMeeting() {
    const meeting = this.meeting;
    if (!meeting) return;
    this.leaveMeeting(false);
    if (meetingsState().meetings.some((one) => one.id === meeting)) this.ws?.send({ t: "meeting_join", meeting });
    else this.tellMeeting({ kind: "ended", meeting });
  }

  /** Where the meeting is being looked at: the Meetings page, the floor, or a phone. */
  setStageMode(mode: Exclude<StageMode, "hidden">) {
    if (mode === this.stageMode) return;
    this.stageMode = mode;
    this.refreshStage();
  }

  /** Keeps someone, or a shared screen, big on your stage; null lets the stage choose again. */
  setPin(pin: Pin | null) {
    if (pin?.id === this.pin?.id && pin?.kind === this.pin?.kind) return;
    this.pin = pin;
    this.refreshStage();
    this.emit();
  }

  /** From the room: past the meeting hours, or back within them. */
  setVideoPaused(paused: boolean) {
    if (this.videoPaused === paused) return;
    this.videoPaused = paused;
    this.sfu?.pauseVideo(paused);
    this.emit();
  }

  /** Whose video to receive now, and how sharp; the SFU is asked for exactly that. */
  private refreshStage() {
    const sfu = this.sfu;
    if (!sfu) return;
    const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
    const mode: StageMode = hidden ? "hidden" : this.stageMode === "stage" && screenTooSmallForDetail() ? "phone" : this.stageMode;
    const { meetings, spokeAt } = meetingsState();
    const members = meetings.find((one) => one.id === this.meeting)?.members ?? [];
    const speaking = new Set(members.filter((member) => member.speaking).map((member) => member.id));
    // Everyone the room says is in the meeting, whether or not their media has arrived yet,
    // in the order they came; the SFU says what each of them is sending.
    const media = new Map(sfu.peerList.map((peer) => [peer.id, peer]));
    const people = this.selfId
      ? [...members]
          .filter((member) => member.id !== this.selfId)
          .sort((a, b) => a.since - b.since)
          .map((member) => ({ id: member.id, cameraOn: !!media.get(member.id)?.cameraOn, screen: !!media.get(member.id)?.screen }))
      : sfu.peerList;
    const stage = chooseStage({ peers: people, speaking, spokeAt, mode, previous: this.stage, pin: this.pin, hd: this.hd });
    // A change of speaker waiting out its pause: look again then, if nothing else does first.
    clearTimeout(this.stageTimer);
    if (stage.recheckIn !== null) this.stageTimer = setTimeout(() => this.refreshStage(), stage.recheckIn);
    const same = sameStage(stage, this.stage);
    this.stage = stage;
    if (same) return;
    sfu.want(stage.videos);
    this.emit();
  }

  private onMeetingInvite(invite: MeetingInvite) {
    if (this.meeting === invite.meeting || this.incoming || this.outgoing) return;
    this.invitation = invite;
    clearTimeout(this.inviteTimer);
    this.inviteTimer = setTimeout(() => this.dismissInvite(), INVITE_TIMEOUT);
    loopSound("ring");
    this.emit();
  }

  private tellMeeting(notice: MeetingNotice) {
    clearTimeout(this.noticeTimer);
    this.notice = notice;
    this.noticeTimer = setTimeout(() => this.dismissNotice(), 8000);
    this.emit();
  }

  /**
   * The card someone enlarged. Only that one is worth sending in high quality,
   * and on a phone not even that, so everything else stays low.
   */
  setFocus(focus: Focus | null) {
    if (focus?.id === this.focus?.id && focus?.kind === this.focus?.kind)
      return;
    this.focus = focus;
    this.shareQuality();
  }

  /** Asks the person on the call for what our cards can show. */
  private shareQuality() {
    const wanted = (id: string, kind: VideoKind): VideoQuality =>
      this.focus?.id === id &&
      this.focus.kind === kind &&
      !screenTooSmallForDetail()
        ? "high"
        : "low";

    this.peers.forEach((peer) => {
      const want = {
        camera: wanted(peer.id, "camera"),
        screen: wanted(peer.id, "screen"),
      };
      const asked = `${want.camera}${want.screen}`;
      if (!peer.pc || peer.asked === asked) return;
      peer.asked = asked;
      this.send("signal", peer.id, { signal: { want } });
    });
  }

  setMic(enabled: boolean) {
    this.micEnabled = enabled;
    this.local?.getAudioTracks().forEach((track) => (track.enabled = enabled));
    saveMicPreference(enabled);
    this.shareMedia();
    this.listenForVoice();
    this.emit();
  }

  /** Your talking is reported only in a meeting, with someone to hear it and your mic on. */
  private listenForVoice() {
    const track = this.meeting && this.micEnabled && this.sfu && !this.sfu.alone ? (this.local?.getAudioTracks()[0] ?? null) : null;
    this.voice.listen(track);
  }

  /** Whether meetings here get HD video, from the place's plan (docs/22). */
  setHd(hd: boolean) {
    if (hd === this.hd) return;
    this.hd = hd;
    this.refreshStage();
  }

  /** Who we are on the floor, told when the room welcomes us. */
  setSelf(id: string) {
    this.selfId = id;
  }

  /** Whether the next meeting you go into opens with your camera on. */
  setCameraOnJoin(on: boolean) {
    this.cameraOnJoin = on;
  }

  /** Your camera, on the call you are in: there is nothing to turn on outside one. */
  async setCamera(enabled: boolean) {
    if (!this.local) return;
    if (enabled && !this.local.getVideoTracks().length) {
      if (!(await this.addCamera())) return this.emit();
    } else if (!enabled && this.local) {
      this.local.getVideoTracks().forEach((track) => {
        this.local!.removeTrack(track);
        track.stop();
      });
    }

    this.cameraEnabled = enabled;
    this.shareTracks();
  }

  /**
   * Shares a screen, window or tab with everyone on the call. The browser's own
   * "Stop sharing" ends it too, and so does leaving the call.
   */
  async setScreen(enabled: boolean) {
    if (!enabled) return this.stopScreen();
    if (this.screen || !navigator.mediaDevices?.getDisplayMedia) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: SCREEN_CAPTURE,
        audio: false,
      });
    } catch {
      return; // the picker was dismissed
    }

    if (this.screen || !(this.peers.size || this.meeting)) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const track = stream.getVideoTracks()[0];
    track.contentHint = "detail";
    track.addEventListener("ended", () => this.stopScreen());
    this.screen = stream;
    this.sfu?.setScreen(stream);
    this.shareTracks();
  }

  private stopScreen() {
    if (!this.screen) return;
    this.screen.getTracks().forEach((track) => track.stop());
    this.screen = null;
    this.sfu?.setScreen(null);
    this.shareTracks();
  }

  setSpeaker(enabled: boolean) {
    setSpeakerMuted(!enabled);
  }

  clearError() {
    this.error = null;
    this.emit();
  }

  /** The room let you into a meeting: media opens, and your character walks into the meeting room. */
  private async enterMeeting(id: string, members: MeetingMember[]) {
    const moving = this.meeting !== null;
    const withCamera = this.cameraOnJoin && !this.videoPaused;
    this.cameraOnJoin = false;
    this.hangUp();
    this.sfu?.close();
    this.voice.stop();
    this.meeting = id;
    clearTimeout(this.stageTimer);
    this.stage = EMPTY_STAGE;
    this.pin = null;
    this.error = null;
    this.dismissInvite();
    this.dismissNotice();
    // Ready straight away, so it hears who is already sharing while media opens.
    const sfu = new SfuMeeting(
      (message) => this.ws?.send({ t: "sfu", ...message }),
      () => {
        if (this.sfu !== sfu) return;
        this.listenForVoice();
        this.refreshStage();
        this.emit();
      },
      this.iceServers,
    );
    this.sfu = sfu;
    sfu.pauseVideo(this.videoPaused);
    members.forEach((member) => sfu.addMember(member.id, member.name));
    if (!moving) playSound("connect");
    window.dispatchEvent(new Event(WALK_TO_MEETING_EVENT));
    this.emit();

    const opened = await this.openMedia();
    if (this.sfu !== sfu) return;
    if (opened && withCamera && (await this.addCamera())) {
      if (this.sfu !== sfu) return;
      this.cameraEnabled = true;
    }
    sfu.publishLocal(opened ? this.local : null, this.flags());
    this.listenForVoice();
    this.refreshStage();
    this.emit();
  }

  private async startCall(id: string) {
    if (await this.openMedia()) this.shareTracks();
    else this.hangUp(id);
  }

  /** Puts our mic, camera and screen on every connection and tells each peer what is on. */
  private shareTracks() {
    this.peers.forEach((peer) => this.syncTracks(peer));
    this.shareMedia();
    this.emit();
  }

  private syncTracks(peer: PeerEntry) {
    const tracks = [
      this.local?.getAudioTracks()[0],
      this.local?.getVideoTracks()[0],
      this.screen?.getVideoTracks()[0],
    ];
    peer.pc?.getTransceivers().forEach((transceiver, slot) => {
      if (transceiver.direction !== "sendrecv")
        transceiver.direction = "sendrecv";
      const kind = SLOT_KIND[slot];
      transceiver.sender
        .replaceTrack(tracks[slot] ?? null)
        .then(
          () =>
            kind && sendAtQuality(transceiver.sender, kind, peer.wants[kind]),
        )
        .catch(() => {});
    });
  }

  private flags(): MediaFlags {
    return {
      mic: this.micEnabled && !!this.local?.getAudioTracks().length,
      camera: this.cameraEnabled && !!this.local?.getVideoTracks().length,
      screen: !!this.screen,
    };
  }

  private shareMedia(to?: PeerEntry) {
    const media = this.flags();
    (to ? [to] : [...this.peers.values()]).forEach((peer) => {
      if (peer.pc) this.send("signal", peer.id, { signal: { media } });
    });
    if (!to) this.sfu?.updateLocal(this.local, media);
  }

  /** Mid meeting or mid ring, nobody else gets through. */
  private busy() {
    return !!(this.meeting || this.incoming || this.outgoing);
  }

  private onInvite(id: string, name: string) {
    if (this.busy() || this.peers.size) {
      this.send("decline", id, { reason: "busy" });
      return;
    }
    this.error = null;
    this.outcome = null;
    this.incoming = { id, name: name || "Someone" };
    this.ring(() => this.decline("missed"));
    loopSound("ring");
    this.emit();
  }

  private async onAccept(id: string) {
    const call = this.outgoing;
    if (!call || call.id !== id) return;

    this.clearRing();
    stopSound("ring");
    this.outgoing = null;

    this.createPeer(id, call.name, true);
    this.emit();

    await this.startCall(id);
  }

  private cancelOutgoing() {
    this.clearRing();
    stopSound("ring");
    this.outgoing = null;
    this.emit();
  }

  private createPeer(id: string, name: string, offerer: boolean): PeerEntry {
    const existing = this.peers.get(id);
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: udpRelay(this.iceServers),
      iceTransportPolicy: RELAY_ONLY,
    });
    const peer: PeerEntry = {
      id,
      name,
      pc,
      stream: new MediaStream(),
      connected: false,
      mic: true,
      camera: false,
      screen: false,
      screenStream: null,
      wants: { ...LOW },
      offerer,
    };
    this.peers.set(id, peer);
    // Once both ends have agreed, UDP gets its chance, counted from there so
    // a microphone prompt on the other end isn't taken for a blocked network.
    // Without a UDP address of our own it is blocked here; with one, a slow
    // start is given longer before TCP and TLS join.
    pc.onsignalingstatechange = () => {
      if (pc.signalingState !== "stable" || !pc.remoteDescription || peer.fallback) return;
      peer.fallback = setTimeout(() => {
        if (peer.connected) return;
        if (!peer.gathered) return this.widenRelay(peer);
        peer.fallback = setTimeout(() => {
          if (!peer.connected) this.widenRelay(peer);
        }, UDP_SLOW_MS - UDP_GRACE_MS);
      }, UDP_GRACE_MS);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate?.type === "relay") peer.gathered = true;
      if (candidate)
        this.send("signal", id, { signal: { candidate: candidate.toJSON() } });
    };

    pc.ontrack = ({ track, transceiver }) => {
      if (pc.getTransceivers().indexOf(transceiver) === SCREEN_SLOT) {
        peer.screenStream = new MediaStream([track]);
      } else {
        peer.stream = new MediaStream([...peer.stream.getTracks(), track]);
      }
      this.emit();
    };

    pc.onconnectionstatechange = () => {
      const connected = pc.connectionState === "connected";
      if (connected && !peer.connected) playSound("connect");
      peer.connected = connected;
      if (pc.connectionState === "failed") this.widenRelay(peer);
      this.emit();
    };

    if (offerer) {
      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription();
          this.send("signal", id, { signal: { sdp: pc.localDescription! } });
        } catch {
          this.error = "connection";
          this.emit();
        }
      };
      SLOTS.forEach((kind) =>
        pc.addTransceiver(kind, { direction: "sendrecv" }),
      );
      preferRedundantAudio(pc.getTransceivers()[0]);
    }

    return peer;
  }

  /**
   * UDP didn't connect, or the connection failed: the relay's TCP and TLS
   * addresses join, for networks that block UDP, and the connection gathers
   * again. Only the offerer can restart it, so the answerer asks; either end
   * can be on TCP while the other stays on UDP.
   */
  private widenRelay(peer: PeerEntry) {
    const pc = peer.pc;
    if (!pc || pc.signalingState === "closed") return;
    if (!peer.widened && this.iceServers.length) {
      peer.widened = true;
      pc.setConfiguration({ iceServers: this.iceServers, iceTransportPolicy: RELAY_ONLY });
    }
    if (peer.offerer) pc.restartIce();
    else this.send("signal", peer.id, { signal: { restart: true } });
  }

  private async onSignal(from: string, signal: Signal) {
    const peer = this.peers.get(from);
    const pc = peer?.pc;
    if (!peer || !pc || !signal) return;

    try {
      if (signal.restart) {
        if (peer.offerer) pc.restartIce();
      } else if (signal.want) {
        peer.wants = {
          camera: signal.want.camera ?? "low",
          screen: signal.want.screen ?? "low",
        };
        this.syncTracks(peer);
      } else if (signal.media) {
        peer.mic = signal.media.mic;
        peer.camera = signal.media.camera;
        peer.screen = !!signal.media.screen;
        this.emit();
      } else if (signal.candidate) {
        await pc.addIceCandidate(signal.candidate).catch(() => {});
      } else if (signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === "offer") {
          preferRedundantAudio(pc.getTransceivers()[0]);
          this.syncTracks(peer);
          await pc.setLocalDescription();
          this.send("signal", from, { signal: { sdp: pc.localDescription! } });
        }
        this.shareMedia(peer);
        this.shareQuality();
      }
    } catch (err) {
      console.error("Signal handling failed:", err);
    }
  }

  private closePeer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;

    clearTimeout(peer.fallback);
    peer.pc?.close();
    peer.stream.getTracks().forEach((track) => track.stop());
    this.peers.delete(id);
    playSound("end");

    if (!this.peers.size && !this.meeting) this.releaseMedia();
  }

  /** The microphone, for a call starting. The camera joins only when it is switched on (addCamera). */
  private async openMedia(): Promise<boolean> {
    if (this.local) return true;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = "unsupported";
      return false;
    }

    try {
      const devices = savedDevices();
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...audioConstraints(),
          deviceId: deviceConstraint(devices.audio),
        },
      });
      this.voiceApplied = JSON.stringify(audioConstraints());
      this.local
        ?.getAudioTracks()
        .forEach((track) => (track.enabled = this.micEnabled));
      this.error = null;
      return true;
    } catch {
      this.error = "media";
      return false;
    }
  }

  private async addCamera(): Promise<boolean> {
    if (!this.local) return false;
    if (this.local.getVideoTracks().length) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...CAMERA_CAPTURE,
          deviceId: deviceConstraint(savedDevices().video),
        },
      });
      this.local.addTrack(stream.getVideoTracks()[0]);
      this.error = null;
      return true;
    } catch {
      this.error = "camera";
      return false;
    }
  }

  /**
   * The voice settings, on a call already open. Chrome won't change its own
   * processing on a microphone that is open, so the microphone opens again
   * with the new settings, the call swaps to it, and the old one stops. Other settings don't touch the voice.
   */
  private async applyVoicePrefs() {
    const key = JSON.stringify(audioConstraints());
    if (key === this.voiceApplied) return;
    this.voiceApplied = key;
    const local = this.local;
    if (!local?.getAudioTracks().length) return;

    // The old microphone stops first: while it is open, Chrome gives a new
    // one the same processing, whatever it asks for. A moment of silence.
    local.getAudioTracks().forEach((track) => track.stop());
    let fresh: MediaStream;
    try {
      fresh = await navigator.mediaDevices.getUserMedia({
        audio: { ...audioConstraints(), deviceId: deviceConstraint(savedDevices().audio) },
      });
    } catch {
      fresh = new MediaStream();
    }
    // The call ended while the microphone opened: it isn't needed.
    if (this.local !== local) {
      fresh.getTracks().forEach((track) => track.stop());
      return;
    }
    this.local = new MediaStream([...fresh.getAudioTracks(), ...local.getVideoTracks()]);
    if (!fresh.getAudioTracks().length) this.error = "media";
    this.local.getAudioTracks().forEach((track) => (track.enabled = this.micEnabled));
    this.listenForVoice();
    this.shareTracks();
  }

  /** The call is over: everything stops, and the camera is off again for the next one. */
  private releaseMedia() {
    this.cameraEnabled = false;
    this.local?.getTracks().forEach((track) => track.stop());
    this.screen?.getTracks().forEach((track) => track.stop());
    this.local = null;
    this.screen = null;
  }

  /** Cloudflare TURN credentials from the API, refreshed before they run out. */
  private async loadIceServers() {
    clearTimeout(this.iceTimer);
    try {
      const { iceServers, expiresAt } = await api.iceServers();
      const first = !this.iceServers.length;
      this.iceServers = iceServers;
      // A call that started before the first credentials came has nothing to
      // relay through yet: hand them over and gather again.
      if (first) {
        for (const peer of this.peers.values()) {
          peer.pc?.setConfiguration({
            iceServers: peer.widened ? iceServers : udpRelay(iceServers),
            iceTransportPolicy: RELAY_ONLY,
          });
          peer.pc?.restartIce();
        }
      }
      const refreshIn = Math.max(
        60_000,
        expiresAt - Date.now() - ICE_REFRESH_MARGIN_MS,
      );
      this.iceTimer = setTimeout(() => void this.loadIceServers(), refreshIn);
    } catch {
      // No relay, no call: try again soon, sooner while there are none at all.
      this.iceTimer = setTimeout(
        () => void this.loadIceServers(),
        this.iceServers.length ? 60_000 : 5_000,
      );
    }
  }

  private ring(onTimeout: () => void, delay: number = RING_TIMEOUT) {
    this.clearRing();
    this.ringTimer = setTimeout(onTimeout, delay);
  }

  private clearRing() {
    clearTimeout(this.ringTimer);
    this.ringTimer = undefined;
  }

  private send(kind: CallKind, to: string, data?: Record<string, unknown>) {
    this.ws?.send({ t: "call", kind, to, ...(data ? { data } : {}) });
  }

  private emit() {
    const peers = [...this.peers.values()].map((peer) => ({ ...peer, pc: undefined }));
    this.snap = {
      incoming: this.incoming,
      outgoing: this.outgoing && {
        id: this.outgoing.id,
        name: this.outgoing.name,
      },
      peers,
      meetingPeers: this.sfu?.peerList ?? [],
      stage: this.stage,
      invite: this.invitation,
      notice: this.notice,
      alone: this.sfu?.alone ?? true,
      localStream: this.local,
      screenStream: this.screen,
      micEnabled: this.micEnabled,
      cameraEnabled: this.cameraEnabled,
      speakerEnabled: !isSpeakerMuted(),
      meeting: this.meeting,
      error: this.error,
      outcome: this.outcome,
    };
    this.listeners.forEach((listener) => listener());
  }
}

export const callManager = new CallManager();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__call = callManager;
}
