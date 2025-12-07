"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LogOut } from "lucide-react";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-game-bg text-gray-600 font-pixel text-2xl">
      Loading virtual office...
    </div>
  ),
});

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomId = params.roomId as string;
  const name = searchParams.get("name");
  const character = searchParams.get("character");

  const [mounted, setMounted] = useState(false);
  const [roomName, setRoomName] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    if (!name || !character) {
      // Redirect back to join if missing info
      router.replace(`/join?roomId=${roomId}`);
    } else {
      // Fetch room details
      fetch(`/api/rooms/${roomId}`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Room not found");
        })
        .then((data) => setRoomName(data.name))
        .catch((err) => console.error("Failed to fetch room name:", err));
    }
  }, [name, character, roomId, router]);

  if (!mounted || !name || !character) return null;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="bg-ui-white border-2 border-ui-border px-4 py-2 rounded-xl shadow-retro pointer-events-auto flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h1 className="font-pixel text-xl text-gray-900 leading-none">
              {roomName ? roomName : `Room: ${roomId}`}
            </h1>
            <p className="text-xs text-gray-500 font-mono">
              Connected as {name}
            </p>
          </div>
        </div>

        <Link
          href="/rooms"
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all pointer-events-auto font-pixel text-lg flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Leave
        </Link>
      </div>

      <PhaserGame name={name} roomId={roomId} character={character} />
    </div>
  );
}
