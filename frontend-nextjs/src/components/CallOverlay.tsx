"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Video, X, Check, Maximize2, Minimize2 } from "lucide-react";
import { callManager } from "@/lib/CallManager";
import { useCall } from "@/lib/useCall";

export default function CallOverlay() {
  const {
    incoming,
    outgoing,
    peers,
    localStream,
    speakerEnabled,
    cameraEnabled,
    error,
  } = useCall();
  const [zoomed, setZoomed] = useState(false);
  const peer = peers[0];
  const expanded = zoomed && !!peer;

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomed(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  const selfView = localStream && (
    <Stream
      stream={localStream}
      muted
      mirrored
      hidden={!cameraEnabled}
      initial="You"
    />
  );

  return (
    <>
      {incoming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
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

      {expanded && peer && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        />
      )}

      {peer && (
        <div
          onClick={() => !expanded && setZoomed(true)}
          className={
            expanded
              ? "fixed z-40 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(880px,92vw)] aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black"
              : "fixed z-40 bottom-24 right-4 w-64 aspect-video rounded-2xl overflow-hidden shadow-md border border-[rgba(0,0,0,0.06)] bg-black cursor-pointer group transition-transform hover:-translate-y-0.5"
          }
        >
          <Stream stream={peer.stream} muted={!speakerEnabled} initial={peer.name} />

          {!peer.connected && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(!expanded);
            }}
            className={`cursor-pointer absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity ${
              expanded ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
            title={expanded ? "Minimize" : "Expand"}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {expanded && (
            <div className="absolute bottom-4 right-4 w-1/4 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black">
              {selfView}
            </div>
          )}
        </div>
      )}

      <div
        className={`fixed right-4 z-40 flex flex-col items-end gap-3 pointer-events-none ${
          peer && !expanded ? "bottom-64" : "bottom-24"
        }`}
      >
        {error && (
          <button
            onClick={() => callManager.clearError()}
            className="cursor-pointer pointer-events-auto w-64 text-left bg-[#ff4e00]/10 border border-[#ff4e00]/20 text-[#ff4e00] rounded-2xl px-4 py-3 text-[11px] font-bold tracking-wide"
          >
            {error}
          </button>
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
      </div>
    </>
  );
}

function Stream({
  stream,
  muted,
  mirrored,
  hidden,
  initial,
}: {
  stream: MediaStream;
  muted: boolean;
  mirrored?: boolean;
  hidden?: boolean;
  initial: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasVideo = !hidden && stream.getVideoTracks().length > 0;

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
        className={`w-full h-full object-cover ${mirrored ? "scale-x-[-1]" : ""} ${
          hasVideo ? "" : "invisible"
        }`}
      />
      {!hasVideo && (
        <div className="absolute inset-0 bg-[#1f2937] flex items-center justify-center">
          <div className="w-1/4 max-w-[72px] aspect-square bg-white/10 border border-white/15 rounded-full flex items-center justify-center text-white font-bold text-[min(4vw,28px)]">
            {initial.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </>
  );
}
