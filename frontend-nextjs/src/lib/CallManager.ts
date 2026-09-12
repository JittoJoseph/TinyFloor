import { WebSocketManager } from "./WebSocketManager";
import { playSound, loopSound, stopSound } from "./sounds";
import { GUIDE_ID } from "./tutorial";
import { sceneText } from "./sceneText";
import { isSpeakerMuted, onSpeakerChange, setSpeakerMuted } from "./speaker";

// Error codes, not copy: the call overlay turns them into translated text.
export type CallError = "connection" | "unsupported" | "media" | "camera";

export interface CallPeer {
  id: string;
  name: string;
  stream: MediaStream;
  connected: boolean;
  mic: boolean;
  camera: boolean;
}

export interface CallSnapshot {
  incoming: { id: string; name: string; video: boolean } | null;
  outgoing: { id: string; name: string } | null;
  peers: CallPeer[];
  localStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  meeting: string | null;
  error: CallError | null;
}

interface Signal {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  media?: { mic: boolean; camera: boolean };
}

interface PeerEntry extends CallPeer {
  pc?: RTCPeerConnection;
}

interface MeetingMember {
  id: string;
  name?: string;
}

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
const RING_TIMEOUT = 30000;
const GUIDE_ANSWER_DELAY = 1600;
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
const KINDS = ["audio", "video"] as const;

function savedDevices(): { audio?: string; video?: string } {
  try {
    const raw = localStorage.getItem("spacialMeetSettings");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return { audio: parsed.audioInput, video: parsed.videoInput };
  } catch {
    return {};
  }
}

function deviceId(id?: string) {
  return id ? { exact: id } : undefined;
}

const PREFS_KEY = "spacialMeetCallPrefs";

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { mic: true, camera: true };
    const parsed = JSON.parse(raw);
    return { mic: parsed.mic !== false, camera: parsed.camera !== false };
  } catch {
    return { mic: true, camera: true };
  }
}

function savePreferences(mic: boolean, camera: boolean) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mic, camera }));
  } catch {}
}

const EMPTY: CallSnapshot = {
  incoming: null,
  outgoing: null,
  peers: [],
  localStream: null,
  micEnabled: true,
  cameraEnabled: true,
  speakerEnabled: true,
  meeting: null,
  error: null,
};

const PREFS = loadPreferences();

/**
 * Every connection has one side that offers, the caller or whoever sat down
 * last, and the other only answers, so two offers never cross. Each connection
 * carries a fixed audio and video slot, and turning the mic or camera on or off
 * swaps what is in the slot instead of renegotiating.
 */
class CallManager {
  private ws: WebSocketManager | null = null;
  private peers = new Map<string, PeerEntry>();
  private local: MediaStream | null = null;
  private incoming: { id: string; name: string; video: boolean } | null = null;
  private outgoing: { id: string; name: string; video: boolean } | null = null;
  private micEnabled = PREFS.mic;
  private cameraEnabled = PREFS.camera;
  private meeting: string | null = null;
  private error: CallError | null = null;
  private ringTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private snap: CallSnapshot = {
    ...EMPTY,
    micEnabled: PREFS.mic,
    cameraEnabled: PREFS.camera,
    speakerEnabled: !isSpeakerMuted(),
  };

  constructor() {
    onSpeakerChange(() => this.emit());
  }

  attach(ws: WebSocketManager) {
    this.ws = ws;
  }

  detach() {
    this.leaveMeeting();
    this.hangUp();
    stopSound("ring");
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

  /** Calling someone while already on a call brings them into it. */
  invite(id: string, name: string, video: boolean) {
    if (this.busy() || this.peers.has(id)) return;
    if (id === GUIDE_ID ? this.peers.size : !this.ws) return;

    this.error = null;
    this.outgoing = { id, name, video };
    loopSound("ring");

    if (id === GUIDE_ID) {
      this.ring(() => this.answerAsGuide(video), GUIDE_ANSWER_DELAY);
    } else {
      this.send("call_invite", { to: id, video, group: this.peers.size > 0 });
      this.ring(() => this.cancel());
    }
    this.emit();
  }

  private async answerAsGuide(video: boolean) {
    if (this.outgoing?.id !== GUIDE_ID) return;

    stopSound("ring");
    this.outgoing = null;
    this.peers.set(GUIDE_ID, {
      id: GUIDE_ID,
      name: sceneText().guide,
      stream: new MediaStream(),
      connected: true,
      mic: true,
      camera: true,
    });
    playSound("connect");
    this.emit();

    await this.openMedia(video);
    this.emit();
  }

  async accept() {
    const call = this.incoming;
    if (!call) return;

    this.clearRing();
    stopSound("ring");
    this.incoming = null;

    this.createPeer(call.id, call.name, false);
    this.send("call_accept", { to: call.id });
    this.introduce(call.id);
    this.emit();

    await this.startCall(call.id, call.video);
  }

  decline() {
    if (!this.incoming) return;
    this.clearRing();
    stopSound("ring");
    this.send("call_decline", { to: this.incoming.id, reason: "declined" });
    this.incoming = null;
    this.emit();
  }

  cancel() {
    if (!this.outgoing) return;
    this.clearRing();
    stopSound("ring");
    if (this.outgoing.id !== GUIDE_ID) {
      this.send("call_end", { to: this.outgoing.id });
    }
    this.outgoing = null;
    this.emit();
  }

  hangUp(id?: string) {
    const targets = id ? [id] : [...this.peers.keys()];
    targets.forEach((peerId) => {
      if (peerId !== GUIDE_ID) this.send("call_end", { to: peerId });
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
      this.clearRing();
      this.incoming = null;
    }
    if (this.outgoing?.id === id) {
      this.clearRing();
      this.outgoing = null;
    }
    this.closePeer(id);
    this.emit();
  }

  handleMessage(type: string, data: Record<string, unknown>) {
    const from = data.from as string;
    if (!from) return;

    switch (type) {
      case "call_invite":
        this.onInvite(from, data.fromName as string, !!data.video, !!data.group);
        break;
      case "call_add":
        this.onAdd(from, data);
        break;
      case "call_accept":
        this.onAccept(from);
        break;
      case "call_decline":
        if (this.outgoing?.id === from) this.cancelOutgoing();
        break;
      case "call_signal":
        this.onSignal(from, data.signal as Signal);
        break;
      case "call_end":
        this.dropPeer(from);
        break;
    }
  }

  /**
   * A table call is a mesh. Whoever sits down offers to everyone already
   * seated; those already seated wait for that offer.
   */
  handleMeeting(type: string, data: Record<string, unknown>) {
    switch (type) {
      case "meeting_joined":
        void this.joinMeeting(
          String(data.meeting),
          (data.members as MeetingMember[] | undefined) ?? [],
        );
        break;
      case "meeting_member_joined":
        if (!this.meeting) break;
        this.createPeer(String(data.id), String(data.name || "Someone"), false);
        this.emit();
        break;
      case "meeting_member_left":
        if (this.meeting) this.dropPeer(String(data.id));
        break;
    }
  }

  leaveMeeting() {
    if (!this.meeting) return;
    this.meeting = null;
    [...this.peers.keys()].forEach((id) => this.closePeer(id));
    this.releaseMedia();
    playSound("end");
    this.emit();
  }

  setMic(enabled: boolean) {
    this.micEnabled = enabled;
    this.local?.getAudioTracks().forEach((track) => (track.enabled = enabled));
    savePreferences(enabled, this.cameraEnabled);
    this.shareMedia();
    this.emit();
  }

  async setCamera(enabled: boolean) {
    if (enabled && this.local && !this.local.getVideoTracks().length) {
      if (!(await this.addCamera())) return this.emit();
    } else if (!enabled && this.local) {
      this.local.getVideoTracks().forEach((track) => {
        this.local!.removeTrack(track);
        track.stop();
      });
    }

    this.cameraEnabled = enabled;
    savePreferences(this.micEnabled, enabled);
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
    this.meeting = name;
    this.error = null;
    members.forEach((member) =>
      this.createPeer(member.id, member.name || "Someone", true),
    );
    playSound("connect");
    this.emit();

    const opened = await this.openMedia(true);
    if (this.meeting !== name) {
      if (!this.peers.size) this.releaseMedia();
      return;
    }
    if (opened) this.shareTracks();
    else this.emit();
  }

  private async startCall(id: string, video: boolean) {
    if (await this.openMedia(video)) this.shareTracks();
    else this.hangUp(id);
  }

  /** Puts our mic and camera on every connection and tells each peer what is on. */
  private shareTracks() {
    this.peers.forEach((peer) => this.syncTracks(peer));
    this.shareMedia();
    this.emit();
  }

  private syncTracks(peer: PeerEntry) {
    peer.pc?.getTransceivers().forEach((transceiver) => {
      const kind = transceiver.receiver.track.kind;
      if (transceiver.direction !== "sendrecv") transceiver.direction = "sendrecv";
      transceiver.sender
        .replaceTrack(this.local?.getTracks().find((t) => t.kind === kind) ?? null)
        .catch(() => {});
    });
  }

  private shareMedia(to?: PeerEntry) {
    const media = {
      mic: this.micEnabled && !!this.local?.getAudioTracks().length,
      camera: this.cameraEnabled && !!this.local?.getVideoTracks().length,
    };
    (to ? [to] : [...this.peers.values()]).forEach((peer) => {
      if (peer.pc) this.send("call_signal", { to: peer.id, signal: { media } });
    });
  }

  /** Mid meeting, mid ring or on the tutorial call, nobody else gets through. */
  private busy() {
    return !!(this.meeting || this.incoming || this.outgoing || this.peers.has(GUIDE_ID));
  }

  /**
   * Whoever already has others on the call introduces the newcomer to each of
   * them, and the newcomer offers, just like sitting down at the table. Two
   * calls never merge, so only one side ever has anyone to introduce.
   */
  private introduce(id: string) {
    this.peers.forEach((peer) => {
      if (peer.id === id || !peer.pc) return;
      this.send("call_add", { to: peer.id, id, offer: false });
      this.send("call_add", { to: id, id: peer.id, offer: true });
    });
  }

  /** Only someone we are already talking to can add people to our call. */
  private onAdd(from: string, data: Record<string, unknown>) {
    if (this.meeting || !this.peers.has(from) || typeof data.id !== "string") return;
    const peer = this.createPeer(data.id, String(data.name || "Someone"), !!data.offer);
    if (this.local) this.syncTracks(peer);
    this.emit();
  }

  private onInvite(id: string, name: string, video: boolean, group: boolean) {
    if (this.busy() || (group && this.peers.size)) {
      this.send("call_decline", { to: id, reason: "busy" });
      return;
    }
    this.error = null;
    this.incoming = { id, name: name || "Someone", video };
    this.ring(() => this.decline());
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

    await this.startCall(id, call.video);
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

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: PeerEntry = {
      id,
      name,
      pc,
      stream: new MediaStream(),
      connected: false,
      mic: true,
      camera: true,
    };
    this.peers.set(id, peer);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.send("call_signal", { to: id, signal: { candidate: candidate.toJSON() } });
      }
    };

    pc.ontrack = ({ track }) => {
      peer.stream = new MediaStream([...peer.stream.getTracks(), track]);
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
          this.send("call_signal", { to: id, signal: { sdp: pc.localDescription! } });
        } catch {
          this.error = "connection";
          this.emit();
        }
      };
      KINDS.forEach((kind) => pc.addTransceiver(kind, { direction: "sendrecv" }));
    }

    return peer;
  }

  private async onSignal(from: string, signal: Signal) {
    const peer = this.peers.get(from);
    const pc = peer?.pc;
    if (!peer || !pc || !signal) return;

    try {
      if (signal.media) {
        peer.mic = signal.media.mic;
        peer.camera = signal.media.camera;
        this.emit();
      } else if (signal.candidate) {
        await pc.addIceCandidate(signal.candidate).catch(() => {});
      } else if (signal.sdp) {
        await pc.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === "offer") {
          this.syncTracks(peer);
          await pc.setLocalDescription();
          this.send("call_signal", { to: from, signal: { sdp: pc.localDescription! } });
        }
        this.shareMedia(peer);
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

  private async openMedia(video: boolean): Promise<boolean> {
    const wantsCamera = video && this.cameraEnabled;
    if (this.local) return wantsCamera ? this.addCamera() : true;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = "unsupported";
      return false;
    }

    try {
      const devices = savedDevices();
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { ...AUDIO_CONSTRAINTS, deviceId: deviceId(devices.audio) },
        video: wantsCamera && videoConstraints(devices.video),
      });
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
        video: videoConstraints(savedDevices().video),
      });
      this.local.addTrack(stream.getVideoTracks()[0]);
      this.error = null;
      return true;
    } catch {
      this.error = "camera";
      return false;
    }
  }

  private releaseMedia() {
    this.local?.getTracks().forEach((track) => track.stop());
    this.local = null;
  }

  private ring(onTimeout: () => void, delay: number = RING_TIMEOUT) {
    this.clearRing();
    this.ringTimer = setTimeout(onTimeout, delay);
  }

  private clearRing() {
    clearTimeout(this.ringTimer);
    this.ringTimer = undefined;
  }

  private send(type: string, data: Record<string, unknown>) {
    this.ws?.send(type, data);
  }

  private emit() {
    this.snap = {
      incoming: this.incoming,
      outgoing: this.outgoing && {
        id: this.outgoing.id,
        name: this.outgoing.name,
      },
      peers: [...this.peers.values()].map((peer) => ({ ...peer, pc: undefined })),
      localStream: this.local,
      micEnabled: this.micEnabled,
      cameraEnabled: this.cameraEnabled,
      speakerEnabled: !isSpeakerMuted(),
      meeting: this.meeting,
      error: this.error,
    };
    this.listeners.forEach((listener) => listener());
  }
}

function videoConstraints(id?: string): MediaTrackConstraints {
  return {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: "user",
    deviceId: deviceId(id),
  };
}

export const callManager = new CallManager();
