/**
 * How loud a stream is right now, for showing who talks. Every listener shares
 * one AudioContext, and it sleeps while nobody listens: a running context
 * keeps an audio thread busy for as long as the tab is open.
 */
let context: AudioContext | null = null;
let listening = 0;

export interface AudioLevel {
  /** The waveform's peak, 0 to 128. */
  peak(): number;
  stop(): void;
}

export function listenTo(stream: MediaStream): AudioLevel | null {
  if (typeof AudioContext === "undefined") return null;
  context ??= new AudioContext();
  listening++;
  context.resume().catch(() => {});
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  let stopped = false;

  return {
    peak() {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const value of samples) peak = Math.max(peak, Math.abs(value - 128));
      return peak;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      source.disconnect();
      if (--listening === 0) context?.suspend().catch(() => {});
    },
  };
}
