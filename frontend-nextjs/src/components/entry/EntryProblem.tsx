import type { ReactNode } from "react";
import { Unlink } from "lucide-react";
import { EntryHeader } from "./EntryShell";

/** A door that does not open: what happened, and the one place to go instead. */
export function EntryProblem({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <div className="entry-rise">
      <EntryHeader
        mark={
          <span className="flex size-12 items-center justify-center rounded-[30%] bg-muted text-muted-foreground">
            <Unlink className="size-5" />
          </span>
        }
        title={title}
        subtitle={body}
      />
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
