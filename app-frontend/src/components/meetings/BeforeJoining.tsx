"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, MicOff, Video, VideoOff } from "@/components/ui/icons";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";
import { useAuth } from "@/contexts/AuthContext";
import { useFloor } from "@/lib/floor";
import { useMeetings } from "@/lib/meetings";
import { deviceConstraint, savedDevices } from "@/lib/media";
import { usePrefs } from "@/lib/prefs";
import { Link } from "@/lib/i18n/navigation";
import { Face } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { usePlace } from "@/components/app/place";
import { cn } from "@/lib/utils";

/** People offered in "Free to talk" at most. */
const FREE_SHOWN = 5;

/**
 * Your mic and camera before a meeting, the way Meet shows them before you
 * join: whether you'll come in muted (the same switch as in a meeting), and a
 * test of the camera and the mic's level on demand. Nothing is opened until
 * you ask, and the test stops when you leave the page or join.
 */
export function ReadyCard() {
  const t = useTranslations("meetings.ready");
  const tc = useTranslations("controls");
  const ts = useTranslations("settings.sections");
  const { user } = useAuth();
  const place = usePlace();
  const { micEnabled } = useCall();
  const { mirrorVideo } = usePrefs();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [failed, setFailed] = useState(false);
  const level = useLevel(stream);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video.current) video.current.srcObject = stream;
  }, [stream]);
  // The test ends with the page.
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const test = async () => {
    if (stream) return setStream(null);
    setFailed(false);
    try {
      const devices = savedDevices();
      setStream(
        await navigator.mediaDevices.getUserMedia({
          video: { deviceId: deviceConstraint(devices.video) },
          audio: { deviceId: deviceConstraint(devices.audio) },
        }),
      );
    } catch {
      setFailed(true);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="relative flex aspect-video items-center justify-center bg-muted [--face-ring:var(--ui-muted)]">
        {stream ? (
          <video ref={video} autoPlay muted playsInline className={cn("absolute inset-0 size-full object-cover", mirrorVideo && "-scale-x-100")} />
        ) : (
          user && <Face seed={user.id} size={56} />
        )}
        {stream && (
          <span className="absolute bottom-3 start-3 flex h-6 items-center gap-1.5 rounded-full bg-black/55 px-2 backdrop-blur" aria-hidden>
            <Mic className="size-3 text-white" />
            <span className="h-1 w-12 overflow-hidden rounded-full bg-white/25">
              <span className="block h-full rounded-full bg-ok transition-[width] duration-75" style={{ width: `${Math.round(level * 100)}%` }} />
            </span>
          </span>
        )}
        <div className="absolute bottom-3 end-3 flex gap-1.5">
          <IconButton
            label={micEnabled ? tc("muteMic") : tc("unmuteMic")}
            size="sm"
            tone={micEnabled ? "ghost" : "danger"}
            icon={micEnabled ? <Mic /> : <MicOff />}
            onClick={() => callManager.setMic(!micEnabled)}
            className={cn(micEnabled && "bg-background/90 text-foreground hover:bg-background")}
          />
          <IconButton
            label={stream ? t("stop") : t("test")}
            size="sm"
            icon={stream ? <VideoOff /> : <Video />}
            onClick={test}
            className="bg-background/90 text-foreground hover:bg-background"
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px]">
        <span className={cn(failed ? "text-destructive" : "text-muted-foreground")}>
          {failed ? t("blocked") : micEnabled ? t("joinUnmuted") : t("joinMuted")}
        </span>
        <Link href={`${place.paths.settings}#media`} className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline">
          {ts("media")}
        </Link>
      </div>
    </section>
  );
}

/** How loud the mic is, 0 to 1, while there is a stream to listen to. */
function useLevel(stream: MediaStream | null): number {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream?.getAudioTracks().length) return setLevel(0);
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
    };
  }, [stream]);
  return level;
}

/**
 * Who on the floor is free right now (available, and in no meeting), with a
 * meeting with them one press away: it starts one and asks them in. Nobody
 * free, and it isn't shown.
 */
export function FreeToTalk() {
  const t = useTranslations("meetings.free");
  const { user } = useAuth();
  const everyone = useFloor();
  const { meetings } = useMeetings();
  const meeting = new Set(meetings.flatMap((one) => one.members.map((person) => person.id)));
  const free = everyone.filter((one) => one.id !== user?.id && one.status === "available" && !meeting.has(one.id));
  if (!free.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-background p-2 [--face-ring:var(--ui-background)]">
      <h2 className="px-2 pb-1.5 pt-1.5 text-[12.5px] font-medium text-muted-foreground">{t("title")}</h2>
      <ul>
        {free.slice(0, FREE_SHOWN).map((one) => (
          <li key={one.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-muted/60">
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
      {free.length > FREE_SHOWN && (
        <p className="px-2 pb-1 pt-1.5 text-[12px] text-faint">{t("more", { count: free.length - FREE_SHOWN })}</p>
      )}
    </section>
  );
}
