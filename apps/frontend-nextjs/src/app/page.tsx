"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      Loading game...
    </div>
  ),
});

interface Room {
  id: string;
  name: string;
  users: string[];
}

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [gameState, setGameState] = useState<{
    roomId: string;
    name: string;
    character: string;
  } | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinCharacter, setJoinCharacter] = useState("Adam");
  const [createName, setCreateName] = useState("");

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch("/api/rooms");
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    }
  };

  const createRoom = async () => {
    if (!createName.trim()) return;
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      const room = await response.json();
      setRooms([...rooms, room]);
      setCreateName("");
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!joinName.trim()) return;
    try {
      await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: joinName }),
      });
      setGameState({ roomId, name: joinName, character: joinCharacter });
    } catch (error) {
      console.error("Failed to join room:", error);
    }
  };

  if (gameState) {
    return <PhaserGame name={gameState.name} roomId={gameState.roomId} character={gameState.character} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">SpatialMeet</h1>
          <p className="text-gray-600">Connect and collaborate in virtual office spaces</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Available Rooms</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {rooms.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{room.name}</h3>
                    <p className="text-sm text-gray-500">{room.users.length} users</p>
                  </div>
                  <button
                    onClick={() => setShowJoinModal(room.id)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Join
                  </button>
                </div>
              ))}
              {rooms.length === 0 && (
                <p className="text-gray-500 text-center py-8">No rooms available. Create one!</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Create New Room</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Room name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
              <button
                onClick={createRoom}
                className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>

        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Join Room</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={30}
                />
                <select
                  value={joinCharacter}
                  onChange={(e) => setJoinCharacter(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Adam">Adam</option>
                  <option value="Alex">Alex</option>
                  <option value="Amelia">Amelia</option>
                  <option value="Bob">Bob</option>
                </select>
                <div className="flex space-x-3">
                  <button
                    onClick={() => joinRoom(showJoinModal)}
                    className="flex-1 bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => setShowJoinModal(null)}
                    className="flex-1 bg-gray-300 text-gray-700 p-3 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}