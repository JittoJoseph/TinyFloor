import type { MediaFlags, MediaKind, SfuClientMessage, SfuServerMessage, VideoKind, VideoQuality } from "@shared/messages";
import { simulcastEncodings } from "./media";

export interface MeetingPeer {
  id: string;
  name: string;
  /** Their voice. Everyone's is received: audio is cheap, and muted mics send nothing. */
  audio: MediaStream | null;
  /** Their camera, only while we are receiving it (see `want`). */
  camera: MediaStream | null;
  screenStream: MediaStream | null;
  connected: boolean;
  /** What they have on, as they announce it. */
  mic: boolean;
  cameraOn: boolean;
  screen: boolean;
}

/** One video we want to receive, and how sharp. */
export interface VideoWant {
  userId: string;
  kind: VideoKind;
  quality: VideoQuality;
}

interface PeerMedia extends MeetingPeer {
  /** What they publish, as announced by the room. */
  published: Set<MediaKind>;
  /** Our receiving transceivers for their tracks, by kind. */
  mids: Partial<Record<MediaKind, string>>;
  tracks: Partial<Record<MediaKind, MediaStreamTrack>>;
  /** The quality we asked for, per video kind we receive. */
  quality: Partial<Record<VideoKind, VideoQuality>>;
  /** Asked for and not answered yet, so it isn't asked for twice. */
  pending: Set<MediaKind>;
}

type Waiter = { op: "published" | "offer"; resolve: (message: SfuServerMessage) => void; reject: (error: Error) => void };

const RESPONSE_TIMEOUT_MS = 15_000;

/**
 * A meeting's media through Cloudflare's SFU, brokered by the room. One peer
 * connection sends our mic, our camera in three qualities and a shared screen,
 * and receives the others. Egress is the bill, so:
 *
 * - everyone's mic is received, and only the video the stage shows (`want`);
 * - nothing is sent while we are alone, or while our mic is muted;
 * - the SFU forwards each viewer only the quality its tile needs.
 *
 * Negotiation steps run one at a time.
 */
export class SfuMeeting {
  private readonly pc: RTCPeerConnection;
  private readonly peers = new Map<string, PeerMedia>();
  private readonly byMid = new Map<string, { userId: string; kind: MediaKind }>();
  private mic?: RTCRtpTransceiver;
  private camera?: RTCRtpTransceiver;
  private screen?: RTCRtpTransceiver;
  private local: MediaStream | null = null;
  private flags: MediaFlags = { mic: false, camera: false, screen: false };
  private wanted: VideoWant[] = [];
  /** Past the meeting hours: no video either way, voices only (docs/14). */
  private videoPaused = false;
  private chain: Promise<unknown> = Promise.resolve();
  private waiter: Waiter | null = null;
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
    return [...this.peers.values()].map(({ id, name, audio, camera, screenStream, connected, mic, cameraOn, screen }) => ({
      id,
      name,
      audio,
      camera,
      screenStream,
      connected,
      mic,
      cameraOn,
      screen,
    }));
  }

  /** Whether anyone else is in the meeting: until someone is, nothing is worth sending. */
  get alone(): boolean {
    return this.peers.size === 0;
  }

  /**
   * Opens our mic and camera slots, empty until there is someone to hear and
   * see them. Called once media has opened; receiving can start before that.
   */
  publishLocal(local: MediaStream | null, flags: MediaFlags) {
    if (this.mic) return;
    this.local = local;
    this.flags = flags;
    this.mic = this.pc.addTransceiver("audio", { direction: "sendonly" });
    this.camera = this.pc.addTransceiver("video", { direction: "sendonly", sendEncodings: simulcastEncodings("camera") });
    this.publish([
      { transceiver: this.mic, kind: "mic" },
      { transceiver: this.camera, kind: "camera" },
    ]);
    this.fillSlots();
    this.send({ op: "media", ...flags });
  }

  addMember(id: string, name = "Someone") {
    if (this.peers.has(id)) return;
    this.peers.set(id, {
      id,
      name,
      audio: null,
      camera: null,
      screenStream: null,
      connected: false,
      mic: false,
      cameraOn: false,
      screen: false,
      published: new Set(),
      mids: {},
      tracks: {},
      quality: {},
      pending: new Set(),
    });
    this.fillSlots();
    this.changed();
  }

  removeMember(id: string) {
    const peer = this.peers.get(id);
    if (!peer) return;
    const mids = Object.values(peer.mids).filter(Boolean) as string[];
    if (mids.length) this.send({ op: "unsubscribe", mids });
    mids.forEach((mid) => this.byMid.delete(mid));
    this.peers.delete(id);
    this.fillSlots();
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
        message.kinds.forEach((kind) => peer.published.add(kind));
        // Voices always; video only when the stage asks for it.
        if (message.kinds.includes("mic") && !peer.mids.mic && !peer.pending.has("mic")) this.subscribe([{ peer, kind: "mic" }]);
        this.reconcile();
        this.changed();
        break;
      }
      case "untracks": {
        const peer = this.peers.get(message.userId);
        if (!peer) return;
        const mids: string[] = [];
        message.kinds.forEach((kind) => {
          peer.published.delete(kind);
          const mid = peer.mids[kind];
          if (mid) {
            mids.push(mid);
            this.byMid.delete(mid);
          }
          delete peer.mids[kind];
          delete peer.tracks[kind];
          if (kind !== "mic") delete peer.quality[kind];
        });
        if (mids.length) this.send({ op: "unsubscribe", mids });
        this.rebuild(peer);
        break;
      }
      case "media": {
        const peer = this.peers.get(message.userId);
        if (!peer) return;
        peer.mic = message.mic;
        peer.cameraOn = message.camera;
        peer.screen = message.screen;
        this.changed();
        break;
      }
      case "gone":
        this.removeMember(message.userId);
        break;
    }
  }

  /** Mic or camera switched on or off, or the local stream changed: what fills the slots follows. */
  updateLocal(local: MediaStream | null, flags: MediaFlags) {
    this.local = local;
    this.flags = flags;
    this.fillSlots();
    this.send({ op: "media", ...flags });
  }

  /**
   * The slots carry our voice and camera only when someone else is here to
   * receive them, and the mic only while it is on: an empty slot sends nothing
   * at all, where a muted track would still send silence.
   */
  private fillSlots() {
    if (!this.mic || !this.camera) return;
    const company = !this.alone;
    const voice = company && this.flags.mic ? (this.local?.getAudioTracks()[0] ?? null) : null;
    const face = company && this.flags.camera && !this.videoPaused ? (this.local?.getVideoTracks()[0] ?? null) : null;
    if (this.mic.sender.track !== voice) void this.mic.sender.replaceTrack(voice).catch(() => {});
    if (this.camera.sender.track !== face) void this.camera.sender.replaceTrack(face).catch(() => {});
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

  /**
   * The video the stage shows, and how sharp: everything else is let go.
   * Letting go comes first, so the room's cap on video is never crossed on the way.
   */
  want(videos: VideoWant[]) {
    this.wanted = videos;
    this.reconcile();
  }

  /** The room paused video, or lifted the pause: our camera and everyone's video follow. */
  pauseVideo(paused: boolean) {
    if (this.videoPaused === paused) return;
    this.videoPaused = paused;
    this.fillSlots();
    this.reconcile();
  }

  private reconcile() {
    if (this.closed) return;
    const wanted = new Map((this.videoPaused ? [] : this.wanted).map((video) => [`${video.userId}:${video.kind}`, video]));

    const drop: string[] = [];
    for (const peer of this.peers.values()) {
      for (const kind of ["camera", "screen"] as const) {
        const mid = peer.mids[kind];
        if (!mid || wanted.has(`${peer.id}:${kind}`)) continue;
        drop.push(mid);
        this.byMid.delete(mid);
        delete peer.mids[kind];
        delete peer.tracks[kind];
        delete peer.quality[kind];
        this.rebuild(peer, false);
      }
    }
    if (drop.length) this.send({ op: "unsubscribe", mids: drop });

    const add: { peer: PeerMedia; kind: MediaKind; quality: VideoQuality }[] = [];
    for (const video of wanted.values()) {
      const peer = this.peers.get(video.userId);
      if (!peer || !peer.published.has(video.kind)) continue;
      const mid = peer.mids[video.kind];
      if (mid) {
        if (peer.quality[video.kind] !== video.quality) {
          peer.quality[video.kind] = video.quality;
          this.send({ op: "quality", userId: peer.id, kind: video.kind, mid, quality: video.quality });
        }
      } else if (!peer.pending.has(video.kind)) {
        add.push({ peer, kind: video.kind, quality: video.quality });
      }
    }
    if (add.length) this.subscribe(add);
    if (drop.length) this.changed();
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

  private subscribe(items: { peer: PeerMedia; kind: MediaKind; quality?: VideoQuality }[]) {
    items.forEach(({ peer, kind }) => peer.pending.add(kind));
    this.enqueue(async () => {
      const still = items.filter(({ peer }) => this.peers.has(peer.id));
      const clear = () => items.forEach(({ peer, kind }) => peer.pending.delete(kind));
      if (!still.length) return clear();
      const offered = this.wait("offer");
      this.send({
        op: "subscribe",
        tracks: still.map(({ peer, kind, quality }) => ({
          userId: peer.id,
          kind,
          ...(kind === "mic" ? {} : { quality: (peer.quality[kind as VideoKind] = quality ?? "low") }),
        })),
      });
      let offer: SfuServerMessage;
      try {
        offer = await offered;
      } finally {
        clear();
      }
      if (offer.op !== "offer") return;
      offer.tracks.forEach(({ userId, kind, mid }) => {
        if (!mid) return;
        this.byMid.set(mid, { userId, kind });
        const target = this.peers.get(userId);
        if (target) target.mids[kind] = mid;
      });
      if (offer.sdp) await this.answer(offer.sdp);
      // The stage may have moved on while this was being answered.
      this.reconcile();
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
  private rebuild(peer: PeerMedia, announce = true) {
    peer.audio = peer.tracks.mic ? new MediaStream([peer.tracks.mic]) : null;
    peer.camera = peer.tracks.camera ? new MediaStream([peer.tracks.camera]) : null;
    peer.screenStream = peer.tracks.screen ? new MediaStream([peer.tracks.screen]) : null;
    if (announce) this.changed();
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
