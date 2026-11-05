import type { VideoKind, VideoQuality } from "@shared/messages";

/**
 * Everything about video quality lives here: what we capture, the qualities we
 * send, and who gets which. Egress is the whole bill (docs/calls.md), so
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
  // A screen is text: full resolution when it is big, 15 frames a second so
  // scrolling reads smoothly. A still screen sends next to nothing whatever
  // the cap; the cap is what a scroll or a video may take.
  screen: {
    high: { maxBitrate: 2_000_000, maxFramerate: 15 },
    medium: { maxBitrate: 2_000_000, maxFramerate: 15 },
    low: { maxBitrate: 200_000, scaleResolutionDownBy: 4, maxFramerate: 5 },
  },
};

/** 720p, the most any card shows, and an easy size for a laptop to encode. */
export const CAMERA_CAPTURE: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: "user",
};

/**
 * Up to 1080p: at 720p a laptop's 13px text is a blur (docs/calls.md). The
 * options after `video` are Chrome's: our own tab isn't offered (sharing it
 * shows a hall of mirrors), and the bar Chrome shows while sharing can switch
 * to another tab without stopping.
 */
export const SCREEN_SHARE = {
  video: {
    width: { max: 1920 },
    height: { max: 1080 },
    frameRate: { ideal: 15, max: 15 },
  },
  audio: false,
  selfBrowserSurface: "exclude",
  surfaceSwitching: "include",
} as DisplayMediaStreamOptions;

/**
 * Every quality at once for the SFU, which forwards only the one each viewer
 * asked for. Sending to the SFU costs nothing; what it sends on is the bill.
 * The layers are named a, b, c, sharpest first: the SFU steps down through
 * them in that order when a viewer's bandwidth runs short (the room's RANKED).
 */
export function simulcastEncodings(kind: VideoKind): RTCRtpEncodingParameters[] {
  return kind === "camera"
    ? [
        { rid: "a", ...PROFILES.camera.high },
        { rid: "b", ...PROFILES.camera.medium },
        { rid: "c", ...PROFILES.camera.low },
      ]
    : [
        { rid: "a", ...PROFILES.screen.high },
        { rid: "c", ...PROFILES.screen.low },
      ];
}

/**
 * Peer to peer there is no SFU to choose, so the sender turns its own video
 * down, or off (`active` false) while the other side can't see it.
 */
export function sendAtQuality(sender: RTCRtpSender, kind: VideoKind, quality: VideoQuality, active = true) {
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
    encoding.maxFramerate === wanted.maxFramerate &&
    (encoding.active ?? true) === active
  ) {
    return;
  }
  Object.assign(encoding, { scaleResolutionDownBy: 1, maxFramerate: undefined }, wanted, { active });
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

const DEVICES_EVENT = "tinyfloor-devices";

export function saveDevices(devices: DevicePreferences) {
  try {
    localStorage.setItem(DEVICES_KEY, JSON.stringify(devices));
  } catch {}
  window.dispatchEvent(new Event(DEVICES_EVENT));
}

/** A microphone or camera picked in settings, so a call already open can switch to it. */
export function onDevicesChange(listener: () => void) {
  window.addEventListener(DEVICES_EVENT, listener);
}

export function deviceConstraint(id?: string) {
  return id ? { exact: id } : undefined;
}

/**
 * The microphone or camera picked in settings, or the default one when that
 * one is gone: a headset picked last week and unplugged since would otherwise
 * fail the whole call. (Asked for as `ideal`, Chrome opens the default instead.)
 */
export async function openPicked(kind: "audio" | "video", constraints: MediaTrackConstraints, id?: string): Promise<MediaStream> {
  const open = (deviceId?: string) => navigator.mediaDevices.getUserMedia({ [kind]: deviceId ? { ...constraints, deviceId: { exact: deviceId } } : constraints });
  if (!id) return open();
  try {
    return await open(id);
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotAllowedError") throw error;
    return open();
  }
}

/**
 * The relay's UDP addresses only. Offered TCP and TLS too, Chrome often
 * settles on TCP, where one late packet holds up every one behind it: speech
 * arrives up to a second late and in pieces. UDP comes first; the rest is the
 * fallback for networks that block it (relayFallback).
 */
export function udpRelay(servers: RTCIceServer[]): RTCIceServer[] {
  return servers.flatMap((server) => {
    const urls = ([] as string[]).concat(server.urls);
    if (!urls.some((url) => url.startsWith("turn"))) return [server];
    const udp = urls.filter((url) => url.startsWith("turn:") && url.includes("transport=udp"));
    return udp.length ? [{ ...server, urls: udp }] : [];
  });
}

/**
 * Audio sent with redundancy (RED, RFC 2198): every packet also carries the
 * one before, so a packet lost on the way is heard anyway instead of being
 * papered over. It doubles the voice to about 60 kbps, a few hundredths of a
 * gigabyte an hour, which is nothing next to video. Browsers without it just
 * send Opus.
 */
export function preferRedundantAudio(transceiver: RTCRtpTransceiver) {
  const codecs = typeof RTCRtpReceiver !== "undefined" ? RTCRtpReceiver.getCapabilities?.("audio")?.codecs : undefined;
  if (!codecs || !transceiver.setCodecPreferences) return;
  const isRed = (codec: RTCRtpCodec) => codec.mimeType.toLowerCase() === "audio/red";
  if (!codecs.some(isRed)) return;
  try {
    transceiver.setCodecPreferences([...codecs.filter(isRed), ...codecs.filter((codec) => !isRed(codec))]);
  } catch {
    // An older browser that lists RED but won't take it first: Opus alone.
  }
}

/**
 * Puts the given video codecs first, best first, for what this transceiver
 * sends. A browser that can't decode one leaves it out of its answer, and the
 * next is used.
 */
export function preferVideoCodecs(transceiver: RTCRtpTransceiver, order: string[]) {
  const codecs = typeof RTCRtpReceiver !== "undefined" ? RTCRtpReceiver.getCapabilities?.("video")?.codecs : undefined;
  if (!codecs || !transceiver.setCodecPreferences) return;
  const rank = (codec: RTCRtpCodec) => {
    const at = order.indexOf(codec.mimeType.toLowerCase());
    return at < 0 ? order.length : at;
  };
  try {
    transceiver.setCodecPreferences([...codecs].sort((a, b) => rank(a) - rank(b)));
  } catch {
    // Not taken: the browser's own order.
  }
}
