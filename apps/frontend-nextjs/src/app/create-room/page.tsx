"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function CreateRoomPage() {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      const room = await response.json();
      router.push(`/join?roomId=${room.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro relative">
        <Link
          href="/rooms"
          className="absolute top-6 left-6 p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>

        <div className="text-center mb-8 mt-4">
          <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl border-2 border-brand-secondary/20 flex items-center justify-center mx-auto mb-4 rotate-3">
            <Sparkles className="w-8 h-8 text-brand-secondary" />
          </div>
          <h1 className="text-3xl font-pixel text-gray-900 mb-2">
            Create a Space
          </h1>
          <p className="text-gray-500">Give your virtual office a name</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-pixel text-xl text-gray-700 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Team..."
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-brand-primary outline-none transition-all font-medium text-lg placeholder:text-gray-400"
              maxLength={30}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
