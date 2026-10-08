import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";

/** On the way into a place, before the shell has what it needs. */
export function Entering({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-h-dvh items-center justify-center bg-background text-muted-foreground", className)}>
      <Loader variant="dots" size={20} />
    </div>
  );
}
