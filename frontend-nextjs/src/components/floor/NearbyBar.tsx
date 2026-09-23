import type { ReactNode } from "react";
import { MessageSquare, Mic, Video } from "lucide-react";
import { Face } from "@/components/ui/Face";

/** The app's bar beside someone you've walked up to: who, and the ways to talk. `call` is laid over the video button, for a pointer pressing it. */
export function NearbyBar({ name, seed, labels, call }: { name: string; seed: string; labels: { video: string; audio: string; message: string }; call?: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card p-1.5 pe-2 font-(family-name:--font-app) shadow-float [--face-ring:var(--ui-card)]">
      <Face seed={seed} size={26} presence="available" />
      <span className="px-0.5 text-[12px] font-semibold text-foreground">{name}</span>
      <span title={labels.video} className="relative flex size-7 items-center justify-center rounded-full bg-foreground text-background">
        <Video className="size-3.5" />
        {call}
      </span>
      <span title={labels.audio} className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <Mic className="size-3.5" />
      </span>
      <span title={labels.message} className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <MessageSquare className="size-3.5" />
      </span>
    </div>
  );
}
