"use client";

import { useEffect, useRef } from "react";

export function CallStream({
  stream,
  muted,
  hidden,
  initial,
}: {
  stream: MediaStream | null;
  muted: boolean;
  hidden?: boolean;
  initial: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = !hidden && !!stream && stream.getVideoTracks().length > 0;

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${hasVideo ? "" : "invisible"}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 bg-[#fbfbf9] flex items-center justify-center [container-type:size]">
          <div className="h-[40cqh] max-h-[72px] aspect-square bg-[var(--color-braun-text)]/5 border border-[rgba(0,0,0,0.06)] rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-[length:min(18cqh,28px)]">
            {initial.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </>
  );
}
