import { listenTo, type AudioLevel } from "./audioLevel";
import { SpeechDetector, type SpeechTimings } from "./speech";

/** How often the microphone's level is read. */
const SAMPLE_EVERY_MS = 50;
/** Talking stops after this long quiet, so pauses between words don't flicker. */
const STOP_AFTER_MS = 1500;

/**
 * Whether you are talking, from your own microphone (as sent, so after noise
 * removal), so a meeting can show who speaks and put their video forward
 * (SpeechDetector). Only the change is reported: a few messages a minute,
 * not a stream of levels.
 */
export class VoiceActivity {
  private level: AudioLevel | null = null;
  private track: MediaStreamTrack | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private talking = false;
  private readonly detector: SpeechDetector;

  constructor(
    private readonly report: (talking: boolean) => void,
    timings: SpeechTimings = { stopAfterMs: STOP_AFTER_MS },
  ) {
    this.detector = new SpeechDetector(timings);
  }

  /** Listens to this track, or stops listening (and reports silence) when there is none. */
  listen(track: MediaStreamTrack | null) {
    if (track && this.track === track) return;
    this.stop();
    const level = track && listenTo(new MediaStream([track]));
    if (!track || !level) return;
    this.track = track;
    this.level = level;
    this.detector.reset();

    this.timer = setInterval(() => {
      const talking = this.detector.push(level.level(), performance.now()) && track.enabled;
      if (talking === this.talking) return;
      this.talking = talking;
      this.report(talking);
    }, SAMPLE_EVERY_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.level?.stop();
    this.level = null;
    this.track = null;
    if (this.talking) {
      this.talking = false;
      this.report(false);
    }
  }
}
