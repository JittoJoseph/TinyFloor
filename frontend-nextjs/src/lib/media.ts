import type { VideoKind, VideoQuality } from "@shared/messages";

/**
 * Everything about video quality lives here: what we capture, the qualities we
 * send, and who gets which. Egress is the whole bill (docs/12-meetings.md), so
 * each viewer is sent only what its tile can show: 720p for a speaker filling
 * the stage, 360p for two or three side by side, 180p for small tiles, the
 * floor and phones.
 */
const PROFILES: Record<VideoKind, Record<VideoQuality, RTCRtpEncodingParameters>> = {
  camera: {
    high: { maxBitrate: 800_000, maxFramerate: 24 },
    medium: { maxBitrate: 300_000, scaleResolutionDownBy: 2, maxFramerate: 20 },
    low: { maxBitrate: 120_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
  },
  // A screen is text: few frames, full resolution when it is on the stage.
  screen: {
    high: { maxBitrate: 1_200_000, maxFramerate: 10 },
    medium: { maxBitrate: 1_200_000, maxFramerate: 10 },
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

/**
 * Every quality at once for the SFU, which forwards only the one each viewer
 * asked for. Sending to the SFU costs nothing; what it sends on is the bill.
 */
export function simulcastEncodings(kind: VideoKind): RTCRtpEncodingParameters[] {
  return kind === "camera"
    ? [
        { rid: "h", ...PROFILES.camera.high },
        { rid: "m", ...PROFILES.camera.medium },
        { rid: "l", ...PROFILES.camera.low },
      ]
    : [
        { rid: "h", ...PROFILES.screen.high },
        { rid: "l", ...PROFILES.screen.low },
      ];
}

/** Peer to peer there is no SFU to choose, so the sender turns its own video down. */
export function sendAtQuality(sender: RTCRtpSender, kind: VideoKind, quality: VideoQuality) {
  if (!sender.track) return;
  const wanted = PROFILES[kind][quality];
  const parameters = sender.getParameters();
  // Before negotiation some browsers report no encodings at all: an empty list
  // here used to throw, quietly, and leave a call's video uncapped.
  if (!parameters.encodings?.length) parameters.encodings = [{}];
  const encoding = parameters.encodings[0];
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
