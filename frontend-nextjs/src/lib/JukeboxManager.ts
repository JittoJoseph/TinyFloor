"use client";

import { WebSocketManager } from "./WebSocketManager";

export interface Track {
  title: string;
  src: string;
}

export const TRACKS: Track[] = [
  { title: "Heavenly Loop", src: "/music/heavenly-loop.ogg" },
  { title: "Ambient Relaxing", src: "/music/ambient-relaxing.ogg" },
  { title: "Slow Stride", src: "/music/slow-stride.ogg" },
];

export interface JukeboxSnapshot {
  open: boolean;
  playing: boolean;
  blocked: boolean;
  track: number;
  title: string;
  near: boolean;
}

const FULL_VOLUME_WITHIN = 150;
const SILENT_BEYOND = 620;
const MAX_VOLUME = 0.55;

const EMPTY: JukeboxSnapshot = {
  open: false,
  playing: false,
  blocked: false,
  track: 0,
  title: TRACKS[0].title,
  near: false,
};

type Listener = () => void;

/**
 * The room's speaker. The server owns which track and when it started, so
 * everyone is at the same point in the same loop, and how loud it is depends on
 * where you are standing.
 */
class JukeboxManager {
  private ws?: WebSocketManager;
  private audio?: HTMLAudioElement;
  private listeners = new Set<Listener>();
  private snapshot: JukeboxSnapshot = EMPTY;

  private track = 0;
  private playing = false;
  private open = false;
  private near = false;
  private blocked = false;
  private distance = Infinity;

  attach(ws: WebSocketManager) {
    this.ws = ws;
    ws.send("music_sync", {});
  }

  detach() {
    this.audio?.pause();
    this.audio = undefined;
    this.ws = undefined;
    this.playing = false;
    this.open = false;
    this.near = false;
    this.blocked = false;
    this.distance = Infinity;
    this.emit();
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => EMPTY;

  setOpen(open: boolean) {
    if (this.open === open) return;
    this.open = open;
    this.emit();
  }

  handleMessage(type: string, data: Record<string, unknown>) {
    if (type !== "music_state") return;

    const track = Number(data.track) || 0;
    const playing = Boolean(data.playing);
    const startedAt = Number(data.startedAt) || Date.now();
    const offset = Number(data.offset) || 0;

    const changed = track !== this.track;
    this.track = Math.min(Math.max(track, 0), TRACKS.length - 1);
    this.playing = playing;

    if (playing) this.start((Date.now() - startedAt) / 1000 + offset, changed);
    else this.audio?.pause();

    this.emit();
  }

  toggle() {
    this.push({ playing: !this.playing, track: this.track });
  }

  skip(step: number) {
    const next = (this.track + step + TRACKS.length) % TRACKS.length;
    this.push({ playing: true, track: next });
  }

  select(track: number) {
    this.push({ playing: true, track });
  }

  /** Called from the scene as the player moves, to fade the speaker in and out. */
  setProximity(distance: number, near: boolean) {
    const moved = Math.abs(distance - this.distance) >= 4;
    if (moved) {
      this.distance = distance;
      this.applyVolume();
    }
    if (near === this.near) return;
    this.near = near;
    if (!near) this.open = false;
    this.emit();
  }

  private push(next: { playing: boolean; track: number }) {
    this.blocked = false;
    this.ws?.send("music_set", { ...next, offset: 0 });
  }

  private start(elapsed: number, restart: boolean) {
    const source = TRACKS[this.track];
    if (!source) return;

    if (!this.audio) {
      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.preload = "auto";
    }

    const wanted = new URL(source.src, window.location.origin).href;
    if (restart || this.audio.src !== wanted) this.audio.src = source.src;
    this.applyVolume();

    const seek = () => {
      const audio = this.audio;
      if (!audio) return;

      const length = audio.duration;
      if (length && Number.isFinite(length)) {
        const target = elapsed % length;
        if (Math.abs(audio.currentTime - target) > 1.5) audio.currentTime = target;
      }

      audio
        .play()
        .then(() => {
          if (!this.blocked) return;
          this.blocked = false;
          this.emit();
        })
        .catch(() => {
          this.blocked = true;
          this.emit();
        });
    };

    if (this.audio.readyState >= 1) seek();
    else this.audio.addEventListener("loadedmetadata", seek, { once: true });
  }

  private applyVolume() {
    if (!this.audio) return;
    const span = SILENT_BEYOND - FULL_VOLUME_WITHIN;
    const fade = 1 - (this.distance - FULL_VOLUME_WITHIN) / span;
    this.audio.volume = Math.min(Math.max(fade, 0), 1) * MAX_VOLUME;
  }

  private emit() {
    this.snapshot = {
      open: this.open && this.near,
      playing: this.playing,
      blocked: this.blocked,
      track: this.track,
      title: TRACKS[this.track]?.title ?? "",
      near: this.near,
    };
    this.listeners.forEach((listener) => listener());
  }
}

export const jukebox = new JukeboxManager();
