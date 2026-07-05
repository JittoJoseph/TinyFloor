"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Mic, Video, Volume2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

type Tab = "audio" | "video";

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("audio");
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDevice[]>(
    [],
  );
  const [videoDevices, setVideoDevices] = useState<MediaDevice[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");
  const [selectedVideoInput, setSelectedVideoInput] = useState("");
  const [masterVolume, setMasterVolume] = useState(80);
  const [micVolume, setMicVolume] = useState(100);
  const [videoQuality, setVideoQuality] = useState<"low" | "medium" | "high">(
    "medium",
  );

  useEffect(() => {
    if (!isOpen) return;
    const loadDevices = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const map = (kind: string, fallback: string): MediaDevice[] =>
          devices
            .filter((d) => d.kind === kind)
            .map((d) => ({
              deviceId: d.deviceId,
              label: d.label || `${fallback} ${d.deviceId.slice(0, 6)}`,
            }));
        setAudioInputDevices(map("audioinput", "Microphone"));
        setAudioOutputDevices(map("audiooutput", "Speaker"));
        setVideoDevices(map("videoinput", "Camera"));
      } catch {
        // Permission denied or no devices — silently ignore
      }
    };
    loadDevices();
  }, [isOpen]);

  useEffect(() => {
    const saved = localStorage.getItem("spacialMeetSettings");
    if (!saved) return;
    try {
      const s = JSON.parse(saved);
      if (s.masterVolume != null) setMasterVolume(s.masterVolume);
      if (s.micVolume != null) setMicVolume(s.micVolume);
      if (s.videoQuality) setVideoQuality(s.videoQuality);
      if (s.audioInput) setSelectedAudioInput(s.audioInput);
      if (s.audioOutput) setSelectedAudioOutput(s.audioOutput);
      if (s.videoInput) setSelectedVideoInput(s.videoInput);
    } catch {}
  }, []);

  const saveSettings = useCallback(() => {
    const settings = {
      masterVolume,
      micVolume,
      videoQuality,
      audioInput: selectedAudioInput,
      audioOutput: selectedAudioOutput,
      videoInput: selectedVideoInput,
    };
    localStorage.setItem("spacialMeetSettings", JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent("settingsChanged", { detail: settings }),
    );
    onClose();
  }, [
    masterVolume,
    micVolume,
    videoQuality,
    selectedAudioInput,
    selectedAudioOutput,
    selectedVideoInput,
    onClose,
  ]);

  if (!isOpen) return null;

  const tabs: { id: Tab; icon: typeof Mic; label: string }[] = [
    { id: "audio", icon: Mic, label: "Audio" },
    { id: "video", icon: Video, label: "Video" },
  ];

  const videoQualityMeta = {
    low: "360p — best for slow connections",
    medium: "480p — balanced quality and speed",
    high: "720p — best quality, requires fast internet",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-3xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(0,0,0,0.04)]">
          <h2 className="font-semibold text-[var(--color-braun-text)] text-base tracking-wide">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="cursor-pointer p-1.5 hover:bg-[rgba(0,0,0,0.04)] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-1">
          {tabs.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-[var(--color-braun-text)] text-white"
                  : "text-[var(--color-braun-text)] opacity-50 hover:opacity-80 hover:bg-[rgba(0,0,0,0.04)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {activeTab === "audio" && (
            <>
              <SettingRow label="Microphone" icon={Mic}>
                <DeviceSelect
                  value={selectedAudioInput}
                  onChange={setSelectedAudioInput}
                  devices={audioInputDevices}
                />
              </SettingRow>

              <SettingRow label="Microphone volume" value={`${micVolume}%`}>
                <VolumeSlider value={micVolume} onChange={setMicVolume} />
              </SettingRow>

              <SettingRow label="Speaker" icon={Volume2}>
                <DeviceSelect
                  value={selectedAudioOutput}
                  onChange={setSelectedAudioOutput}
                  devices={audioOutputDevices}
                />
              </SettingRow>

              <SettingRow label="Speaker volume" value={`${masterVolume}%`}>
                <VolumeSlider value={masterVolume} onChange={setMasterVolume} />
              </SettingRow>
            </>
          )}

          {activeTab === "video" && (
            <>
              <SettingRow label="Camera" icon={Video}>
                <DeviceSelect
                  value={selectedVideoInput}
                  onChange={setSelectedVideoInput}
                  devices={videoDevices}
                />
              </SettingRow>

              <div>
                <p className="text-xs font-medium text-[var(--color-braun-text)] opacity-50 uppercase tracking-widest mb-3">
                  Video quality
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(["low", "medium", "high"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setVideoQuality(q)}
                      className={`py-2.5 rounded-xl border text-sm font-medium capitalize transition-all cursor-pointer ${
                        videoQuality === q
                          ? "border-[var(--color-braun-text)] bg-[var(--color-braun-text)] text-white"
                          : "border-[rgba(0,0,0,0.08)] text-[var(--color-braun-text)] opacity-60 hover:opacity-100 hover:border-[rgba(0,0,0,0.2)]"
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-braun-text)] opacity-40 mt-2">
                  {videoQualityMeta[videoQuality]}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(0,0,0,0.04)] bg-white/40">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-sm text-[var(--color-braun-text)] opacity-50 hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            className="cursor-pointer px-5 py-2 bg-[var(--color-braun-text)] hover:bg-[#2a2a2a] text-white rounded-full text-sm font-medium transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  icon: Icon,
  value,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-braun-text)] opacity-50 uppercase tracking-widest">
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
        </label>
        {value && (
          <span className="text-xs font-semibold text-[var(--color-braun-text)]">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function DeviceSelect({
  value,
  onChange,
  devices,
}: {
  value: string;
  onChange: (v: string) => void;
  devices: MediaDevice[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors cursor-pointer"
    >
      <option value="">Default</option>
      {devices.map((d) => (
        <option key={d.deviceId} value={d.deviceId}>
          {d.label}
        </option>
      ))}
    </select>
  );
}

function VolumeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
      style={{
        background: `linear-gradient(to right, var(--color-braun-text) ${value}%, rgba(0,0,0,0.1) ${value}%)`,
      }}
    />
  );
}
