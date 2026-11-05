import { onPrefsChange, prefs } from "./prefs";
import type { CallKind, MediaFlags, ServerMessage, VideoKind, VideoQuality } from "@shared/messages";
import type { RoomSocket } from "./RoomSocket";
import { api } from "@/lib/api";
import {
  CAMERA_CAPTURE,
  SCREEN_SHARE,
  onDevicesChange,
  openPicked,
  savedDevices,
  screenTooSmallForDetail,
  preferRedundantAudio,
  preferVideoCodecs,
  sendAtQuality,
  udpRelay,
} from "./media";
import { SfuMeeting, type MeetingPeer } from "./SfuMeeting";
import { dtxDescription } from "./sdp";
import { prepareNoiseRemoval, removeNoise, type CleanVoice } from "./noiseFilter";
import { chooseStage, EMPTY_STAGE, sameStage, type Pin, type Stage, type StageMode } from "./meetingStage";
import { meetingsState, setMeetings, setSpeaking, subscribeMeetings, WALK_TO_MEETING_EVENT } from "./meetings";
import { VoiceActivity } from "./voiceActivity";
import { playSound, loopSound, stopSound } from "./sounds";
import { isSpeakerMuted, onSpeakerChange, setSpeakerMuted } from "./speaker";
import { track } from "@/lib/analytics";

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
  /** Ready to talk: the connection is up and their voice is reaching us (not merely answered). */
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
  /** Your camera just went off by itself after a quiet stretch: said once, for a moment. */
  cameraRested: boolean;
  /** Talking with the microphone off, said for a moment (MicMutedHint). */
  talkingMuted: boolean;
}

/** What one side of a call asks the other to send: how sharp, and whether to send video at all. */
interface Wants {
  camera: VideoQuality;
  screen: VideoQuality;
  /** Their tab is in the background: no video until it's back. */
  paused?: boolean;
}

interface Signal {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  media?: { mic: boolean; camera: boolean; screen?: boolean };
  /** The quality the other side's cards can show, so we send no more than that. */
  want?: Partial<Wants>;
  /** The answerer's relay needs TCP or TLS: the offerer gathers again. */
  restart?: boolean;
  /** The offerer is adding the relay's TCP and TLS: the answerer does too, before the new offer. */
  widen?: boolean;
}

interface PeerEntry extends CallPeer {
  pc?: RTCPeerConnection;
  /** The connection itself is up (ICE and DTLS), whether or not anything is sent on it yet. */
  linked?: boolean;
  /** Their voice has started arriving (the remote audio track unmuted). */
  heard?: boolean;
  /** Linked, but nothing heard from them for a while: shown as connected anyway. */
  heardTimer?: ReturnType<typeof setTimeout>;
  /** What they asked us for, and what we last asked them for. */
  wants: Wants;
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

const LOW: Wants = { camera: "low", screen: "low" };

/**
 * Cameras rest after this long with nobody on the call or in the meeting
 * talking (docs/costs.md): working side by side in silence doesn't need video, and
 * one press brings it back.
 */
const QUIET_REST_MS = 10 * 60_000;
/** How often a call with a camera on listens for talk. */
const LISTEN_EVERY_MS = 20_000;
/** Sound energy over one listen that counts as talk: about a second of speech, well above a quiet room. */
const TALK_ENERGY = 0.002;

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
/**
 * No UDP address from the relay by now: this network blocks UDP, or the relay
 * didn't answer (one ring in three, in testing), so TCP and TLS join. Short
 * enough that this happens while it still rings.
 */
const UDP_GRACE_MS = 2000;
/**
 * A UDP address but still no connection by now: the other end may be the one
 * blocked, or the relays' UDP paths aren't getting through (a connection over
 * UDP takes under a second when it works). Was 10 s, which some calls waited out.
 */
const UDP_SLOW_MS = 4500;
/** Credentials are refreshed this long before they expire. */
const ICE_REFRESH_MARGIN_MS = 15 * 60 * 1000;
const RING_TIMEOUT = 30000;
/** How long a meeting invitation waits for an answer. */
const INVITE_TIMEOUT = 30000;
/**
 * What the browser does to your voice, as your settings ask (lib/prefs.ts).
 * With noise removal on, the system's voice isolation is asked for too where
 * the browser offers it, as LiveKit does; the rest is done here (removeNoise).
 */
function audioConstraints(): MediaTrackConstraints {
  const { echoCancellation, noiseSuppression } = prefs();
  const isolation =
    typeof navigator !== "undefined" && (navigator.mediaDevices?.getSupportedConstraints?.() as Record<string, boolean> | undefined)?.voiceIsolation
      ? { voiceIsolation: noiseSuppression }
      : {};
  return { echoCancellation, noiseSuppression, autoGainControl: true, ...isolation };
}

/** What the open microphone was opened with: the voice settings and the microphone picked. */
function voiceKey(): string {
  return JSON.stringify({ ...audioConstraints(), device: savedDevices().audio ?? "" });
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
  cameraRested: false,
  talkingMuted: false,
};

const MIC_ON = typeof window === "undefined" ? true : micPreference();

/**
 * Some browsers have no WebRTC at all (Safari in Lockdown Mode, some in-app
 * browsers): calls and meetings say so instead of failing.
 */
const canCall = () => typeof RTCPeerConnection !== "undefined";

/**
 * A call is two people, on one WebRTC connection through the TURN relay (see
 * RELAY_ONLY), over UDP unless the network blocks it (widenRelay), with the
 * voice sent redundantly so a lost packet isn't heard (preferRedundantAudio)
 * and only while there is something to hear (dtxDescription), with the noise
 * taken out first (removeNoise). It starts with voice, and the camera and a shared screen are
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
  /** The place is past its meeting hours: meetings are voice only (docs/pricing.md). */
  private videoPaused = false;
  private local: MediaStream | null = null;
  /** The microphone with its noise removed (removeNoise), which `local` carries in its place; stopping it stops the microphone. */
  private cleanVoice: CleanVoice | null = null;
  /** The microphone itself, as the browser gave it: watched for being unplugged (followMicrophone). */
  private microphone: MediaStreamTrack | null = null;
  /** When the meeting's media was last found lost and joined again (recoverMeeting). */
  private meetingLostAt = 0;
  /** The microphone being opened, so a call and a meeting starting together share one. */
  private opening: Promise<boolean> | null = null;
  /** Whether you last asked for your camera on: one that opens after you said off, or after the call ended, stops again. */
  private cameraWanted = false;
  /** Voice settings being applied to an open call, one change after another. */
  private voiceChange: Promise<void> = Promise.resolve();
  private voiceApplied = "";
  private screen: MediaStream | null = null;
  private incoming: { id: string; name: string } | null = null;
  private outgoing: { id: string; name: string } | null = null;
  /**
   * The call's connection, set up while it rings, on both ends: by the time
   * someone answers it is usually up, and only the voices are left to start.
   * Nothing is sent on it until then. Measured before this: 1–13 s from
   * answering to hearing each other, while the call already showed.
   */
  private ringPeer: PeerEntry | null = null;
  private micEnabled = MIC_ON;
  private cameraEnabled = false;
  /** The camera, chosen before joining (the Meetings page, as Meet asks): on for the next meeting you go into. */
  private cameraOnJoin = false;
  private meeting: string | null = null;
  /** Whose video the meeting shows, and where it is being looked at. */
  private stage: Stage = EMPTY_STAGE;
  /** Who we are on this floor, to leave ourselves off the stage. */
  private selfId: string | null = null;
  private stageTimer?: ReturnType<typeof setTimeout>;
  /** What the room was last told about our call on the floor (reportCall). */
  private callReport = "";
  /** When anyone on our call or in our meeting last talked, and the timer that listens (watchQuiet). */
  private heardAt = 0;
  private quietTimer?: ReturnType<typeof setInterval>;
  /** Each call's sound energy so far, per stats report, to tell talk from silence. */
  private energy = new Map<string, number>();
  private cameraRested = false;
  private talkingMuted = false;
  private mutedHintAt = 0;
  private mutedHintTimer?: ReturnType<typeof setTimeout>;
  /** A copy of the microphone listened to while it is off (watchMuted), and the microphone it copies. */
  private mutedCopy: MediaStreamTrack | null = null;
  private mutedSource: MediaStreamTrack | null = null;
  // A second of loud within two before it says anything: real talk, not a bark or a burst of typing.
  private readonly mutedVoice = new VoiceActivity((talking) => talking && this.hintMuted(), { stopAfterMs: 1500, onsetMs: 1000 });
  private restedTimer?: ReturnType<typeof setTimeout>;
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
      // A tab in the background shows nothing, so it receives no video: in a
      // meeting the SFU stops sending it, on a call the other side pauses theirs.
      document.addEventListener("visibilitychange", () => {
        this.refreshStage();
        this.shareQuality();
        this.emit();
      });
      // Voice settings reach the call that is already open, not only the next.
      onPrefsChange(() => this.queueVoice(() => this.applyVoicePrefs()));
      // So does a microphone or camera picked in settings.
      onDevicesChange(() => {
        this.queueVoice(() => this.applyVoicePrefs());
        void this.switchCamera();
      });
      // Headphones plugged in or taken out: the microphone follows the system's default.
      navigator.mediaDevices?.addEventListener?.("devicechange", () => this.queueVoice(() => this.followMicrophone()));
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
    if (!this.callsWork()) return;

    this.error = null;
    this.outcome = null;
    this.outgoing = { id, name };
    this.prepareVoice();
    loopSound("ring");

    this.send("invite", id);
    // The connection while it rings; your microphone opens now too (you're the one calling), but
    // goes on the connection only when they answer.
    this.ringPeer = this.buildPeer(id, name, true);
    void this.openMedia();
    this.ring(() => {
      this.tell({ id, name, kind: "unanswered" });
      this.cancel();
    });
    this.emit();
  }

  async accept() {
    const call = this.incoming;
    if (!call) return;
    if (!this.callsWork()) return this.decline();

    this.clearRing();
    stopSound("ring");
    this.incoming = null;

    this.answered(call.id, call.name, false);
    // `early`: this end takes the offer made while it rang (an older app doesn't, and is offered again).
    this.send("accept", call.id, { early: true });
    this.emit();

    await this.startCall(call.id);
  }

  /** Answered: the connection made while it rang becomes the call's (or a fresh one, if there wasn't one). */
  private answered(id: string, name: string, offerer: boolean, early = true): PeerEntry {
    const ringing = this.ringPeer?.id === id ? this.ringPeer : null;
    this.ringPeer = null;
    if (!ringing) return this.createPeer(id, name, offerer);
    this.peers.set(id, ringing);
    // The other end is an older app, which didn't take our offer while it
    // rang: offered again, from scratch, now that it will. (Its answer can't
    // be told from one still on its way: answered at once, the new app's was.)
    if (offerer && !early) void this.offerAgain(ringing);
    this.updateLive(ringing);
    return ringing;
  }

  /** Drops an offer that went unanswered and makes a new one, with new candidates. */
  private async offerAgain(peer: PeerEntry) {
    const pc = peer.pc;
    if (!pc) return;
    try {
      if (pc.signalingState === "have-local-offer") await pc.setLocalDescription({ type: "rollback" });
      pc.restartIce();
    } catch {
      this.error = "connection";
      this.emit();
    }
  }

  /** The ring ended without a call: its connection goes, and a microphone opened for it. */
  private dropRing(id?: string) {
    const peer = this.ringPeer;
    if (!peer || (id && peer.id !== id)) return;
    this.ringPeer = null;
    clearTimeout(peer.fallback);
    clearTimeout(peer.heardTimer);
    peer.pc?.close();
    if (!this.peers.size && !this.meeting && !this.incoming && !this.outgoing) this.releaseMedia();
  }

  /** Turns the ring down; left to ring out, it counts as missed on both ends. */
  decline(reason: "declined" | "missed" = "declined") {
    if (!this.incoming) return;
    this.clearRing();
    stopSound("ring");
    this.dropRing(this.incoming.id);
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
    const id = this.outgoing.id;
    this.outgoing = null;
    this.dropRing(id);
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
    this.dropRing(id);
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
        void this.onAccept(from, payload.early === true);
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
    if (!this.ws || this.meeting === id || !this.callsWork()) return;
    this.dismissInvite();
    if (this.peers.size) this.hangUp();
    this.prepareVoice();
    this.ws.send({ t: "meeting_join", meeting: id });
  }

  /** Starts a meeting of your own, asking these people in: a call becoming a meeting asks its other half. */
  startMeeting(name: string, invite: string[] = []) {
    if (!this.ws || !this.callsWork()) return;
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
   * The room welcomed us, arriving or back after a reconnect. Back, the room
   * has told everyone we left, and they ended their calls and rings with us,
   * so ours end too. It knows nothing of our meeting, so we rejoin it if it is
   * still going (the main one always is), and what we're on is told again.
   */
  welcomed(selfId: string) {
    this.selfId = selfId;
    if (this.peers.size || this.incoming || this.outgoing) this.hangUp();
    this.callReport = "";
    this.reportCall();
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
    const stage = chooseStage({ peers: people, speaking, spokeAt, mode, previous: this.stage, pin: this.pin });
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
    if (focus?.id === this.focus?.id && focus?.kind === this.focus?.kind) return;
    this.focus = focus;
    this.shareQuality();
  }

  /** Asks the person on the call for what our cards can show. */
  private shareQuality() {
    const wanted = (id: string, kind: VideoKind): VideoQuality =>
      this.focus?.id === id && this.focus.kind === kind && !screenTooSmallForDetail() ? "high" : "low";

    const paused = typeof document !== "undefined" && document.visibilityState === "hidden";
    this.peers.forEach((peer) => {
      const want: Wants = {
        camera: wanted(peer.id, "camera"),
        screen: wanted(peer.id, "screen"),
        paused,
      };
      const asked = `${want.camera}${want.screen}${paused}`;
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
  /**
   * While your microphone is off on a call or in a meeting, a copy of it is
   * listened to on this device, and talking into it is pointed out
   * (MicMutedHint). Nothing of it is sent.
   */
  private watchMuted() {
    const microphone = this.microphone;
    const watch = !!this.local && !this.micEnabled && !!microphone && microphone.readyState === "live";
    if (watch && this.mutedSource === microphone) return;
    this.mutedVoice.stop();
    this.mutedCopy?.stop();
    this.mutedCopy = null;
    this.mutedSource = null;
    if (!watch || !microphone) return this.clearMutedHint();
    const copy = microphone.clone();
    copy.enabled = true;
    this.mutedCopy = copy;
    this.mutedSource = microphone;
    this.mutedVoice.listen(copy);
  }

  /** Said for 5 s, at most once in 20 s: a reminder, not a nag. */
  private hintMuted() {
    if (this.micEnabled || Date.now() - this.mutedHintAt < 20_000) return;
    this.mutedHintAt = Date.now();
    this.talkingMuted = true;
    clearTimeout(this.mutedHintTimer);
    this.mutedHintTimer = setTimeout(() => this.clearMutedHint(), 5000);
    this.emit();
  }

  private clearMutedHint() {
    clearTimeout(this.mutedHintTimer);
    if (!this.talkingMuted) return;
    this.talkingMuted = false;
    this.emit();
  }

  private listenForVoice() {
    const track = this.meeting && this.micEnabled && this.sfu && !this.sfu.alone ? (this.local?.getAudioTracks()[0] ?? null) : null;
    this.voice.listen(track);
    this.watchMuted();
  }

  /** Whether the next meeting you go into opens with your camera on. */
  setCameraOnJoin(on: boolean) {
    this.cameraOnJoin = on;
  }

  /** Your camera, on the call you are in: there is nothing to turn on outside one. */
  async setCamera(enabled: boolean) {
    if (!this.local) return;
    this.cameraWanted = enabled;
    if (enabled) this.clearRested();
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
      stream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE);
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
      () => this.recoverMeeting(sfu),
    );
    this.sfu = sfu;
    sfu.pauseVideo(this.videoPaused);
    members.forEach((member) => sfu.addMember(member.id, member.name));
    if (!moving) {
      playSound("connect");
      track("meeting_joined", { people_here: members.length });
    }
    window.dispatchEvent(new Event(WALK_TO_MEETING_EVENT));
    this.emit();

    // The connection to the SFU opens now, its slots filled once the microphone is open.
    sfu.publishLocal(this.local, this.flags(), !!this.local);
    const opened = await this.openMedia();
    if (this.sfu !== sfu) return;
    this.cameraWanted = withCamera;
    if (opened && withCamera && (await this.addCamera())) {
      if (this.sfu !== sfu) return;
      this.cameraEnabled = true;
    }
    sfu.updateLocal(opened ? this.local : null, this.flags());
    this.listenForVoice();
    this.refreshStage();
    this.emit();
  }

  /**
   * The meeting's media connection was lost while the room's held (UDP
   * blocked partway through, a network change the room got through): out
   * and straight back in, which gives it a new connection through the SFU.
   * The room answers with `meeting_joined`, taken as a move, so no sounds, and
   * the microphone and camera stay as they are. At most once in 20 seconds,
   * so a network that can't hold a connection doesn't spin.
   */
  private recoverMeeting(sfu: SfuMeeting) {
    const meeting = this.meeting;
    if (this.sfu !== sfu || !meeting || !this.ws || Date.now() - this.meetingLostAt < 20_000) return;
    this.meetingLostAt = Date.now();
    this.cameraOnJoin = this.cameraEnabled;
    this.ws.send({ t: "meeting_leave" });
    this.ws.send({ t: "meeting_join", meeting });
  }

  private async startCall(id: string) {
    if (await this.openMedia()) this.shareTracks();
    else this.hangUp(id);
  }

  /** Puts our mic, camera and screen on every connection and tells each peer what is on. */
  private shareTracks() {
    this.watchMuted();
    this.peers.forEach((peer) => this.syncTracks(peer));
    this.shareMedia();
    this.emit();
  }

  private syncTracks(peer: PeerEntry) {
    const tracks = [this.local?.getAudioTracks()[0], this.local?.getVideoTracks()[0], this.screen?.getVideoTracks()[0]];
    peer.pc?.getTransceivers().forEach((transceiver, slot) => {
      if (transceiver.direction !== "sendrecv") transceiver.direction = "sendrecv";
      const kind = SLOT_KIND[slot];
      transceiver.sender
        .replaceTrack(tracks[slot] ?? null)
        .then(() => kind && sendAtQuality(transceiver.sender, kind, peer.wants[kind], !peer.wants.paused))
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

  /** Whether this browser can call at all; if not, the call overlay says so. */
  private callsWork(): boolean {
    if (canCall()) return true;
    this.error = "unsupported";
    this.emit();
    return false;
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
    // Their offer comes while it rings: answered on a connection of our own, with nothing on it.
    this.ringPeer = this.buildPeer(id, name || "Someone", false);
    this.prepareVoice();
    this.ring(() => this.decline("missed"));
    loopSound("ring");
    this.emit();
  }

  private async onAccept(id: string, early: boolean) {
    const call = this.outgoing;
    if (!call || call.id !== id) return;

    this.clearRing();
    stopSound("ring");
    this.outgoing = null;

    this.answered(id, call.name, true, early);
    this.emit();

    await this.startCall(id);
  }

  private cancelOutgoing() {
    this.clearRing();
    stopSound("ring");
    const id = this.outgoing?.id;
    this.outgoing = null;
    this.dropRing(id);
    this.emit();
  }

  private createPeer(id: string, name: string, offerer: boolean): PeerEntry {
    const existing = this.peers.get(id);
    if (existing) return existing;
    const peer = this.buildPeer(id, name, offerer);
    this.peers.set(id, peer);
    return peer;
  }

  /** A connection to someone, not yet part of the call (createPeer, or ringing in ringPeer). */
  private buildPeer(id: string, name: string, offerer: boolean): PeerEntry {
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
    // Once both ends have agreed, UDP gets its chance, counted from there so
    // a microphone prompt on the other end isn't taken for a blocked network.
    // Without a UDP address of our own it is blocked here; with one, a slow
    // start is given longer before TCP and TLS join.
    pc.onsignalingstatechange = () => {
      if (pc.signalingState !== "stable" || !pc.remoteDescription || peer.fallback) return;
      peer.fallback = setTimeout(() => {
        if (peer.linked) return;
        if (!peer.gathered) return this.widenRelay(peer);
        peer.fallback = setTimeout(() => {
          if (!peer.linked) this.widenRelay(peer);
        }, UDP_SLOW_MS - UDP_GRACE_MS);
      }, UDP_GRACE_MS);
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate?.type === "relay") peer.gathered = true;
      if (candidate) this.send("signal", id, { signal: { candidate: candidate.toJSON() } });
    };

    pc.ontrack = ({ track, transceiver }) => {
      if (pc.getTransceivers().indexOf(transceiver) === SCREEN_SLOT) {
        peer.screenStream = new MediaStream([track]);
      } else {
        peer.stream = new MediaStream([...peer.stream.getTracks(), track]);
      }
      // Their voice: an audio track unmutes when its first packets arrive.
      if (track.kind === "audio") {
        track.addEventListener("unmute", () => {
          peer.heard = true;
          this.updateLive(peer);
        });
        if (!track.muted) peer.heard = true;
      }
      this.updateLive(peer);
    };

    pc.onconnectionstatechange = () => {
      peer.linked = pc.connectionState === "connected";
      if (pc.connectionState === "failed") this.widenRelay(peer);
      this.updateLive(peer);
    };

    if (offerer) {
      pc.onnegotiationneeded = async () => {
        try {
          await pc.setLocalDescription();
          this.send("signal", id, { signal: { sdp: dtxDescription(pc.localDescription!.toJSON()) } });
        } catch {
          this.error = "connection";
          this.emit();
        }
      };
      SLOTS.forEach((kind) => pc.addTransceiver(kind, { direction: "sendrecv" }));
      this.preferCodecs(pc);
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
    this.widen(peer);
    if (peer.offerer) {
      // Both ends widen: a relay slow to give one end a UDP address was often slow for the other
      // too, and that end waited out its own 10 s first (calls took 11 to 13 s to connect).
      this.send("signal", peer.id, { signal: { widen: true } });
      pc.restartIce();
    } else this.send("signal", peer.id, { signal: { restart: true } });
  }

  /** The relay's TCP and TLS addresses join its UDP ones on this connection. */
  private widen(peer: PeerEntry) {
    if (peer.widened || !this.iceServers.length || !peer.pc) return;
    peer.widened = true;
    peer.pc.setConfiguration({ iceServers: this.iceServers, iceTransportPolicy: RELAY_ONLY });
  }

  /**
   * Whether the call is ready to talk, for the call's cards and sound: the
   * connection up and their voice arriving. A call that's linked but silent
   * for 6 s (no microphone on their end) counts as ready all the same.
   */
  private updateLive(peer: PeerEntry) {
    const answered = this.peers.get(peer.id) === peer;
    if (peer.linked && !peer.heard && answered && !peer.heardTimer) {
      peer.heardTimer = setTimeout(() => {
        peer.heard = true;
        this.updateLive(peer);
      }, 6000);
    }
    const live = !!peer.linked && !!peer.heard && answered;
    if (live && !peer.connected) {
      clearTimeout(peer.heardTimer);
      playSound("connect");
      track("call_connected");
    }
    peer.connected = live;
    if (answered) this.emit();
  }

  private async onSignal(from: string, signal: Signal) {
    const peer = this.peers.get(from) ?? (this.ringPeer?.id === from ? this.ringPeer : undefined);
    const pc = peer?.pc;
    if (!peer || !pc || !signal) return;

    try {
      if (signal.restart) {
        if (peer.offerer) this.widenRelay(peer);
      } else if (signal.widen) {
        this.widen(peer);
      } else if (signal.want) {
        peer.wants = {
          camera: signal.want.camera ?? "low",
          screen: signal.want.screen ?? "low",
          paused: !!signal.want.paused,
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
          this.preferCodecs(pc);
          this.syncTracks(peer);
          await pc.setLocalDescription();
          this.send("signal", from, { signal: { sdp: dtxDescription(pc.localDescription!.toJSON()) } });
        }
        this.shareMedia(peer);
        this.shareQuality();
      }
    } catch (err) {
      console.error("Signal handling failed:", err);
    }
  }

  /**
   * Voice with redundancy, and a shared screen in AV1 where both browsers have
   * it: on the same screen it was as sharp as anything tried and took a fifth
   * of VP8's bitrate while scrolling (docs/calls.md). Otherwise VP8, which
   * every browser has. A call has two ends to agree, so this is safe here; a
   * meeting's viewers would all have to decode AV1, so meetings stay on VP8.
   */
  private preferCodecs(pc: RTCPeerConnection) {
    const slots = pc.getTransceivers();
    preferRedundantAudio(slots[0]);
    if (slots[SCREEN_SLOT]) preferVideoCodecs(slots[SCREEN_SLOT], ["video/av1", "video/vp8"]);
  }

  private closePeer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;

    clearTimeout(peer.fallback);
    clearTimeout(peer.heardTimer);
    peer.pc?.close();
    peer.stream.getTracks().forEach((track) => track.stop());
    this.peers.delete(id);
    playSound("end");

    if (!this.peers.size && !this.meeting) this.releaseMedia();
  }

  /** The microphone, for a call starting. The camera joins only when it is switched on (addCamera). */
  private openMedia(): Promise<boolean> {
    if (this.local) return Promise.resolve(true);
    this.opening ??= this.openMic().finally(() => (this.opening = null));
    return this.opening;
  }

  private async openMic(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = "unsupported";
      return false;
    }

    let stream: MediaStream;
    try {
      stream = await openPicked("audio", audioConstraints(), savedDevices().audio);
    } catch {
      this.error = "media";
      return false;
    }
    // The call or meeting ended while the browser asked: nothing needs the microphone now.
    const ended = () => !this.peers.size && !this.meeting && !this.ringPeer;
    if (ended()) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    const microphone = stream.getAudioTracks()[0] ?? null;
    this.useMicrophone(microphone);
    this.local = stream;
    this.voiceApplied = voiceKey();
    stream.getAudioTracks().forEach((track) => (track.enabled = this.micEnabled));
    this.error = null;
    if (microphone) void this.filterVoice(microphone);
    return true;
  }

  /** Turns the camera on in the call's stream; whether it is on afterwards. */
  private async addCamera(): Promise<boolean> {
    if (!this.local) return false;
    if (this.local.getVideoTracks().length) return true;

    let track: MediaStreamTrack;
    try {
      const stream = await openPicked("video", CAMERA_CAPTURE, savedDevices().video);
      track = stream.getVideoTracks()[0];
    } catch {
      this.error = "camera";
      return false;
    }
    // While it opened the call may have ended, you may have switched it off,
    // or a second press may have opened it already: then this one stops.
    const local = this.local;
    if (!local || !this.cameraWanted || local.getVideoTracks().length) {
      track.stop();
      return !!local && this.cameraWanted && local.getVideoTracks().length > 0;
    }
    this.watchCamera(track);
    local.addTrack(track);
    this.error = null;
    return true;
  }

  /** Changes to the open microphone, one after another, so two never open it at once. */
  private queueVoice(change: () => Promise<void>) {
    this.voiceChange = this.voiceChange.then(change).catch((error) => console.warn("Microphone change failed", error));
  }

  /**
   * The voice settings or the microphone picked, on a call already open. Chrome
   * won't change its own processing on a microphone that is open, so the
   * microphone opens again with the new settings, the call swaps to it, and the
   * old one stops. Other settings don't touch the voice. `reopen` opens it again
   * with nothing changed: the microphone in use went away.
   */
  private async applyVoicePrefs(reopen = false) {
    const key = voiceKey();
    if (key === this.voiceApplied && !reopen) return;
    this.voiceApplied = key;
    const local = this.local;
    if (!local?.getAudioTracks().length) return;

    // The old microphone stops first: while it is open, Chrome gives a new
    // one the same processing, whatever it asks for. A moment of silence.
    local.getAudioTracks().forEach((track) => track.stop());
    this.stopVoice();
    let fresh: MediaStream;
    try {
      fresh = await openPicked("audio", audioConstraints(), savedDevices().audio);
    } catch {
      fresh = new MediaStream();
    }
    // The call ended while the microphone opened: it isn't needed.
    if (this.local !== local) {
      fresh.getTracks().forEach((track) => track.stop());
      return;
    }
    const microphone = fresh.getAudioTracks()[0] ?? null;
    this.useMicrophone(microphone);
    this.local = new MediaStream([...fresh.getAudioTracks(), ...local.getVideoTracks()]);
    if (!microphone) this.error = "media";
    this.local.getAudioTracks().forEach((track) => (track.enabled = this.micEnabled));
    this.listenForVoice();
    this.shareTracks();
    if (microphone) void this.filterVoice(microphone);
  }

  /** The filter starts loading while a call rings or a meeting is joined, when noise removal is on. */
  private prepareVoice() {
    if (prefs().noiseSuppression) prepareNoiseRemoval();
  }

  /** The microphone the call now has, watched for being unplugged. */
  private useMicrophone(microphone: MediaStreamTrack | null) {
    this.stopVoice();
    this.microphone = microphone;
    // Unplugged, or taken by the system: the call goes on with the default microphone.
    microphone?.addEventListener("ended", () => {
      if (this.microphone === microphone) this.queueVoice(() => this.applyVoicePrefs(true));
    });
  }

  /**
   * Noise removal, swapped in for the microphone once it runs. The call starts
   * with the microphone as it is instead of waiting for the filter to load,
   * which took 5 s or more on a first call. Muting then moves to the filtered
   * track: the microphone under it must keep running for the filter to hear it.
   */
  private async filterVoice(microphone: MediaStreamTrack) {
    if (!prefs().noiseSuppression) return;
    const clean = await removeNoise(microphone);
    if (!clean) return;
    const local = this.local;
    // Meanwhile the microphone was replaced, or the call ended: the filter isn't needed.
    if (this.microphone !== microphone || microphone.readyState !== "live" || !local?.getAudioTracks().includes(microphone)) {
      if (this.microphone === microphone && microphone.readyState === "live") clean.release();
      else clean.stop();
      return;
    }
    this.cleanVoice = clean;
    clean.track.enabled = microphone.enabled;
    microphone.enabled = true;
    local.removeTrack(microphone);
    local.addTrack(clean.track);
    this.listenForVoice();
    this.shareTracks();
  }

  private stopVoice() {
    this.cleanVoice?.stop();
    this.cleanVoice = null;
  }

  /**
   * After a device came or went: the open microphone should be the one picked
   * in settings when it's there, otherwise the system's default (Chrome lists
   * it as "default", in the same group as the real device). Headphones plugged
   * in become the default, and the call moves to their microphone.
   */
  private async followMicrophone() {
    const microphone = this.microphone;
    if (!microphone || microphone.readyState === "ended" || !this.local) return;
    const inputs = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter((device) => device.kind === "audioinput");
    if (!inputs.length) return;
    const { deviceId, groupId } = microphone.getSettings();
    const picked = savedDevices().audio;
    const target = inputs.find((device) => device.deviceId === picked) ?? inputs.find((device) => device.deviceId === "default");
    if (!target) {
      // No default listed (Safari, Firefox): only a microphone that's gone needs replacing.
      if (deviceId && !inputs.some((device) => device.deviceId === deviceId)) await this.applyVoicePrefs(true);
      return;
    }
    const same = target.deviceId === "default" ? !!groupId && target.groupId === groupId : target.deviceId === deviceId;
    if (!same) await this.applyVoicePrefs(true);
  }

  /** The camera picked in settings, swapped in while the camera is on. */
  private async switchCamera() {
    const local = this.local;
    const current = local?.getVideoTracks()[0];
    const picked = savedDevices().video;
    if (!local || !current || current.getSettings().deviceId === picked) return;
    let track: MediaStreamTrack;
    try {
      // The old camera stops first: some cameras can't be open twice.
      current.stop();
      const stream = await openPicked("video", CAMERA_CAPTURE, picked);
      track = stream.getVideoTracks()[0];
    } catch {
      local.removeTrack(current);
      this.cameraEnabled = false;
      this.error = "camera";
      return this.shareTracks();
    }
    if (this.local !== local || !this.cameraWanted) {
      track.stop();
      return;
    }
    local.removeTrack(current);
    this.watchCamera(track);
    local.addTrack(track);
    this.shareTracks();
  }

  /** A camera unplugged mid-call switches the camera off, as if you had. */
  private watchCamera(track: MediaStreamTrack) {
    track.addEventListener("ended", () => {
      if (this.local?.getVideoTracks()[0] === track) void this.setCamera(false);
    });
  }

  /** The call is over: everything stops, and the camera is off again for the next one. */
  private releaseMedia() {
    this.cameraEnabled = false;
    this.cameraWanted = false;
    this.stopVoice();
    this.local?.getTracks().forEach((track) => track.stop());
    this.screen?.getTracks().forEach((track) => track.stop());
    this.microphone = null;
    this.local = null;
    this.watchMuted();
    this.screen = null;
  }

  /** Cloudflare TURN credentials from the API, refreshed before they run out. */
  private async loadIceServers() {
    clearTimeout(this.iceTimer);
    try {
      const { iceServers, expiresAt } = await api.iceServers();
      const first = !this.iceServers.length;
      this.iceServers = iceServers;
      // A call (or a ring) that started before the first credentials came has
      // nothing to relay through yet: hand them over and gather again. Only the
      // offerer can start that; the answerer asks it to.
      if (first) {
        for (const peer of [...this.peers.values(), ...(this.ringPeer ? [this.ringPeer] : [])]) {
          peer.pc?.setConfiguration({
            iceServers: peer.widened ? iceServers : udpRelay(iceServers),
            iceTransportPolicy: RELAY_ONLY,
          });
          if (peer.offerer) peer.pc?.restartIce();
          else this.send("signal", peer.id, { signal: { restart: true } });
        }
      }
      const refreshIn = Math.max(60_000, expiresAt - Date.now() - ICE_REFRESH_MARGIN_MS);
      this.iceTimer = setTimeout(() => void this.loadIceServers(), refreshIn);
    } catch {
      // No relay, no call: try again soon, sooner while there are none at all.
      this.iceTimer = setTimeout(() => void this.loadIceServers(), this.iceServers.length ? 60_000 : 5_000);
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

  /**
   * Tells the room when we're in a call on the floor and whether video is
   * coming to us in it, so what calls cost can be counted (docs/costs.md). Sent only
   * when that changes.
   */
  private reportCall() {
    const peers = [...this.peers.values()];
    const call = peers.some((peer) => peer.connected);
    const shown = typeof document === "undefined" || document.visibilityState !== "hidden";
    const video = call && shown && peers.some((peer) => peer.camera || peer.screen);
    const report = `${call}${video}`;
    if (report === this.callReport || !this.ws) return;
    this.callReport = report;
    this.ws.send({ t: "call_usage", call, video });
  }

  /** Listens for talk while a camera of ours is on in a call or meeting; stops when it isn't. */
  private watchQuiet() {
    const live = this.cameraEnabled && (this.peers.size > 0 || !!this.meeting);
    if (live && !this.quietTimer) {
      this.heardAt = Date.now();
      this.quietTimer = setInterval(() => void this.checkQuiet(), LISTEN_EVERY_MS);
    } else if (!live && this.quietTimer) {
      clearInterval(this.quietTimer);
      this.quietTimer = undefined;
      this.energy.clear();
    }
  }

  private async checkQuiet() {
    const now = Date.now();
    if (await this.heardTalk(now)) this.heardAt = now;
    if (!this.cameraEnabled || now - this.heardAt < QUIET_REST_MS) return;
    await this.setCamera(false);
    this.cameraRested = true;
    clearTimeout(this.restedTimer);
    this.restedTimer = setTimeout(() => this.clearRested(), 12_000);
    this.emit();
  }

  private clearRested() {
    clearTimeout(this.restedTimer);
    if (!this.cameraRested) return;
    this.cameraRested = false;
    this.emit();
  }

  /**
   * Whether anyone talked since we last listened: in a meeting the room says
   * who spoke when; on a call, the sound that came in and went out.
   */
  private async heardTalk(now: number): Promise<boolean> {
    if (this.meeting) {
      const { meetings, spokeAt } = meetingsState();
      const members = meetings.find((one) => one.id === this.meeting)?.members ?? [];
      if (members.some((member) => member.speaking || now - (spokeAt.get(member.id) ?? 0) < LISTEN_EVERY_MS * 1.5)) return true;
    }
    let heard = false;
    for (const peer of this.peers.values()) {
      const stats = await peer.pc?.getStats().catch(() => null);
      stats?.forEach((report: { id: string; type: string; kind?: string; totalAudioEnergy?: number }) => {
        if (report.kind !== "audio" || typeof report.totalAudioEnergy !== "number") return;
        if (report.type !== "inbound-rtp" && report.type !== "media-source") return;
        const key = `${peer.id}:${report.id}`;
        const before = this.energy.get(key);
        this.energy.set(key, report.totalAudioEnergy);
        if (before !== undefined && report.totalAudioEnergy - before > TALK_ENERGY) heard = true;
      });
    }
    return heard;
  }

  private emit() {
    this.reportCall();
    this.watchQuiet();
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
      cameraRested: this.cameraRested,
      talkingMuted: this.talkingMuted,
    };
    this.listeners.forEach((listener) => listener());
  }
}

export const callManager = new CallManager();

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  (window as unknown as Record<string, unknown>).__call = callManager;
}
