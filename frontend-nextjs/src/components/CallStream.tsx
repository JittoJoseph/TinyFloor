"use client";

import { useEffect, useRef } from "react";
import { faceBackground } from "@/components/ui/Face";

/** A face sized by its card rather than in pixels. */
function FaceFill({ seed }: { seed: string }) {
  return (
    <span
      className="block aspect-square h-[42cqh] max-h-[80px] rounded-full shadow-[inset_-3px_-4px_10px_rgb(0_0_0/0.22),inset_2px_3px_7px_rgb(255_255_255/0.28)]"
      style={{ backgroundImage: faceBackground(seed) }}
    />
  );
}

export function CallStream({
  stream,
  muted,
  hidden,
  seed,
  mirror = false,
  fit = "cover",
}: {
  stream: MediaStream | null;
  muted: boolean;
  hidden?: boolean;
  /** Whose face stands in when the camera is off. */
  seed: string;
  /** Your own camera, shown the way a mirror would. */
  mirror?: boolean;
  /** A shared screen is letterboxed so nothing on it is cropped away. */
  fit?: "cover" | "contain";
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
        className={`w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"} ${mirror ? "-scale-x-100" : ""} ${hasVideo ? "" : "invisible"}`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 bg-card flex items-center justify-center [container-type:size]">
          <FaceFill seed={seed} />
        </div>
      )}
    </>
  );
}
