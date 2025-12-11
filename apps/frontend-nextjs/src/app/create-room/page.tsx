"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export default function CreateRoomPage() {
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{
    id: string;
    shareCode?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const room = await apiClient.createRoom({
        name: name.trim(),
        isPublic,
        password: password || undefined,
      });

      if (!isPublic && room.shareCode) {
        setCreatedRoom(room);
        showToast("Room created successfully!", "success");
      } else {
        router.push(`/join?roomId=${room.id}`);
      }
    } catch (error) {
      console.error("Failed to create room:", error);
      showToast("Failed to create room. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  const copyShareLink = () => {
    if (createdRoom?.shareCode) {
      const shareUrl = `${window.location.origin}/join?code=${createdRoom.shareCode}`;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast("Share link copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const goToRoom = () => {
    if (createdRoom) {
      router.push(`/join?roomId=${createdRoom.id}`);
    }
  };

  // Success state for private rooms
  if (createdRoom && !isPublic) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-ui-white p-8 rounded-3xl border-2 border-ui-border shadow-retro relative">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-2xl border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-pixel text-gray-900 mb-2">
              Room Created!
            </h1>
            <p className="text-gray-500">
              Your private room is ready. Share this link with your team:
            </p>
          </div>

          {/* Share Link */}
          <div className="mb-6">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
              <input
                type="text"
                readOnly
                value={`${
                  typeof window !== "undefined" ? window.location.origin : ""
                }/join?code=${createdRoom.shareCode}`}
                className="flex-1 bg-transparent text-sm font-mono text-gray-600 outline-none truncate"
              />
              <button
                onClick={copyShareLink}
                className={`p-2 rounded-lg transition-colors ${
                  copied
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={goToRoom}
              className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all"
            >
              Enter Room
            </button>
            <button
              onClick={() => {
                setCreatedRoom(null);
                setName("");
                setPassword("");
              }}
              className="w-full py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border-2 border-gray-200 transition-colors"
            >
              Create Another Room
            </button>
          </div>

          {/* Speech bubble tail */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45" />
        </div>
      </div>
    );
  }

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
          <p className="text-gray-500">Set up your virtual office</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
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
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="block font-pixel text-xl text-gray-700 mb-3">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  isPublic
                    ? "border-brand-primary bg-brand-primary/5 shadow-retro-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Globe
                  className={`w-6 h-6 ${
                    isPublic ? "text-brand-primary" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-bold text-sm ${
                    isPublic ? "text-brand-primary" : "text-gray-600"
                  }`}
                >
                  Public
                </span>
                <span className="text-xs text-gray-500">Listed & open</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  !isPublic
                    ? "border-brand-primary bg-brand-primary/5 shadow-retro-sm"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Lock
                  className={`w-6 h-6 ${
                    !isPublic ? "text-brand-primary" : "text-gray-400"
                  }`}
                />
                <span
                  className={`font-bold text-sm ${
                    !isPublic ? "text-brand-primary" : "text-gray-600"
                  }`}
                >
                  Private
                </span>
                <span className="text-xs text-gray-500">Invite only</span>
              </button>
            </div>
          </div>

          {/* Password (optional) */}
          <div>
            <label className="block font-pixel text-xl text-gray-700 mb-2">
              Password{" "}
              <span className="text-gray-400 text-sm font-body">
                (optional)
              </span>
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-0 focus:border-brand-primary outline-none transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-4 bg-brand-primary hover:bg-indigo-600 text-white font-pixel text-xl rounded-xl border-2 border-ui-border shadow-retro hover:-translate-y-1 hover:shadow-retro-hover active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {isSubmitting ? "Creating..." : "Create Room"}
          </button>
        </form>

        {/* Speech bubble tail */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-ui-white border-r-2 border-b-2 border-ui-border rotate-45" />
      </div>
    </div>
  );
}
