"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Volume2,
  Mic,
  Video,
  Monitor,
  Sun,
  Moon,
  Gamepad2,
  User,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AudioDevice {
  deviceId: string;
  label: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"audio" | "video" | "general">(
    "audio"
  );
  const [audioInputDevices, setAudioInputDevices] = useState<AudioDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<AudioDevice[]>(
    []
  );
  const [videoDevices, setVideoDevices] = useState<AudioDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("");
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>("");
  const [masterVolume, setMasterVolume] = useState(80);
  const [micVolume, setMicVolume] = useState(100);
  const [videoQuality, setVideoQuality] = useState<"low" | "medium" | "high">(
    "medium"
  );
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [showFPS, setShowFPS] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Load devices on mount
  useEffect(() => {
    if (!isOpen) return;

    const loadDevices = async () => {
      try {
        // Check if mediaDevices is supported (requires HTTPS or localhost)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.warn(
            "Media devices not supported in this context (likely non-secure HTTP)"
          );
          return;
        }

        // Request permission to access devices
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();

        setAudioInputDevices(
          devices
            .filter((d) => d.kind === "audioinput")
            .map((d) => ({
              deviceId: d.deviceId,
              label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
            }))
        );

        setAudioOutputDevices(
          devices
            .filter((d) => d.kind === "audiooutput")
            .map((d) => ({
              deviceId: d.deviceId,
              label: d.label || `Speaker ${d.deviceId.slice(0, 8)}`,
            }))
        );

        setVideoDevices(
          devices
            .filter((d) => d.kind === "videoinput")
            .map((d) => ({
              deviceId: d.deviceId,
              label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
            }))
        );
      } catch (error) {
        console.error("Failed to enumerate devices:", error);
      }
    };

    loadDevices();
  }, [isOpen]);

  // Load saved settings
  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem("spatialMeetSettings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setMasterVolume(settings.masterVolume ?? 80);
        setMicVolume(settings.micVolume ?? 100);
        setVideoQuality(settings.videoQuality ?? "medium");
        setTheme(settings.theme ?? "system");
        setShowFPS(settings.showFPS ?? false);
        setReducedMotion(settings.reducedMotion ?? false);
        setSelectedAudioInput(settings.audioInput ?? "");
        setSelectedAudioOutput(settings.audioOutput ?? "");
        setSelectedVideoInput(settings.videoInput ?? "");
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    const settings = {
      masterVolume,
      micVolume,
      videoQuality,
      theme,
      showFPS,
      reducedMotion,
      audioInput: selectedAudioInput,
      audioOutput: selectedAudioOutput,
      videoInput: selectedVideoInput,
    };
    localStorage.setItem("spatialMeetSettings", JSON.stringify(settings));

    // Dispatch event for other components to react
    window.dispatchEvent(
      new CustomEvent("settingsChanged", { detail: settings })
    );

    onClose();
  }, [
    masterVolume,
    micVolume,
    videoQuality,
    theme,
    showFPS,
    reducedMotion,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    onClose,
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white border-2 border-gray-800 rounded-2xl shadow-retro max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200">
          <h2 className="font-pixel text-2xl text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-gray-200">
          {[
            { id: "audio", icon: Volume2, label: "Audio" },
            { id: "video", icon: Video, label: "Video" },
            { id: "general", icon: Monitor, label: "General" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-pixel text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600 border-b-2 border-indigo-500 -mb-[2px] bg-indigo-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {activeTab === "audio" && (
            <div className="space-y-6">
              {/* Microphone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Mic className="w-4 h-4" />
                  Microphone
                </label>
                <select
                  value={selectedAudioInput}
                  onChange={(e) => setSelectedAudioInput(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
                >
                  <option value="">Default</option>
                  {audioInputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mic Volume */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Microphone Volume</span>
                  <span className="font-pixel text-indigo-600">
                    {micVolume}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={micVolume}
                  onChange={(e) => setMicVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Speaker */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Volume2 className="w-4 h-4" />
                  Speaker
                </label>
                <select
                  value={selectedAudioOutput}
                  onChange={(e) => setSelectedAudioOutput(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
                >
                  <option value="">Default</option>
                  {audioOutputDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Volume */}
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Master Volume</span>
                  <span className="font-pixel text-indigo-600">
                    {masterVolume}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === "video" && (
            <div className="space-y-6">
              {/* Camera */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Video className="w-4 h-4" />
                  Camera
                </label>
                <select
                  value={selectedVideoInput}
                  onChange={(e) => setSelectedVideoInput(e.target.value)}
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none"
                >
                  <option value="">Default</option>
                  {videoDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Video Quality */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Video Quality
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((quality) => (
                    <button
                      key={quality}
                      onClick={() => setVideoQuality(quality)}
                      className={`p-3 rounded-xl border-2 font-pixel text-sm capitalize transition-all ${
                        videoQuality === quality
                          ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {quality}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {videoQuality === "low" && "360p - Best for slow connections"}
                  {videoQuality === "medium" &&
                    "480p - Balanced quality and speed"}
                  {videoQuality === "high" &&
                    "720p - Best quality, requires fast internet"}
                </p>
              </div>
            </div>
          )}

          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", icon: Sun, label: "Light" },
                    { id: "dark", icon: Moon, label: "Dark" },
                    { id: "system", icon: Monitor, label: "System" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as typeof theme)}
                      className={`p-3 rounded-xl border-2 font-pixel text-sm flex flex-col items-center gap-1 transition-all ${
                        theme === t.id
                          ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <t.icon className="w-5 h-5" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Gamepad2 className="w-4 h-4" />
                    Show FPS Counter
                  </span>
                  <button
                    onClick={() => setShowFPS(!showFPS)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      showFPS ? "bg-indigo-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        showFPS ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="w-4 h-4" />
                    Reduced Motion
                  </span>
                  <button
                    onClick={() => setReducedMotion(!reducedMotion)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      reducedMotion ? "bg-indigo-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        reducedMotion ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t-2 border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-pixel text-sm"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl border-2 border-indigo-600 shadow-retro hover:-translate-y-1 active:translate-y-0 transition-all font-pixel text-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
