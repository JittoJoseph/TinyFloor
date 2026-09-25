import { MessageSquare, Phone } from "lucide-react";
import { Face } from "@/components/ui/Face";

/** The app's card beside someone you've walked up to, as the site draws it: who, a message, and the call. */
export function NearbyBar({ name, seed, labels }: { name: string; seed: string; labels: { call: string; message: string } }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-card p-1.5 font-(family-name:--font-app) shadow-float [--face-ring:var(--ui-card)]">
      <Face seed={seed} size={30} presence="available" />
      <span className="pe-1 text-[13px] font-semibold text-foreground">{name}</span>
      <span title={labels.message} className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-foreground">
        <MessageSquare className="size-3.5" />
      </span>
      <span className="flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-semibold text-background">
        <Phone className="size-3.5" strokeWidth={2.25} />
        {labels.call}
      </span>
    </div>
  );
}
