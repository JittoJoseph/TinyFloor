import type { MediaFlags, MediaKind, SfuClientMessage, SfuServerMessage, VideoKind, VideoQuality } from "@shared/messages";
import { simulcastEncodings } from "./media";

export interface MeetingPeer {
  id: string;
  name: string;
  stream: MediaStream;
  screenStream: MediaStream | null;
  connected: boolean;
  mic: boolean;
  camera: boolean;
  screen: boolean;
}

interface PeerMedia extends MeetingPeer {
  /** What they publish, as announced by the room. */
  published: Set<MediaKind>;
  /** Our receiving transceivers for their tracks, by kind. */
  mids: Partial<Record<MediaKind, string>>;
  tracks: Partial<Record<MediaKind, MediaStreamTrack>>;
  /** The quality we asked for, per video kind. */
  quality: Partial<Record<VideoKind, VideoQuality>>;
}

type Waiter = { op: "published" | "offer"; resolve: (message: SfuServerMessage) => void; reject: (error: Error) => void };

const RESPONSE_TIMEOUT_MS = 15_000;

/**
 * Meeting-table media through Cloudflare's SFU, brokered by the room. One peer
 * connection sends our mic, and our camera and screen in both qualities, and
 * receives everyone else's. Negotiation steps run one at a time.
 */
export class SfuMeeting {
  private readonly pc: RTCPeerConnection;
  private readonly peers = new Map<string, PeerMedia>();
  private readonly byMid = new Map<string, { userId: string; kind: MediaKind }>();
  private mic?: RTCRtpTransceiver;
  private camera?: RTCRtpTransceiver;
  private screen?: RTCRtpTransceiver;
  private chain: Promise<unknown> = Promise.resolve();
  private waiter: Waiter | null = null;
  /** What each card can show; set by the call cards through CallManager. */
  private wanted: (userId: string, kind: VideoKind) => VideoQuality = () => "low";
  private closed = false;

  constructor(
    private readonly send: (message: SfuClientMessage) => void,
    private readonly changed: () => void,
    iceServers: RTCIceServer[],
  ) {
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    this.pc.ontrack = ({ track, transceiver }) => this.receive(track, transceiver.mid);
    this.pc.onconnectionstatechange = () => {
      const connected = this.pc.connectionState === "connected";
      this.peers.forEach((peer) => (peer.connected = connected && peer.published.size > 0));
      this.changed();
    };
  }

  get peerList(): MeetingPeer[] {
    return [...this.peers.values()].map(({ id, name, stream, screenStream, connected, mic, camera, screen }) => ({
      id,
      name,
      stream,
      screenStream,
      connected,
      mic,
      camera,
      screen,
    }));
  }

  /**
   * Publishes our mic and camera slots, even if either is off for now. Called
   * once media has opened; watching the others can start before that.
   */
  publishLocal(local: MediaStream | null, flags: MediaFlags) {
    if (this.mic) return;
    this.mic = this.pc.addTransceiver(local?.getAudioTracks()[0] ?? "audio", { direction: "sendonly" });
    this.camera = this.pc.addTransceiver(local?.getVideoTracks()[0] ?? "video", {
      direction: "sendonly",
      sendEncodings: simulcastEncodings("camera"),
    });
    this.publish([
      { transceiver: this.mic, kind: "mic" },
      { transceiver: this.camera, kind: "camera" },
    ]);
    this.send({ op: "media", ...flags });
  }

  addMember(id: string, name = "Someone") {
    if (this.peers.has(id)) return;
    this.peers.set(id, {
      id,
      name,
      stream: new MediaStream(),
      screenStream: null,
      connected: false,
      mic: false,
      camera: false,
      screen: false,
      published: new Set(),
      mids: {},
      tracks: {},
      quality: {},
    });
    this.changed();
  }

  removeMember(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const mids = Object.values(peer.mids).filter(Boolean) as string[];
    if (mids.length) this.send({ op: "unsubscribe", mids });
    mids.forEach((mid) => this.byMid.delete(mid));
    this.peers.delete(id);
    this.changed();
  }

  handle(message: SfuServerMessage) {
    if (this.closed) return;
    switch (message.op) {
      case "published":
      case "offer":
        if (this.waiter?.op === message.op) {
          const waiter = this.waiter;
          this.waiter = null;
          waiter.resolve(message);
        } else if (message.op === "offer" && message.sdp) {
          // The SFU asked to renegotiate on its own (after a layer change).
          this.enqueue(() => this.answer(message.sdp));
        }
        break;
      case "error":
        if (this.waiter) {
          const waiter = this.waiter;
          this.waiter = null;
          waiter.reject(new Error(message.code));
        }
        break;
      case "tracks": {
        const peer = this.peers.get(message.userId);
        if (!peer) return;
        const fresh = message.kinds.filter((kind) => !peer.published.has(kind) || !peer.mids[kind]);
        message.kinds.forEach((kind) => peer.published.add(kind));
        if (fresh.length) this.subscribe(peer, fresh);
        break;
      }
      case "untracks": {
        const peer = this.peers.get(message.userId);
        if (!peer) return;
        const mids: string[] = [];
        message.kinds.forEach((kind) => {
          peer.published.delete(kind);
          const mid = peer.mids[kind];
          if (mid) mids.push(mid);
          delete peer.mids[kind];
          delete peer.tracks[kind];
        });
        if (mids.length) this.send({ op: "unsubscribe", mids });
        this.rebuild(peer);
        break;
      }
      case "media": {
        const peer = this.peers.get(message.userId);
        if (!peer) return;
        peer.mic = message.mic;
        peer.camera = message.camera;
        peer.screen = message.screen;
        this.changed();
        break;
      }
      case "gone":
        this.removeMember(message.userId);
        break;
    }
  }

  /** Mic or camera switched on or off: swap what's in the slot, no renegotiation. */
  updateLocal(local: MediaStream | null, flags: MediaFlags) {
    void this.mic?.sender.replaceTrack(local?.getAudioTracks()[0] ?? null).catch(() => {});
    void this.camera?.sender.replaceTrack(local?.getVideoTracks()[0] ?? null).catch(() => {});
    this.send({ op: "media", ...flags });
  }

  /** Starting a screen share publishes it as a new track; stopping it closes the track. */
  setScreen(stream: MediaStream | null) {
    const track = stream?.getVideoTracks()[0];
    if (track && !this.screen) {
      this.screen = this.pc.addTransceiver(track, { direction: "sendonly", sendEncodings: simulcastEncodings("screen") });
      this.publish([{ transceiver: this.screen, kind: "screen" }]);
    } else if (!track && this.screen) {
      void this.screen.sender.replaceTrack(null).catch(() => {});
      this.screen = undefined;
      this.send({ op: "unpublish", kinds: ["screen"] });
    }
  }

  /** Asks the SFU for the quality each card can show, when it changes. */
  setQuality(wanted: (userId: string, kind: VideoKind) => VideoQuality) {
    this.wanted = wanted;
    this.peers.forEach((peer) => {
      (["camera", "screen"] as const).forEach((kind) => {
        const mid = peer.mids[kind];
        const quality = wanted(peer.id, kind);
        if (!mid || peer.quality[kind] === quality) return;
        peer.quality[kind] = quality;
        this.send({ op: "quality", userId: peer.id, kind, mid, quality });
      });
    });
  }

  close() {
    this.closed = true;
    this.waiter?.reject(new Error("closed"));
    this.waiter = null;
    this.pc.close();
    this.peers.clear();
  }

  private publish(slots: { transceiver: RTCRtpTransceiver; kind: MediaKind }[]) {
    this.enqueue(async () => {
      await this.pc.setLocalDescription(await this.pc.createOffer());
      const published = this.wait("published");
      this.send({
        op: "publish",
        sdp: this.pc.localDescription!.sdp,
        tracks: slots.map(({ transceiver, kind }) => ({ mid: transceiver.mid!, kind })),
      });
      const answer = await published;
      if (answer.op === "published") await this.pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
    });
  }

  private subscribe(peer: PeerMedia, kinds: MediaKind[]) {
    this.enqueue(async () => {
      if (!this.peers.has(peer.id)) return;
      const offered = this.wait("offer");
      this.send({
        op: "subscribe",
        tracks: kinds.map((kind) => ({
          userId: peer.id,
          kind,
          ...(kind === "mic" ? {} : { quality: (peer.quality[kind] = this.wanted(peer.id, kind)) }),
        })),
      });
      const offer = await offered;
      if (offer.op !== "offer") return;
      offer.tracks.forEach(({ userId, kind, mid }) => {
        if (!mid) return;
        this.byMid.set(mid, { userId, kind });
        const target = this.peers.get(userId);
        if (target) target.mids[kind] = mid;
      });
      if (offer.sdp) await this.answer(offer.sdp);
    });
  }

  private async answer(sdp: string) {
    await this.pc.setRemoteDescription({ type: "offer", sdp });
    await this.pc.setLocalDescription(await this.pc.createAnswer());
    this.send({ op: "answer", sdp: this.pc.localDescription!.sdp });
  }

  private receive(track: MediaStreamTrack, mid: string | null) {
    const owner = mid ? this.byMid.get(mid) : undefined;
    const peer = owner && this.peers.get(owner.userId);
    if (!owner || !peer) return;
    peer.tracks[owner.kind] = track;
    peer.connected = true;
    this.rebuild(peer);
  }

  /** New stream objects, so the video and audio elements pick up the change. */
  private rebuild(peer: PeerMedia) {
    peer.stream = new MediaStream([peer.tracks.mic, peer.tracks.camera].filter(Boolean) as MediaStreamTrack[]);
    peer.screenStream = peer.tracks.screen ? new MediaStream([peer.tracks.screen]) : null;
    this.changed();
  }

  private enqueue(task: () => Promise<void>) {
    this.chain = this.chain
      .then(() => (this.closed ? undefined : task()))
      .catch((error) => {
        if (!this.closed) console.warn("Meeting media step failed", error);
      });
  }

  private wait(op: Waiter["op"]): Promise<SfuServerMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.waiter?.resolve === done) this.waiter = null;
        reject(new Error(`no ${op} from the room`));
      }, RESPONSE_TIMEOUT_MS);
      const done = (message: SfuServerMessage) => {
        clearTimeout(timer);
        resolve(message);
      };
      this.waiter = {
        op,
        resolve: done,
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
    });
  }
}
