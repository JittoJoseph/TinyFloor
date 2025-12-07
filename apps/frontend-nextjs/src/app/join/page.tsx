"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";

const CHARACTERS = ["Adam", "Alex", "Amelia", "Bob"];

function JoinContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId");
  const router = useRouter();

  const [name, setName] = useState("");
  const [character, setCharacter] = useState("Adam");

  const handleJoin = () => {
    if (!name.trim() || !roomId) return;

    // Redirect to the room page with params
    router.push(
      `/room/${roomId}?name=${encodeURIComponent(name)}&character=${character}`
    );
  };

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro text-center">
          <p className="text-red-500 font-pixel text-xl mb-4">
            No room specified.
          </p>
          <Link
            href="/rooms"
            className="text-brand-primary hover:underline font-bold"
          >
            Go back to rooms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro relative">
      <Link
        href="/rooms"
        className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-500" />
      </Link>

      <div className="text-center mb-8 mt-4">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl border-2 border-indigo-200 flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-pixel text-gray-900 mb-2">Join Room</h1>
        <p className="text-gray-500">Set up your profile</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block font-pixel text-xl text-gray-700 mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-brand-primary outline-none transition-all font-medium text-lg"
            maxLength={30}
            autoFocus
          />
        </div>

        <div>
          <label className="block font-pixel text-xl text-gray-700 mb-2">
            Choose Character
          </label>
          <div className="grid grid-cols-4 gap-3">
            {CHARACTERS.map((char) => (
              <button
                key={char}
                onClick={() => setCharacter(char)}
                className={`p-2 rounded-xl border-2 transition-all relative group ${
                  character === char
                    ? "border-brand-primary bg-indigo-50 shadow-retro-sm translate-y-[-2px]"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="aspect-square bg-white rounded-lg mb-1 overflow-hidden relative border border-gray-100">
                  {/* Placeholder for sprite preview */}
                  <div className="absolute inset-0 flex items-center justify-center text-lg font-pixel text-gray-400 group-hover:scale-110 transition-transform">
                    {char[0]}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold block text-center ${
                    character === char ? "text-brand-primary" : "text-gray-500"
                  }`}
                >
                  {char}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={!name.trim()}
          className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          Enter Room
        </button>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
      <Suspense fallback={<div>Loading...</div>}>
        <JoinContent />
      </Suspense>
    </div>
  );
}
