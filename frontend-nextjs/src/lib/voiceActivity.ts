/** How often the microphone's level is read. */
const SAMPLE_EVERY_MS = 100;
/** Loud enough to be a voice, on a 0 to 128 scale of the waveform's peak. */
const LOUD = 14;
/** Talking counts from this long above it... */
const START_AFTER_MS = 200;
/** ...and stops after this long below it, so pauses between words don't flicker. */
const STOP_AFTER_MS = 1500;

let context: AudioContext | null = null;

/**
 * Whether you are talking, from your own microphone, so a meeting can show who
 * speaks and put their video forward. Only the change is reported, and only
 * after it has held a moment: a few messages a minute, not a stream of levels.
 */
export class VoiceActivity {
  private source: MediaStreamAudioSourceNode | null = null;
  private timer?: ReturnType<typeof setInterval>;
  private talking = false;
  private since = 0;

  constructor(private readonly report: (talking: boolean) => void) {}

  /** Listens to this track, or stops listening (and reports silence) when there is none. */
  listen(track: MediaStreamTrack | null) {
    if (track && this.source?.mediaStream.getAudioTracks()[0] === track) return;
    this.stop();
    if (!track || typeof AudioContext === "undefined") return;

    context ??= new AudioContext();
    context.resume().catch(() => {});
    this.source = context.createMediaStreamSource(new MediaStream([track]));
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    this.source.connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);

    this.timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128));
      const loud = peak > LOUD && track.enabled;
      const now = performance.now();
      if (loud === this.talking) {
        this.since = now;
        return;
      }
      if (now - this.since >= (loud ? START_AFTER_MS : STOP_AFTER_MS)) {
        this.talking = loud;
        this.since = now;
        this.report(loud);
      }
    }, SAMPLE_EVERY_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.source?.disconnect();
    this.source = null;
    if (this.talking) {
      this.talking = false;
      this.report(false);
    }
  }
}
