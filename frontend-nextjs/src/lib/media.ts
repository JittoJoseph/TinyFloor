import type { VideoKind, VideoQuality } from "@shared/messages";

/**
 * Everything about video quality lives here: what we capture, the two qualities
 * we send, and who gets which. Only an enlarged card on a screen big enough to
 * show the detail asks for the high one; small cards and phones take the low
 * one, which is a fraction of the data.
 */
const PROFILES: Record<VideoKind, Record<VideoQuality, RTCRtpEncodingParameters>> = {
  camera: {
    high: { maxBitrate: 900_000 },
    low: { maxBitrate: 150_000, scaleResolutionDownBy: 4, maxFramerate: 20 },
  },
  screen: {
    high: { maxBitrate: 1_200_000, maxFramerate: 10 },
    low: { maxBitrate: 150_000, scaleResolutionDownBy: 4, maxFramerate: 5 },
  },
};

/** 720p, the most any card shows, and an easy size for a laptop to encode. */
export const CAMERA_CAPTURE: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: "user",
};

export const SCREEN_CAPTURE: MediaTrackConstraints = {
  width: { max: 1280 },
  height: { max: 720 },
  frameRate: { ideal: 10, max: 15 },
};

/** Both qualities at once for the SFU, which forwards only the one each viewer asked for. */
export function simulcastEncodings(kind: VideoKind): RTCRtpEncodingParameters[] {
  return [
    { rid: "h", ...PROFILES[kind].high },
    { rid: "l", ...PROFILES[kind].low },
  ];
}

/** Peer to peer there is no SFU to choose, so the sender turns its own video down. */
export function sendAtQuality(sender: RTCRtpSender, kind: VideoKind, quality: VideoQuality) {
  if (!sender.track) return;
  const wanted = PROFILES[kind][quality];
  const parameters = sender.getParameters();
  const encoding = (parameters.encodings ??= [{}])[0];
  if (
    encoding.maxBitrate === wanted.maxBitrate &&
    (encoding.scaleResolutionDownBy ?? 1) === (wanted.scaleResolutionDownBy ?? 1) &&
    encoding.maxFramerate === wanted.maxFramerate
  ) {
    return;
  }
  Object.assign(encoding, { scaleResolutionDownBy: 1, maxFramerate: undefined }, wanted);
  sender.setParameters(parameters).catch(() => {});
}

/** On a phone even the enlarged card is small, so nothing there needs the high quality. */
export function screenTooSmallForDetail(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

const DEVICES_KEY = "tinyfloorDevices";

export interface DevicePreferences {
  audio?: string;
  video?: string;
}

/** The microphone and camera someone picked in settings. */
export function savedDevices(): DevicePreferences {
  try {
    return JSON.parse(localStorage.getItem(DEVICES_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function saveDevices(devices: DevicePreferences) {
  try {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  } catch {}
}

export function deviceConstraint(id?: string) {
  return id ? { exact: id } : undefined;
}
