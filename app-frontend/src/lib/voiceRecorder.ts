"use client";

import { VOICE_MAX_SECONDS, VOICE_PEAKS } from "@shared/chat";
import { deviceConstraint, savedDevices } from "@/lib/media";

/*
 * Recording a voice message in chat (docs/product.md): the microphone you
 * chose for calls, cleaned up the way calls are, into the compact format the
 * browser records best (Opus in WebM, or AAC in MP4 on Safari). While it
 * records, how loud it is goes out a few times a second, for the moving
 * waveform; when it stops, the same readings are boiled down to VOICE_PEAKS
 * bars that travel with the message, so it draws its waveform before a byte
 * of sound has loaded. It stops by itself at VOICE_MAX_SECONDS.
 */

/** How often the level is read, in milliseconds. */
const TICK = 60;
const TYPES = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

export interface VoiceTake {
  blob: Blob;
  /** The bare media type, without codecs: what the file is stored as. */
  type: string;
  extension: string;
  /** Seconds. */
  duration: number;
  /** VOICE_PEAKS numbers from 0 to 100. */
  peaks: number[];
}

export type RecorderProblem = "denied" | "no_mic" | "unsupported" | "failed";

/** Whether this browser can record at all. */
export function canRecord(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private context: AudioContext | null = null;
  private timer = 0;
  private chunks: Blob[] = [];
  private levels: number[] = [];
  private startedAt = 0;
  private done: ((take: VoiceTake | null) => void) | null = null;

  /**
   * @param onLevel how loud it is now, from 0 to 1, with the seconds so far
   * @param onLimit called when it stops on its own at the longest a message can be
   */
  constructor(
    private readonly onLevel: (level: number, seconds: number) => void,
    private readonly onLimit: () => void,
  ) {}

  async start(): Promise<void> {
    if (!canRecord()) throw new RecorderFailure("unsupported");
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, deviceId: deviceConstraint(savedDevices().audio) },
      });
    } catch (error) {
      const name = (error as DOMException)?.name;
      // A chosen microphone that's gone: try whichever there is.
      if (name === "OverconstrainedError") {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      }
      if (!this.stream) throw new RecorderFailure(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "no_mic" : "failed");
    }

    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    try {
      this.recorder = new MediaRecorder(this.stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32_000 });
    } catch {
      this.release();
      throw new RecorderFailure("unsupported");
    }
    this.recorder.ondataavailable = (event) => event.data.size && this.chunks.push(event.data);
    this.recorder.onstop = () => this.finish();

    // The level, from the same sound the recording takes.
    this.context = new AudioContext();
    const analyser = this.context.createAnalyser();
    analyser.fftSize = 1024;
    this.context.createMediaStreamSource(this.stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    this.startedAt = performance.now();
    this.recorder.start(1000);
    this.timer = window.setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) sum += sample * sample;
      // Speech sits low on a linear scale; a square root spreads it over the bar's height.
      const level = Math.min(1, Math.sqrt(Math.sqrt(sum / samples.length)) * 1.6);
      this.levels.push(level);
      const seconds = (performance.now() - this.startedAt) / 1000;
      this.onLevel(level, seconds);
      if (seconds >= VOICE_MAX_SECONDS) this.onLimit();
    }, TICK);
  }

  /** Stops and hands back what was said; nothing if it was too short to be a message. */
  stop(): Promise<VoiceTake | null> {
    return new Promise((resolve) => {
      if (!this.recorder || this.recorder.state === "inactive") return resolve(null);
      this.done = resolve;
      this.recorder.stop();
    });
  }

  /** Throws it away. */
  cancel(): void {
    this.done = null;
    if (this.recorder && this.recorder.state !== "inactive") this.recorder.stop();
    this.release();
  }

  private finish() {
    const duration = (performance.now() - this.startedAt) / 1000;
    const type = (this.recorder?.mimeType || "audio/webm").split(";")[0];
    const blob = new Blob(this.chunks, { type });
    const levels = this.levels;
    this.release();
    const done = this.done;
    this.done = null;
    if (!done) return;
    if (duration < 0.6 || !blob.size) return done(null);
    done({
      blob,
      type,
      extension: type === "audio/mp4" ? "m4a" : type === "audio/ogg" ? "ogg" : "webm",
      duration: Math.min(Math.round(duration * 10) / 10, VOICE_MAX_SECONDS),
      peaks: peaksOf(levels),
    });
  }

  private release() {
    window.clearInterval(this.timer);
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close().catch(() => {});
    this.stream = null;
    this.context = null;
    this.recorder = null;
    this.chunks = [];
    this.levels = [];
  }
}

export class RecorderFailure extends Error {
  constructor(readonly code: RecorderProblem) {
    super(code);
  }
}

/** The readings as VOICE_PEAKS bars: each stretch's average, scaled so the loudest bar is full. */
export function peaksOf(levels: number[]): number[] {
  if (!levels.length) return Array(VOICE_PEAKS).fill(0);
  const bars: number[] = [];
  for (let i = 0; i < VOICE_PEAKS; i++) {
    const from = Math.floor((i * levels.length) / VOICE_PEAKS);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / VOICE_PEAKS));
    const stretch = levels.slice(from, to);
    bars.push(stretch.reduce((sum, level) => sum + level, 0) / stretch.length);
  }
  const top = Math.max(...bars, 0.05);
  return bars.map((bar) => Math.round((bar / top) * 100));
}
