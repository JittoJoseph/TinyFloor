"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, Video, X } from "lucide-react";
import { savedDevices, saveDevices } from "@/lib/media";

interface MediaDevice {
  deviceId: string;
  label: string;
}

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // Mounted only while open, so the saved choices and the device list are read fresh each time.
  if (!isOpen) return null;
  return <SettingsDialog onClose={onClose} />;
}

/**
 * Which microphone and camera to use. Video quality isn't a choice here: each
 * card asks for what it can show (see lib/media.ts).
 */
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [saved] = useState(savedDevices);
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [audio, setAudio] = useState(saved.audio ?? "");
  const [video, setVideo] = useState(saved.video ?? "");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        let devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.every((device) => !device.label)) {
          // Labels stay blank until the browser has granted the devices once.
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          probe.getTracks().forEach((track) => track.stop());
        }
        if (cancelled) return;
        const of = (kind: MediaDeviceKind) =>
          devices.filter((device) => device.kind === kind).map(({ deviceId, label }) => ({ deviceId, label }));
        setMicrophones(of("audioinput"));
        setCameras(of("videoinput"));
      } catch {
        // No permission or no devices: the default ones are used.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = () => {
    saveDevices({ audio: audio || undefined, video: video || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#fbfbf9] border border-[rgba(0,0,0,0.06)] rounded-3xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(0,0,0,0.04)]">
          <h2 className="font-body text-base font-semibold text-[var(--color-braun-text)]">{t("title")}</h2>
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.04] transition-colors duration-150"
          >
            <X className="w-4 h-4 text-[var(--color-braun-text)] opacity-60" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <DeviceRow
            label={t("microphone")}
            icon={Mic}
            value={audio}
            onChange={setAudio}
            devices={microphones}
            defaultLabel={t("default")}
          />
          <DeviceRow
            label={t("camera")}
            icon={Video}
            value={video}
            onChange={setVideo}
            devices={cameras}
            defaultLabel={t("default")}
          />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(0,0,0,0.04)] bg-white/40">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-sm text-[var(--color-braun-text)] opacity-50 hover:opacity-80 transition-opacity"
          >
            {tc("cancel")}
          </button>
          <button
            onClick={save}
            className="cursor-pointer px-5 py-2 bg-[var(--color-braun-text)] hover:bg-[#2a2a2a] text-white rounded-full text-sm font-medium transition-all"
          >
            {tc("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceRow({
  label,
  icon: Icon,
  value,
  onChange,
  devices,
  defaultLabel,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  devices: MediaDevice[];
  defaultLabel: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 mb-2 font-body text-[12px] font-semibold text-[var(--color-braun-text)] opacity-55">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3.5 py-2.5 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl text-sm text-[var(--color-braun-text)] outline-none focus:border-[rgba(0,0,0,0.2)] transition-colors cursor-pointer"
      >
        <option value="">{defaultLabel}</option>
        {devices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `${label} ${device.deviceId.slice(0, 6)}`}
          </option>
        ))}
      </select>
    </div>
  );
}
