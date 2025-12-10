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
}

export default function CallOverlay() {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);

  useEffect(() => {
    const handleIncomingCall = (e: CustomEvent) => {
      setIncomingCall(e.detail);
    };

    const handleIncomingCallEnded = () => {
      setIncomingCall(null);
    };

    const handleRemoteStreamAdded = (e: CustomEvent) => {
      setRemoteStreams((prev) => {
        // Check if already exists
        if (prev.find((s) => s.peerId === e.detail.peerId)) return prev;
        return [...prev, e.detail];
      });
    };

    const handleRemoteStreamRemoved = (e: CustomEvent) => {
      setRemoteStreams((prev) =>
        prev.filter((s) => s.peerId !== e.detail.peerId)
      );
    };

    const handleCallEnded = () => {
      setRemoteStreams([]);
      setIncomingCall(null);
    };

    window.addEventListener(
      "incomingCall",
      handleIncomingCall as EventListener
    );
    window.addEventListener(
      "incomingCallEnded",
      handleIncomingCallEnded as EventListener
    );
    window.addEventListener(
      "remoteStreamAdded",
      handleRemoteStreamAdded as EventListener
    );
    window.addEventListener(
      "remoteStreamRemoved",
      handleRemoteStreamRemoved as EventListener
    );
    window.addEventListener("callEnded", handleCallEnded as EventListener);

    return () => {
      window.removeEventListener(
        "incomingCall",
        handleIncomingCall as EventListener
      );
      window.removeEventListener(
        "incomingCallEnded",
        handleIncomingCallEnded as EventListener
      );
      window.removeEventListener(
        "remoteStreamAdded",
        handleRemoteStreamAdded as EventListener
      );
      window.removeEventListener(
        "remoteStreamRemoved",
        handleRemoteStreamRemoved as EventListener
      );
      window.removeEventListener("callEnded", handleCallEnded as EventListener);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 border-4 border-gray-800 animate-bounce-slight">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                {incomingCall.callType === "video" ? (
                  <Video className="w-10 h-10 text-indigo-600" />
                ) : (
                  <Phone className="w-10 h-10 text-indigo-600" />
                )}
              </div>
              <h3 className="font-pixel text-2xl text-gray-900 mb-1">
                {incomingCall.fromName}
              </h3>
              <p className="text-gray-500 font-medium">
                Incoming {incomingCall.callType} call...
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={declineCall}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-pixel text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-retro"
              >
                <X className="w-5 h-5" />
                Decline
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-pixel text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-retro"
              >
                <Check className="w-5 h-5" />
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

  useEffect(() => {
    if (videoRef.current && streamData.stream) {
      videoRef.current.srcObject = streamData.stream;
    }
  }, [streamData.stream]);

  return (
    <div className="pointer-events-auto w-64 h-48 bg-gray-900 rounded-xl overflow-hidden shadow-retro border-2 border-gray-800 relative group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 font-pixel text-sm">
        Remote User
      </div>
    </div>
  );
}
