"use client";

import { useEffect, useState, useRef } from "react";
import { Phone, Video, X, Check } from "lucide-react";

interface IncomingCall {
  from: string;
  fromName: string;
  callType: "audio" | "video";
}

interface RemoteStream {
  peerId: string;
  stream: MediaStream;
  peerName: string;
}

export default function CallOverlay() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  useEffect(() => {
    const handleIncomingCall = (e: CustomEvent) => setIncomingCall(e.detail);
    const handleIncomingCallEnded = () => setIncomingCall(null);
    const handleRemoteStreamAdded = (e: CustomEvent) => {
      setRemoteStreams((prev) =>
        prev.find((s) => s.peerId === e.detail.peerId)
          ? prev
          : [...prev, e.detail],
      );
    };
    const handleRemoteStreamRemoved = (e: CustomEvent) => {
      setRemoteStreams((prev) =>
        prev.filter((s) => s.peerId !== e.detail.peerId),
      );
    };
    const handleCallEnded = () => {
      setRemoteStreams([]);
      setIncomingCall(null);
    };

    const events = [
      { name: "incomingCall", handler: handleIncomingCall },
      { name: "incomingCallEnded", handler: handleIncomingCallEnded },
      { name: "remoteStreamAdded", handler: handleRemoteStreamAdded },
      { name: "remoteStreamRemoved", handler: handleRemoteStreamRemoved },
      { name: "callEnded", handler: handleCallEnded },
    ];

    events.forEach(({ name, handler }) => {
      window.addEventListener(name, handler as EventListener);
    });

    return () => {
      events.forEach(({ name, handler }) => {
        window.removeEventListener(name, handler as EventListener);
      });
    };
  }, []);

  const acceptCall = () => {
    window.dispatchEvent(new CustomEvent("acceptCall"));
    setIncomingCall(null);
  };

  const declineCall = () => {
    window.dispatchEvent(new CustomEvent("declineCall"));
    setIncomingCall(null);
  };

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-[#fbfbf9] rounded-[2rem] shadow-xl p-8 w-80 border border-[rgba(0,0,0,0.06)] animate-bounce-slight">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-[var(--color-braun-text)]/5 rounded-full flex items-center justify-center mx-auto mb-5 animate-pulse text-[var(--color-braun-text)]">
                {incomingCall.callType === "video" ? (
                  <Video className="w-8 h-8" />
                ) : (
                  <Phone className="w-8 h-8" />
                )}
              </div>
              <h3 className="font-bold tracking-wide text-2xl text-[var(--color-braun-text)] mb-2">
                {incomingCall.fromName}
              </h3>
              <p className="text-gray-500 font-medium text-sm tracking-wide">
                Incoming {incomingCall.callType} call...
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={declineCall}
                className="cursor-pointer flex-1 bg-white hover:bg-gray-50 text-[var(--color-braun-text)] py-3 rounded-full font-bold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 border border-[rgba(0,0,0,0.06)] shadow-sm"
              >
                <X className="w-4 h-4" />
                Decline
              </button>
              <button
                onClick={acceptCall}
                className="cursor-pointer flex-1 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-white py-3 rounded-full font-bold tracking-widest text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call Videos */}
      <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-4 pointer-events-none">
        {remoteStreams.map((streamData) => (
          <VideoPlayer key={streamData.peerId} streamData={streamData} />
        ))}
      </div>
    </>
  );
}

function VideoPlayer({ streamData }: { streamData: RemoteStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    if (videoRef.current && streamData.stream) {
      videoRef.current.srcObject = streamData.stream;

      const checkVideoTracks = () => {
        const videoTracks = streamData.stream.getVideoTracks();
        const hasActiveVideo = videoTracks.some(
          (track) => track.enabled && track.readyState === "live",
        );
        setHasVideo(hasActiveVideo);
      };

      checkVideoTracks();
      const intervalId = setInterval(checkVideoTracks, 500);

      return () => clearInterval(intervalId);
    }
  }, [streamData.stream]);

  return (
    <div className="pointer-events-auto w-64 h-48 bg-[#fbfbf9] rounded-2xl overflow-hidden shadow-md border border-[rgba(0,0,0,0.06)] relative group">
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="w-16 h-16 bg-white shadow-sm border border-[rgba(0,0,0,0.06)] rounded-full flex items-center justify-center text-[var(--color-braun-text)] font-bold text-2xl">
            <span>{streamData.peerName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm text-[var(--color-braun-text)] text-center py-1.5 rounded-lg border border-[rgba(0,0,0,0.06)] shadow-sm font-bold tracking-wider text-[10px] uppercase">
        {streamData.peerName}
      </div>
    </div>
  );
}
