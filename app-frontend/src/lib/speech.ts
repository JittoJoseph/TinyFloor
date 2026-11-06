/**
 * Whether a microphone carries someone talking, from its loudness read every
 * few tens of milliseconds. Three things a single loudness bar gets wrong:
 *
 * - A room has its own level (a fan, a busy café), and microphones differ, so
 *   loud means loud *for this room*: louder than the room's quiet by a margin.
 *   The room's quiet is followed as it goes, quickly down and slowly up, so
 *   a pause shows it again and a voice doesn't become it.
 * - A key tap or a cup set down is as loud as a voice, for a moment. Such a
 *   window is one spike in quiet, its peak far above its average (a crest
 *   over 19 dB, where speech stays under 16), and doesn't count. And talking
 *   is sustained, so it starts only once most of the last fraction of a
 *   second was loud (a score that rises while loud and falls while quiet),
 *   and 300 ms of the last 600 were: a dog's bark or a cough, as loud as a
 *   voice and just as smooth, is over sooner, and a voice dipping between
 *   syllables over a fan still adds up.
 * - Speech has gaps between words. Once talking, it lasts until it has been
 *   quiet for a while.
 *
 * The levels are RMS, in dB below full scale: the average energy of a short
 * window, not its single loudest sample, which a click sets.
 */

/** Quieter than this is never talking, however quiet the room. */
const FLOOR_DB = -55;
/** How far above the room's quiet a voice is. */
const MARGIN_DB = 12;
/** The room's quiet follows a quieter reading this quickly (share per second)... */
const FALL_PER_S = 8;
/** ...and a louder one this slowly (dB per second), so a fan switched on becomes the room in about ten seconds. */
const RISE_DB_PER_S = 1.5;
/** The loudness score's time constant, and where it starts and ends talking (share of recent time that was loud). */
const SCORE_MS = 160;
const START_AT = 0.6;
const QUIET_AT = 0.25;
/** Loud this long within twice as long before talking starts. A bark is about 250 ms. */
const ONSET_MS = 300;
/** A window whose peak is this far above its RMS is a click, not a voice (measured: speech 11 to 16 dB, key taps about 22). */
const CLICK_CREST_DB = 19;

export interface SpeechTimings {
  /** Talking stops after this long quiet. */
  stopAfterMs: number;
  /** Loud this long, within twice as long, before talking starts (300 ms when not given). */
  onsetMs?: number;
}

export class SpeechDetector {
  private floor = -60;
  private score = 0;
  private talking = false;
  private quietSince: number | null = null;
  /** Recent readings that were loud, and for how long each: what ONSET_MS adds up. */
  private recent: { at: number; ms: number }[] = [];
  private last: number | null = null;
  private readonly timings: SpeechTimings;

  constructor(timings: SpeechTimings) {
    this.timings = timings;
  }

  /** One reading at `now` (ms): its level and crest (levelOf). Returns whether someone is talking. */
  push({ db, crest }: Level, now: number): boolean {
    const dt = this.last === null ? 0.05 : Math.min(0.5, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    const level = Number.isFinite(db) ? db : -100;

    const loud = level > Math.max(this.floor + MARGIN_DB, FLOOR_DB) && crest < CLICK_CREST_DB;
    if (level < this.floor) this.floor += (level - this.floor) * Math.min(1, FALL_PER_S * dt);
    else this.floor = Math.min(level, this.floor + RISE_DB_PER_S * dt);

    const k = Math.min(1, (dt * 1000) / SCORE_MS);
    this.score += ((loud ? 1 : 0) - this.score) * k;
    if (loud) this.recent.push({ at: now, ms: dt * 1000 });
    const onset = this.timings.onsetMs ?? ONSET_MS;
    while (this.recent.length && this.recent[0].at <= now - 2 * onset) this.recent.shift();

    if (!this.talking) {
      const loudMs = this.recent.reduce((sum, reading) => sum + reading.ms, 0);
      if (this.score >= START_AT && loudMs >= onset) {
        this.talking = true;
        this.quietSince = null;
      }
    } else if (this.score <= QUIET_AT) {
      this.quietSince ??= now;
      if (now - this.quietSince >= this.timings.stopAfterMs) this.talking = false;
    } else {
      this.quietSince = null;
    }
    return this.talking;
  }

  /** Forgets the room, for a new microphone. */
  reset() {
    this.floor = -60;
    this.score = 0;
    this.talking = false;
    this.quietSince = null;
    this.recent = [];
    this.last = null;
  }
}

export interface Level {
  /** The window's RMS, in dB below full scale. */
  db: number;
  /** How far its peak is above its RMS, in dB. */
  crest: number;
}

/** The level of a window of samples (−1 to 1). */
export function levelOf(samples: Float32Array): Level {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  const rms = Math.sqrt(sum / Math.max(1, samples.length));
  return { db: 20 * Math.log10(rms + 1e-9), crest: 20 * Math.log10((peak + 1e-9) / (rms + 1e-9)) };
}
