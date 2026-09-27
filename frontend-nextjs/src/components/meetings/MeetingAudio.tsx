"use client";

import { useEffect, useRef } from "react";
import { useCall } from "@/lib/useCall";

/**
 * Every voice in your meeting, played once, from wherever you are in the app:
 * the stage, the floor or chat. Kept with the floor, which never unmounts, so
 * switching views never drops or doubles a voice.
 */
export function MeetingAudio() {
  const { meetingPeers, speakerEnabled } = useCall();
  return (
    <>
      {meetingPeers.map((peer) => (
        <Voice key={peer.id} stream={peer.audio} muted={!speakerEnabled} />
      ))}
    </>
  );
}

function Voice({ stream, muted }: { stream: MediaStream | null; muted: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (element && element.srcObject !== stream) element.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay muted={muted} />;
}
