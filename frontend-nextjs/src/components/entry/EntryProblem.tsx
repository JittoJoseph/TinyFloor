import type { ReactNode } from "react";
import { Unlink } from "lucide-react";

/** A door that does not open: what happened, and the one place to go instead. */
export function EntryProblem({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="entry-rise">
      <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Unlink className="size-5" />
      </span>
      <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
      <p className="mb-6 mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
