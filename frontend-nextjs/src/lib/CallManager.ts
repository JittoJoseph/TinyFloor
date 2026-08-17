import { WebSocketManager } from "./WebSocketManager";
import { playSound, loopSound, stopSound } from "./sounds";

export interface CallPeer {
  id: string;
  name: string;
  stream: MediaStream;
  connected: boolean;
}

export interface CallSnapshot {
  incoming: { id: string; name: string; video: boolean } | null;
  outgoing: { id: string; name: string } | null;
  peers: CallPeer[];
  localStream: MediaStream | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  error: string | null;
}

interface Signal {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface PeerEntry {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  connected: boolean;
  videoSender?: RTCRtpSender;
}

const ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
];
const RING_TIMEOUT = 30000;
const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

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

const EMPTY: CallSnapshot = {
  incoming: null,
  outgoing: null,
  peers: [],
  localStream: null,
  micEnabled: true,
  cameraEnabled: true,
  speakerEnabled: true,
  error: null,
};

class CallManager {
  private ws: WebSocketManager | null = null;
  private selfId = "";
  private peers = new Map<string, PeerEntry>();
  private local: MediaStream | null = null;
  private incoming: { id: string; name: string; video: boolean } | null = null;
  private outgoing: { id: string; name: string; video: boolean } | null = null;
  private micEnabled = true;
  private cameraEnabled = true;
  private speakerEnabled = true;
  private error: string | null = null;
  private ringTimer?: ReturnType<typeof setTimeout>;
  private listeners = new Set<() => void>();
  private snap: CallSnapshot = EMPTY;

  attach(ws: WebSocketManager, selfId: string) {
    this.ws = ws;
    this.selfId = selfId;
  }

  detach() {
    this.hangUp();
    stopSound("ring");
    this.ws = null;
    this.selfId = "";
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snap;

  isPeer(id: string) {
    return this.peers.has(id);
  }

  invite(id: string, name: string, video: boolean) {
    if (!this.ws || this.peers.size || this.incoming || this.outgoing) return;
    this.error = null;
    this.outgoing = { id, name, video };
    this.send("call_invite", { to: id, video });
    loopSound("ring");
    this.ring(() => this.cancel());
    this.emit();
  }

  async accept() {
    const call = this.incoming;
    if (!call) return;

    this.clearRing();
    stopSound("ring");
    this.incoming = null;
    this.emit();

    if (!(await this.openMedia(call.video))) {
      this.send("call_decline", { to: call.id, reason: "media_error" });
      this.emit();
      return;
    }

    this.send("call_accept", { to: call.id });
    this.createPeer(call.id, call.name);
    this.emit();
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
    this.send("call_end", { to: this.outgoing.id });
    this.outgoing = null;
    this.emit();
  }

  hangUp(id?: string) {
    const targets = id ? [id] : [...this.peers.keys()];
    targets.forEach((peerId) => {
      this.send("call_end", { to: peerId });
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
        this.onInvite(from, data.fromName as string, !!data.video);
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

  setMic(enabled: boolean) {
    this.micEnabled = enabled;
    this.local?.getAudioTracks().forEach((track) => (track.enabled = enabled));
    this.emit();
  }

  async setCamera(enabled: boolean) {
    if (!this.local) return;

    if (enabled) {
      if (!this.local.getVideoTracks().length && !(await this.addCamera()))
        return this.emit();
    } else {
      this.local.getVideoTracks().forEach((track) => {
        this.local!.removeTrack(track);
        track.stop();
      });
      this.peers.forEach((peer) => peer.videoSender?.replaceTrack(null));
    }

    this.cameraEnabled = enabled;
    this.emit();
  }

  setSpeaker(enabled: boolean) {
    this.speakerEnabled = enabled;
    this.emit();
  }

  clearError() {
    this.error = null;
    this.emit();
  }

  private onInvite(id: string, name: string, video: boolean) {
    if (this.peers.size || this.incoming || this.outgoing) {
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

    if (!(await this.openMedia(call.video))) {
      this.send("call_end", { to: id });
      this.emit();
      return;
    }

    this.createPeer(id, call.name);
    this.emit();
  }

  private cancelOutgoing() {
    this.clearRing();
    stopSound("ring");
    this.outgoing = null;
    this.emit();
  }

  private createPeer(id: string, name: string) {
    if (this.peers.has(id)) return;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: PeerEntry = {
      id,
      name,
      pc,
      stream: new MediaStream(),
      polite: this.selfId < id,
      makingOffer: false,
      ignoreOffer: false,
      connected: false,
    };
    this.peers.set(id, peer);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.send("call_signal", {
          to: id,
          signal: { candidate: candidate.toJSON() },
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        this.send("call_signal", { to: id, signal: { sdp: pc.localDescription! } });
      } catch {
        this.error = "Connection failed";
        this.emit();
      } finally {
        peer.makingOffer = false;
      }
    };

    pc.ontrack = ({ track }) => {
      peer.stream.addTrack(track);
      track.onended = () => {
        peer.stream.removeTrack(track);
        this.emit();
      };
      this.emit();
    };

    pc.onconnectionstatechange = () => {
      const connected = pc.connectionState === "connected";
      if (connected && !peer.connected) playSound("connect");
      peer.connected = connected;
      if (pc.connectionState === "failed") pc.restartIce();
      this.emit();
    };

    this.local?.getTracks().forEach((track) => {
      const sender = pc.addTrack(track, this.local!);
      if (track.kind === "video") peer.videoSender = sender;
    });
  }

  private async onSignal(from: string, signal: Signal) {
    const peer = this.peers.get(from);
    if (!peer || !signal) return;
    const { pc } = peer;

    try {
      if (signal.sdp) {
        const collision =
          signal.sdp.type === "offer" &&
          (peer.makingOffer || pc.signalingState !== "stable");

        peer.ignoreOffer = !peer.polite && collision;
        if (peer.ignoreOffer) return;

        await pc.setRemoteDescription(signal.sdp);
        if (signal.sdp.type === "offer") {
          await pc.setLocalDescription();
          this.send("call_signal", {
            to: from,
            signal: { sdp: pc.localDescription! },
          });
        }
      } else if (signal.candidate) {
        try {
          await pc.addIceCandidate(signal.candidate);
        } catch (err) {
          if (!peer.ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.error("Signal handling failed:", err);
    }
  }

  private closePeer(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;

    peer.pc.onicecandidate = null;
    peer.pc.onnegotiationneeded = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.getSenders().forEach((sender) => sender.replaceTrack(null));
    peer.pc.close();
    peer.stream.getTracks().forEach((track) => track.stop());
    this.peers.delete(id);
    playSound("end");

    if (!this.peers.size) this.releaseMedia();
  }

  private async openMedia(video: boolean): Promise<boolean> {
    if (this.local) return video ? this.addCamera() : true;

    if (!navigator.mediaDevices?.getUserMedia) {
      this.error = "This browser cannot access media devices";
      return false;
    }

    try {
      const devices = savedDevices();
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { ...AUDIO_CONSTRAINTS, deviceId: deviceId(devices.audio) },
        video: video && videoConstraints(devices.video),
      });
      this.micEnabled = true;
      this.cameraEnabled = video;
      this.error = null;
      return true;
    } catch {
      this.error = "Camera or microphone unavailable";
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
      const track = stream.getVideoTracks()[0];
      this.local.addTrack(track);
      this.peers.forEach((peer) => {
        if (peer.videoSender) peer.videoSender.replaceTrack(track);
        else peer.videoSender = peer.pc.addTrack(track, this.local!);
      });
      this.error = null;
      return true;
    } catch {
      this.error = "Camera unavailable";
      return false;
    }
  }

  private releaseMedia() {
    this.local?.getTracks().forEach((track) => track.stop());
    this.local = null;
    this.micEnabled = true;
    this.cameraEnabled = true;
  }

  private ring(onTimeout: () => void) {
    this.clearRing();
    this.ringTimer = setTimeout(onTimeout, RING_TIMEOUT);
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
      peers: [...this.peers.values()].map(({ id, name, stream, connected }) => ({
        id,
        name,
        stream,
        connected,
      })),
      localStream: this.local,
      micEnabled: this.micEnabled,
      cameraEnabled: this.cameraEnabled,
      speakerEnabled: this.speakerEnabled,
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
