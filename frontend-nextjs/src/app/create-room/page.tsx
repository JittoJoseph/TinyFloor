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
      <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans bg-[var(--color-braun-bg)]">
        <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm relative">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-6">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h1 className="text-3xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
              Space Created
            </h1>
            <p className="text-[var(--color-braun-text)] opacity-50 text-sm">
              Your private space is ready. Share this link with your team:
            </p>
          </div>

          {/* Share Link */}
          <div className="mb-8">
            <div className="flex items-center gap-2 p-1 bg-[#fbfbf9] border border-[rgba(0,0,0,0.04)] rounded-2xl">
              <input
                type="text"
                readOnly
                value={`${
                  typeof window !== "undefined" ? window.location.origin : ""
                }/join?code=${createdRoom.shareCode}`}
                className="flex-1 bg-transparent px-4 py-3 text-sm font-medium text-[var(--color-braun-text)] opacity-80 outline-none truncate"
              />
              <button
                onClick={copyShareLink}
                className={`cursor-pointer p-3 rounded-xl transition-colors border border-[rgba(0,0,0,0.04)] ${
                  copied
                    ? "bg-white text-green-600 shadow-sm"
                    : "bg-white text-[var(--color-braun-text)] opacity-60 hover:opacity-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
                }`}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={goToRoom}
              className="cursor-pointer w-full h-14 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full shadow-sm transition-colors"
            >
              Enter Space
            </button>
            <button
              onClick={() => {
                setCreatedRoom(null);
                setName("");
                setPassword("");
              }}
              className="w-full h-14 bg-[#fbfbf9] hover:bg-white text-[var(--color-braun-text)] border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)] font-bold uppercase tracking-widest text-xs rounded-full shadow-sm transition-all"
            >
              Create Another Space
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 font-sans bg-[var(--color-braun-bg)]">
      <div className="max-w-md w-full bg-white p-10 rounded-[2rem] border border-[rgba(0,0,0,0.06)] shadow-sm relative">
        <Link
          href="/rooms"
          className="cursor-pointer absolute top-6 left-6 w-10 h-10 flex items-center justify-center hover:bg-[#fbfbf9] border border-transparent hover:border-[rgba(0,0,0,0.04)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-braun-text)] opacity-50" />
        </Link>

        <div className="text-center mb-10 mt-2">
          <div className="w-16 h-16 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-6 shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
            <Sparkles className="w-6 h-6 text-[var(--color-braun-orange)]" />
          </div>
          <h1 className="text-3xl font-light text-[var(--color-braun-text)] tracking-tight mb-2">
            Create a Space
          </h1>
          <p className="text-[var(--color-braun-text)] opacity-50 text-sm">
            Set up your virtual office
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
              Space Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engineering Team..."
              className="w-full h-14 px-5 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl focus:border-[var(--color-braun-text)] outline-none transition-colors text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              maxLength={50}
              autoFocus
            />
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#fbfbf9] border border-[rgba(0,0,0,0.04)] rounded-2xl">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`py-4 rounded-xl transition-all flex flex-col items-center gap-1.5 ${
                  isPublic
                    ? "bg-white text-[var(--color-braun-text)] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.04)]"
                    : "bg-transparent text-[var(--color-braun-text)] opacity-50 hover:opacity-100 border border-transparent"
                }`}
              >
                <Globe className="w-5 h-5 mb-1" />
                <span className="font-bold text-xs uppercase tracking-widest">
                  Public
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`py-4 rounded-xl transition-all flex flex-col items-center gap-1.5 ${
                  !isPublic
                    ? "bg-white text-[var(--color-braun-text)] shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.04)]"
                    : "bg-transparent text-[var(--color-braun-text)] opacity-50 hover:opacity-100 border border-transparent"
                }`}
              >
                <Lock className="w-5 h-5 mb-1" />
                <span className="font-bold text-xs uppercase tracking-widest">
                  Private
                </span>
              </button>
            </div>
          </div>

          {/* Password (optional) */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-braun-text)] opacity-70 mb-3">
              Password
              <span className="opacity-50 tracking-normal capitalize font-normal text-[10px]">
                (optional)
              </span>
            </label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-braun-text)] opacity-40" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty for no password"
                className="w-full pl-12 pr-12 h-14 bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl focus:border-[var(--color-braun-text)] outline-none transition-colors text-[var(--color-braun-text)] placeholder:text-[var(--color-braun-text)] placeholder:opacity-40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--color-braun-text)] opacity-40 hover:opacity-100 transition-opacity"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="cursor-pointer w-full h-14 bg-[var(--color-braun-text)] hover:bg-[#1a1a1a] text-[var(--color-braun-bg)] font-bold uppercase tracking-widest text-xs rounded-full shadow-sm transition-colors disabled:opacity-50 disabled:hover:bg-[var(--color-braun-text)]"
            >
              {isSubmitting ? "Creating..." : "Create Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
