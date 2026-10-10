"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Mic, MicOff, Settings, Video, VideoOff } from "@/components/ui/icons";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { useMeetings } from "@/lib/meetings";
import { deviceConstraint, savedDevices } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Link } from "@/lib/i18n/navigation";
import { Face, faceBackground } from "@/components/ui/Face";
import { usePlace } from "@/components/app/place";
import { cn } from "@/lib/utils";

/** People offered in "Free to talk" at most. */
const FREE_SHOWN = 4;
/** Where the camera choice is remembered between visits. */
const CAMERA_KEY = "tinyfloor:join-camera";

/** The camera choice, kept in this browser and read like any other store. */
const cameraListeners = new Set<() => void>();
const cameraChoice = {
  subscribe(listener: () => void) {
    cameraListeners.add(listener);
    return () => cameraListeners.delete(listener);
  },
  get(): boolean {
    try {
      return localStorage.getItem(CAMERA_KEY) === "on";
    } catch {
      return false;
    }
  },
  set(on: boolean) {
    try {
      localStorage.setItem(CAMERA_KEY, on ? "on" : "off");
    } catch {
      // Not remembered, this once.
    }
    cameraListeners.forEach((listener) => listener());
  },
};

/**
 * You, before a meeting, the way Meet shows you: a big picture with the mic
 * and camera under your thumb. The mic is the same switch as in a meeting;
 * the camera is whether you go in with it on, remembered for next time, and
 * shown live while it's on, with the mic's level. Leaving the page or joining
 * closes the preview.
 */
export function JoinPreview() {
  const t = useTranslations("meetings.ready");
  const tc = useTranslations("controls");
  const ts = useTranslations("settings.sections");
  const { user } = useAuth();
  const place = usePlace();
  const { micEnabled } = useCall();
  const { mirrorVideo } = usePrefs();
  const camera = useSyncExternalStore(cameraChoice.subscribe, cameraChoice.get, () => false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [blocked, setBlocked] = useState(false);
  const level = useLevel(micEnabled ? stream : null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    callManager.setCameraOnJoin(camera);
    return () => callManager.setCameraOnJoin(false);
  }, [camera]);

  useEffect(() => {
    if (!camera) return;
    let live: MediaStream | null = null;
    let cancelled = false;
    const devices = savedDevices();
    navigator.mediaDevices
      ?.getUserMedia({ video: { deviceId: deviceConstraint(devices.video) }, audio: { deviceId: deviceConstraint(devices.audio) } })
      .then((opened) => {
        if (cancelled) return opened.getTracks().forEach((track) => track.stop());
        live = opened;
        setBlocked(false);
        setStream(opened);
      })
      .catch(() => {
        if (cancelled) return;
        setBlocked(true);
        cameraChoice.set(false);
      });
    return () => {
      cancelled = true;
      live?.getTracks().forEach((track) => track.stop());
      setStream(null);
    };
  }, [camera]);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);

  const toggleCamera = () => cameraChoice.set(!camera);

  const round = "flex size-12 cursor-pointer items-center justify-center rounded-full transition-colors [&_svg]:size-5";
  // Off is the ordinary state, drawn like any button; on is the one that stands out.
  const plain = stream
    ? "border border-white/25 bg-black/35 text-white backdrop-blur hover:bg-black/50"
    : "border border-border bg-background text-foreground hover:bg-muted";
  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-[28px] bg-[color-mix(in_oklab,var(--ui-muted)_80%,var(--ui-background))] ring-1 ring-inset ring-foreground/[0.06]">
        {stream ? (
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className={cn("absolute inset-0 size-full object-cover", mirrorVideo && "-scale-x-100")}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            {user && (
              <span aria-hidden className="aspect-square h-[30%] rounded-full" style={{ backgroundImage: faceBackground(user.id) }} />
            )}
            <p className="text-[13px] text-muted-foreground">{blocked ? t("blocked") : t("cameraOff")}</p>
          </div>
        )}
        {stream && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent"
          />
        )}
        <span
          className={cn(
            "absolute start-4 top-4 text-[13px] font-medium",
            stream ? "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]" : "text-foreground/90",
          )}
        >
          {user?.displayName}
        </span>

        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => callManager.setMic(!micEnabled)}
            aria-label={micEnabled ? tc("muteMic") : tc("unmuteMic")}
            title={micEnabled ? tc("muteMic") : tc("unmuteMic")}
            className={cn(round, "relative overflow-hidden", micEnabled ? plain : "bg-destructive text-white hover:bg-destructive/90")}
          >
            {/* The mic's level, filling the button from the bottom while you talk. */}
            {micEnabled && stream && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 bg-ok/40 transition-[height] duration-75"
                style={{ height: `${Math.round(level * 100)}%` }}
              />
            )}
            <span className="relative">{micEnabled ? <Mic /> : <MicOff />}</span>
          </button>
          <button
            type="button"
            onClick={toggleCamera}
            aria-label={camera ? tc("cameraOff") : tc("cameraOn")}
            title={camera ? tc("cameraOff") : tc("cameraOn")}
            aria-pressed={camera}
            className={cn(round, camera ? "bg-white text-black hover:bg-white/90" : plain)}
          >
            {camera ? <Video /> : <VideoOff />}
          </button>
        </div>
        <Link
          href={`${place.paths.settings}#media`}
          aria-label={ts("media")}
          title={ts("media")}
          className={cn(
            "absolute bottom-4 end-4 flex size-10 items-center justify-center rounded-full transition-colors [&_svg]:size-[18px]",
            stream ? "text-white hover:bg-white/15" : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
          )}
        >
          <Settings />
        </Link>
      </div>
    </div>
  );
}

/** How loud the mic is, 0 to 1, while there is a stream to listen to. */
function useLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream?.getAudioTracks().length) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const sample of samples) peak = Math.max(peak, Math.abs(sample - 128));
      setLevel(Math.min(1, peak / 64));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(frame);
      void context.close();
      setLevel(0);
    };
  }, [stream]);
  return stream ? level : 0;
}

/**
 * Who on the floor is free right now (available, and in no meeting), with a
 * meeting with them one press away: it starts one and asks them in. Nobody
 * free, and it isn't shown.
 */
export function FreeToTalk({ className }: { className?: string }) {
  const t = useTranslations("meetings.free");
  const { user } = useAuth();
  const everyone = useFloor();
  const { meetings } = useMeetings();
  const meeting = new Set(meetings.flatMap((one) => one.members.map((person) => person.id)));
  const free = everyone.filter((one) => one.id !== user?.id && one.status === "available" && !meeting.has(one.id));
  if (!free.length) return null;

  return (
    <section className={cn("[--face-ring:var(--ui-card)]", className)}>
      <h2 className="mb-2 text-[12.5px] font-medium text-muted-foreground">{t("title")}</h2>
      <ul className="-mx-2">
        {free.slice(0, FREE_SHOWN).map((one) => (
          <li key={one.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <Face seed={one.id} size={28} presence="available" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{one.name}</span>
            <button
              type="button"
              onClick={() => callManager.startMeeting("", [one.id])}
              className="h-7 shrink-0 cursor-pointer rounded-full border border-border px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
            >
              {t("meet")}
            </button>
          </li>
        ))}
      </ul>
      {free.length > FREE_SHOWN && <p className="pb-1.5 pt-1 text-[12px] text-faint">{t("more", { count: free.length - FREE_SHOWN })}</p>}
    </section>
  );
}
