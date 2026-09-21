"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Mic, Video } from "lucide-react";
import { savedDevices, saveDevices } from "@/lib/media";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/motion/button/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";

interface MediaDevice {
  deviceId: string;
  label: string;
}

/** The value a select can hold for "whatever the browser picks". */
const DEFAULT = "default";

export default function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <DevicesDialog open={isOpen} onClose={onClose} />;
}

/**
 * Which microphone and camera to use. Video quality isn't a choice here: each
 * card asks for what it can show (see lib/media.ts).
 */
function DevicesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const ts = useTranslations("shell");
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [audio, setAudio] = useState(DEFAULT);
  const [video, setVideo] = useState(DEFAULT);

  // Each time it opens: what was saved, and the devices plugged in now.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const saved = savedDevices();
    queueMicrotask(() => {
      if (cancelled) return;
      setAudio(saved.audio ?? DEFAULT);
      setVideo(saved.video ?? DEFAULT);
    });
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
          devices
            .filter((device) => device.kind === kind && device.deviceId && device.deviceId !== DEFAULT)
            .map(({ deviceId, label }) => ({ deviceId, label }));
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
  }, [open]);

  const save = () => {
    saveDevices({ audio: audio === DEFAULT ? undefined : audio, video: video === DEFAULT ? undefined : video });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={ts("devices")}
      description={t("description")}
      closeLabel={t("close")}
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button size="md" onClick={save}>
            {tc("save")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <DeviceRow label={t("microphone")} icon={Mic} value={audio} onChange={setAudio} devices={microphones} defaultLabel={t("default")} />
        <DeviceRow label={t("camera")} icon={Video} value={video} onChange={setVideo} devices={cameras} defaultLabel={t("default")} />
      </div>
    </Dialog>
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
      <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 bg-background text-[13px]">
          <SelectValue className="truncate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>{defaultLabel}</SelectItem>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `${label} ${device.deviceId.slice(0, 6)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
