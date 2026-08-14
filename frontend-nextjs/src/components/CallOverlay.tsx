"use client";

import { useEffect, useRef } from "react";
import { Phone, Video, X, Check } from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";

export default function CallOverlay() {
  const { incoming, outgoing, peers, localStream, speakerEnabled, cameraEnabled, error } =
    useCall();

  return (
    <>
      {incoming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#fbfbf9] rounded-[2rem] shadow-xl p-8 w-80 border border-[rgba(0,0,0,0.06)] animate-bounce-slight">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse text-[var(--color-braun-text)]">
                {incoming.video ? (
                  <Video className="w-8 h-8" />
                ) : (
                  <Phone className="w-8 h-8" />
                )}
              </div>
              <h3 className="font-bold tracking-wide text-2xl text-[var(--color-braun-text)] mb-2">
                {incoming.name}
              </h3>
              <p className="text-gray-500 font-medium text-sm tracking-wide">
                Incoming {incoming.video ? "video" : "audio"} call...
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => callManager.decline()}
                className="cursor-pointer flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] py-3 rounded-full font-bold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 border border-[rgba(0,0,0,0.06)] shadow-sm"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
              <button
                onClick={() => callManager.accept()}
                className="cursor-pointer flex-1 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white py-3 rounded-full font-bold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-3 pointer-events-none">
        {error && (
          <div className="pointer-events-auto w-64 bg-[#ff4e00]/10 border border-[#ff4e00]/20 text-[#ff4e00] rounded-2xl px-4 py-3 text-[11px] font-bold tracking-wide">
            {error}
          </div>
        )}

        {outgoing && (
          <div className="pointer-events-auto w-64 bg-[#fbfbf9] rounded-2xl shadow-md border border-[rgba(0,0,0,0.06)] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--color-braun-text)]/5 flex items-center justify-center text-[var(--color-braun-text)] font-bold text-sm animate-pulse">
              {outgoing.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[var(--color-braun-text)] text-sm truncate tracking-wide">
                {outgoing.name}
              </div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                Calling...
              </div>
            </div>
            <button
              onClick={() => callManager.cancel()}
              className="cursor-pointer p-2 rounded-full bg-[#ff4e00] text-white transition-all active:scale-95"
              title="Cancel call"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {peers.map((peer) => (
          <VideoTile
            key={peer.id}
            stream={peer.stream}
            name={peer.name}
            muted={!speakerEnabled}
            pending={!peer.connected}
          />
        ))}

        {localStream && (
          <VideoTile
            stream={localStream}
            name="You"
            muted
            mirrored
            compact
            hidden={!cameraEnabled}
          />
        )}
      </div>
    </>
  );
}

function VideoTile({
  stream,
  name,
  muted,
  pending,
  mirrored,
  compact,
  hidden,
}: {
  stream: MediaStream;
  name: string;
  muted: boolean;
  pending?: boolean;
  mirrored?: boolean;
  compact?: boolean;
  hidden?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = !hidden && stream.getVideoTracks().length > 0;

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream]);

  return (
    <div
      className={`pointer-events-auto ${compact ? "w-40 h-28" : "w-64 h-48"} bg-[#fbfbf9] rounded-2xl overflow-hidden shadow-md border border-[rgba(0,0,0,0.06)] relative self-end`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""} ${hasVideo ? "" : "invisible"}`}
      />

      {!hasVideo && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="w-14 h-14 bg-white shadow-sm border border-[rgba(0,0,0,0.06)] rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-xl">
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {pending && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[var(--color-braun-text)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm text-[var(--color-braun-text)] text-center py-1.5 rounded-lg border border-[rgba(0,0,0,0.06)] shadow-sm font-bold tracking-wider text-[10px] uppercase">
        {name}
      </div>
    </div>
  );
}
