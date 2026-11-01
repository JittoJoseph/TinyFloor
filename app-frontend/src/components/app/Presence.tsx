"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { setMyStatus, useMyNote, useMyStatus } from "@/lib/floor";
import type { PlayerStatus } from "@/lib/types";
import { MenuExpand, MenuFold } from "@/components/ui/MenuViews";
import { cn } from "@/lib/utils";
import { NoteOptions, NoteRow } from "./StatusNote";

const STATUSES: Array<Exclude<PlayerStatus, "in_call" | "offline">> = ["available", "busy", "away"];
const STATUS_DOT: Record<string, string> = { available: "bg-ok", busy: "bg-destructive", away: "bg-warn", in_call: "bg-violet-500" };

/**
 * How your team sees you, wherever you set it (the floor's dock, and the
 * account menu of the presence strip under Chat and Settings): your status
 * in one press (a call sets its own), and your note, a row opening its
 * choices beneath it while the status steps aside. Music is the account
 * menu's (YouMenu).
 */
export function PresenceControls() {
  const t = useTranslations("shell");
  const tStatus = useTranslations("status");
  // A guest has no note: it's kept with an account.
  const { isGuest } = useAuth();
  const status = useMyStatus();
  const note = useMyNote();
  const [open, setOpen] = useState(false);
  const inCall = status === "in_call";

  return (
    <>
      <MenuFold shown={!open}>
        <div className="px-0.5 pb-1">
          {inCall ? (
            <p className="flex h-10 items-center gap-2 rounded-[11px] bg-foreground/[0.05] px-3 text-[12.5px] text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full bg-violet-500" />
              {tStatus("in_call.description")}
            </p>
          ) : (
            <div role="radiogroup" aria-label={t("status")} className="grid grid-cols-3 gap-1 rounded-[11px] bg-foreground/[0.05] p-1">
              {STATUSES.map((one) => (
                <button
                  key={one}
                  type="button"
                  role="radio"
                  aria-checked={status === one}
                  title={tStatus(`${one}.description`)}
                  onClick={() => setMyStatus(one)}
                  className={cn(
                    "flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[8px] px-1.5 text-[12.5px] font-medium outline-none transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-ring/60",
                    status === one ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[one])} />
                  <span className="truncate">{tStatus(`${one}.label`)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </MenuFold>
      {!isGuest && (
        <>
          <NoteRow note={note} open={open} onToggle={() => setOpen((now) => !now)} />
          <MenuExpand open={open}>
            <NoteOptions note={note} onDone={() => setOpen(false)} />
          </MenuExpand>
        </>
      )}
    </>
  );
}
