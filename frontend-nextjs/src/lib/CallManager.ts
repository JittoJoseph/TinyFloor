import { onPrefsChange, prefs } from "./prefs";
import type { FilteredMic } from "./noiseFilter";
import type {
  CallKind,
  MediaFlags,
  ServerMessage,
  VideoKind,
  VideoQuality,
} from "@shared/messages";
import type { RoomSocket } from "./RoomSocket";
import { api } from "./api";
import {
  CAMERA_CAPTURE,
  SCREEN_CAPTURE,
  deviceConstraint,
  savedDevices,
  screenTooSmallForDetail,
  sendAtQuality,
} from "./media";
import { SfuMeeting } from "./SfuMeeting";
import { playSound, loopSound, stopSound } from "./sounds";
import { GUIDE_ID } from "./tutorial";
import { sceneText } from "./sceneText";
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

export interface CallSnapshot {
  incoming: { id: string; name: string } | null;
  outgoing: { id: string; name: string } | null;
  peers: CallPeer[];
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
}

interface PeerEntry extends CallPeer {
  pc?: RTCPeerConnection;
  /** What they asked us for, and what we last asked them for. */
  wants: Record<VideoKind, VideoQuality>;
  asked?: string;
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
      | "sfu";
  }
>;

const RELAY_ONLY: RTCIceTransportPolicy = "relay";
/** Credentials are refreshed this long before they expire. */
const ICE_REFRESH_MARGIN_MS = 15 * 60 * 1000;
const RING_TIMEOUT = 30000;
const GUIDE_ANSWER_DELAY = 1600;
/** What the browser does to your voice, as your settings ask (lib/prefs.ts). */
function audioConstraints() {
  const { echoCancellation, noiseSuppression, enhancedNoise } = prefs();
  // With RNNoise on, the browser's own suppression would only fight it.
  return {
    echoCancellation,
    noiseSuppression: noiseSuppression && !enhancedNoise,
    autoGainControl: true,
  };
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
 * Proximity calls are one WebRTC connection per pair, always through the TURN
 * relay (see RELAY_ONLY). A call is a conversation: it starts with voice, and
 * the camera and a shared screen are there to switch on, never on by
 * themselves, so only whoever switches one on sends video. Every connection has one side that offers,
 * the caller or whoever was added last, and the other only answers, so two
 * offers never cross. Each carries a fixed mic, camera and screen slot, and
 * turning any of them on or off swaps what is in the slot instead of
 * renegotiating. Meeting tables go through the SFU instead (SfuMeeting).
 */
class CallManager {
  private ws: RoomSocket | null = null;
  private peers = new Map<string, PeerEntry>();
  private sfu: SfuMeeting | null = null;
  private local: MediaStream | null = null;
  /** With stronger noise removal on: the microphone itself, and the filter the call hears instead. */
  private rawMic: MediaStreamTrack | null = null;
  private filter: FilteredMic | null = null;
  private screen: MediaStream | null = null;
  private incoming: { id: string; name: string } | null = null;
  private outgoing: { id: string; name: string } | null = null;
  private micEnabled = MIC_ON;
  private cameraEnabled = false;
  private meeting: string | null = null;
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
    // A phone turned sideways, or a window resized past the phone width.
    if (typeof window !== "undefined") {
      window
        .matchMedia("(max-width: 767px)")
        .addEventListener("change", () => this.shareQuality());
      // Noise suppression and echo cancellation switched in settings reach the
      // microphone that is already open, not only the next call's.
      onPrefsChange(() => {
        const wanted = audioConstraints();
        const mics = this.rawMic
          ? [this.rawMic]
          : (this.local?.getAudioTracks() ?? []);
        mics.forEach(
          (track) => void track.applyConstraints(wanted).catch(() => {}),
        );
      });
    }
  }

  attach(ws: RoomSocket) {
    this.ws = ws;
    void this.loadIceServers();
  }

  detach() {
    this.leaveMeeting();
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

  /** Calls someone, with voice. Calling someone while already on a call brings them into it. */
  invite(id: string, name: string) {
    if (this.busy() || this.peers.has(id)) return;
    if (id === GUIDE_ID ? this.peers.size : !this.ws) return;

    this.error = null;
    this.outcome = null;
    this.outgoing = { id, name };
    loopSound("ring");

    if (id === GUIDE_ID) {
      this.ring(() => this.answerAsGuide(), GUIDE_ANSWER_DELAY);
    } else {
      this.send("invite", id, { group: this.peers.size > 0 });
      this.ring(() => {
        this.tell({ id, name, kind: "unanswered" });
        this.cancel();
      });
    }
    this.emit();
  }

  private async answerAsGuide() {
    if (this.outgoing?.id !== GUIDE_ID) return;

    stopSound("ring");
    this.outgoing = null;
    this.peers.set(GUIDE_ID, {
      id: GUIDE_ID,
      name: sceneText().guide,
      stream: new MediaStream(),
      connected: true,
      mic: true,
      camera: false,
      screen: false,
      screenStream: null,
      wants: { ...LOW },
    });
    playSound("connect");
    this.emit();

    await this.openMedia();
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
    this.introduce(call.id);
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
    if (this.outgoing.id !== GUIDE_ID) {
      this.send("end", this.outgoing.id);
    }
    this.outgoing = null;
    this.emit();
  }

  hangUp(id?: string) {
    const targets = id ? [id] : [...this.peers.keys()];
    targets.forEach((peerId) => {
      if (peerId !== GUIDE_ID) this.send("end", peerId);
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
        this.onInvite(from, fromName, !!payload.group);
        break;
      case "add":
        this.onAdd(from, payload);
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

  /** Sitting at a meeting table: the call runs through the SFU. */
  handleMeeting(message: MeetingMessage) {
    switch (message.t) {
      case "meeting_joined":
        void this.joinMeeting(message.meeting, message.members);
        break;
      case "meeting_member_joined":
        this.sfu?.addMember(message.id, message.name);
        break;
      case "meeting_member_left":
        this.sfu?.removeMember(message.id);
        break;
      case "sfu":
        this.sfu?.handle(message);
        break;
    }
  }

  leaveMeeting() {
    if (!this.meeting) return;
    this.meeting = null;
    this.sfu?.close();
    this.sfu = null;
    this.releaseMedia();
    playSound("end");
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

  /** Asks the SFU, and each peer we talk to directly, for what our cards can show. */
  private shareQuality() {
    const wanted = (id: string, kind: VideoKind): VideoQuality =>
      this.focus?.id === id &&
      this.focus.kind === kind &&
      !screenTooSmallForDetail()
        ? "high"
        : "low";

    this.sfu?.setQuality(wanted);
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
    this.emit();
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

  private async joinMeeting(name: string, members: MeetingMember[]) {
    this.hangUp();
    this.sfu?.close();
    this.meeting = name;
    this.error = null;
    // Ready straight away, so it hears who is already sharing while media opens.
    const sfu = new SfuMeeting(
      (message) => this.ws?.send({ t: "sfu", ...message }),
      () => this.emit(),
      this.iceServers,
    );
    this.sfu = sfu;
    members.forEach((member) => sfu.addMember(member.id, member.name));
    playSound("connect");
    this.emit();

    const opened = await this.openMedia();
    if (this.sfu !== sfu) return;
    sfu.publishLocal(opened ? this.local : null, this.flags());
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

  /** Mid meeting, mid ring or on the tutorial call, nobody else gets through. */
  private busy() {
    return !!(
      this.meeting ||
      this.incoming ||
      this.outgoing ||
      this.peers.has(GUIDE_ID)
    );
  }

  /**
   * Whoever already has others on the call introduces the newcomer to each of
   * them, and the newcomer offers. Two calls never merge, so only one side ever
   * has anyone to introduce.
   */
  private introduce(id: string) {
    this.peers.forEach((peer) => {
      if (peer.id === id || !peer.pc) return;
      this.send("add", peer.id, { id, offer: false });
      this.send("add", id, { id: peer.id, offer: true });
    });
  }

  /** Only someone we are already talking to can add people to our call. */
  private onAdd(from: string, data: Record<string, unknown>) {
    if (this.meeting || !this.peers.has(from) || typeof data.id !== "string")
      return;
    const peer = this.createPeer(
      data.id,
      String(data.name || "Someone"),
      !!data.offer,
    );
    if (this.local) this.syncTracks(peer);
    this.emit();
  }

  private onInvite(id: string, name: string, group: boolean) {
    if (this.busy() || (group && this.peers.size)) {
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
    this.introduce(id);
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
      iceServers: this.iceServers,
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
    };
    this.peers.set(id, peer);

    pc.onicecandidate = ({ candidate }) => {
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
      if (pc.connectionState === "failed") pc.restartIce();
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
    }

    return peer;
  }

  private async onSignal(from: string, signal: Signal) {
    const peer = this.peers.get(from);
    const pc = peer?.pc;
    if (!peer || !pc || !signal) return;

    try {
      if (signal.want) {
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
      await this.filterVoice();
      this.local
        .getAudioTracks()
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
   * Stronger noise removal, when it is switched on: the call sends RNNoise's
   * output instead of the microphone. Loaded only here, so nobody who leaves
   * it off downloads it; if it fails, the plain microphone is used.
   */
  private async filterVoice() {
    const mic = this.local?.getAudioTracks()[0];
    if (!mic || !prefs().enhancedNoise) return;
    const { filterMic } = await import("./noiseFilter");
    const filter = await filterMic(mic);
    if (!filter || !this.local) {
      filter?.stop();
      return;
    }
    this.filter = filter;
    this.rawMic = mic;
    this.local = new MediaStream([
      filter.track,
      ...this.local.getVideoTracks(),
    ]);
  }

  /** The call is over: everything stops, and the camera is off again for the next one. */
  private releaseMedia() {
    this.cameraEnabled = false;
    this.filter?.stop();
    this.rawMic?.stop();
    this.filter = null;
    this.rawMic = null;
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
            iceServers,
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
    const peers = this.sfu
      ? this.sfu.peerList
      : [...this.peers.values()].map((peer) => ({ ...peer, pc: undefined }));
    this.snap = {
      incoming: this.incoming,
      outgoing: this.outgoing && {
        id: this.outgoing.id,
        name: this.outgoing.name,
      },
      peers,
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
