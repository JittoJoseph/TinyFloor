"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Gamepad2, Users, Plus, ArrowLeft } from "lucide-react";

interface Room {
  id: string;
  name: string;
  users: string[];
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`
      );
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-ui-white border-2 border-ui-border rounded-2xl p-6 shadow-retro">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors border-2 border-transparent hover:border-ui-border"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" />
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-pixel text-gray-900 leading-none">
                Active Rooms
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                Join a space to start working
              </p>
            </div>
          </div>

          <Link
            href="/create-room"
            className="bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl px-6 py-3 rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Room
          </Link>
        </div>

        {/* Room List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 font-pixel text-xl text-gray-600">
              Loading spaces...
            </p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-ui-white/80 backdrop-blur border-2 border-ui-border border-dashed rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-ui-border">
              <Gamepad2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-pixel text-2xl text-gray-800 mb-2">
              No active rooms
            </h3>
            <p className="text-gray-500 mb-6">
              Be the first to start a new workspace!
            </p>
            <Link
              href="/create-room"
              className="inline-flex items-center gap-2 text-brand-primary font-bold hover:underline"
            >
              Create a room now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="group bg-ui-white border-2 border-ui-border rounded-2xl p-6 shadow-retro hover:-translate-y-1 hover:shadow-retro-hover transition-all cursor-pointer relative overflow-hidden"
                onClick={() => router.push(`/join?roomId=${room.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl border-2 border-indigo-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="font-pixel text-2xl text-indigo-600">
                      {room.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full border border-green-200 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    ONLINE
                  </div>
                </div>

                <h3 className="font-pixel text-2xl text-gray-900 mb-1 group-hover:text-brand-primary transition-colors">
                  {room.name}
                </h3>
                <p className="text-gray-500 text-sm font-mono mb-4">
                  ID: {room.id}
                </p>

                <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-bold">
                    {room.users.length} / 20
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">Players</span>
                </div>

                {/* Decorative corner */}
                <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gray-100 rounded-full opacity-50 group-hover:scale-150 transition-transform"></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
