"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { MEETING_NAME_MAX } from "@shared/messages";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/motion/button/base";
import { Face } from "@/components/ui/Face";
import { useFloor } from "@/lib/floor";
import { meetingOf, useMeetings } from "@/lib/meetings";
import { useAuth } from "@/contexts/AuthContext";
import { callManager } from "@/lib/CallManager";
import { cn } from "@/lib/utils";
import { useOffice } from "@/components/app/OfficeShell";

/**
 * Who you can ask into a meeting: your office's people who are on the floor
 * now, since only someone here can hear the ask. Whoever is already in this
 * meeting isn't offered; someone in another meeting is, marked as such.
 */
function PeoplePicker({
  picked,
  onToggle,
  exclude,
}: {
  picked: Set<string>;
  onToggle: (id: string) => void;
  exclude?: string;
}) {
  const t = useTranslations("meetings");
  const { members } = useOffice();
  const { user } = useAuth();
  const floor = useFloor();
  const { meetings } = useMeetings();
  const here = new Set(floor.map((one) => one.id));
  const people = members
    .filter((member) => member.id !== user?.id && here.has(member.id))
    .filter((member) => !exclude || meetingOf(member.id, meetings)?.id !== exclude);

  if (!people.length) {
    return <p className="rounded-2xl bg-muted px-4 py-3 text-[13px] text-muted-foreground">{t("nobodyToAsk")}</p>;
  }
  return (
    <ul className="grid max-h-64 gap-1 overflow-y-auto">
      {people.map((person) => {
        const on = picked.has(person.id);
        const busy = meetingOf(person.id, meetings);
        return (
          <li key={person.id}>
            <button
              type="button"
              onClick={() => onToggle(person.id)}
              aria-pressed={on}
              className={cn(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/60 [--face-ring:var(--ui-card)]",
                on && "bg-muted",
              )}
            >
              <Face seed={person.id} size={32} presence="available" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13.5px] font-medium text-foreground">{person.displayName}</span>
                {busy && <span className="block truncate text-[12px] text-muted-foreground">{t("inAnotherMeeting")}</span>}
              </span>
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  on ? "border-foreground bg-foreground text-background" : "border-border-strong",
                )}
              >
                {on && <Check className="size-3" strokeWidth={3} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Starts a meeting of your own: a name if you like, and who to ask in. */
export function NewMeetingDialog({ open, onClose, onStarted }: { open: boolean; onClose: () => void; onStarted: () => void }) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const start = () => {
    callManager.startMeeting(name.trim(), [...picked]);
    setName("");
    setPicked(new Set());
    onStarted();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("newTitle")}
      description={t("newBody")}
      closeLabel={tc("close")}
      footer={
        <>
          <Button variant="ghost" size="sm" className="h-10 px-4" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button size="sm" className="h-10 px-5" onClick={start}>
            {picked.size ? t("startAndAsk", { count: picked.size }) : t("start")}
          </Button>
        </>
      }
    >
      <label className="block text-[12.5px] font-medium text-muted-foreground" htmlFor="meeting-name">
        {t("nameLabel")}
      </label>
      <input
        id="meeting-name"
        value={name}
        maxLength={MEETING_NAME_MAX}
        autoComplete="off"
        placeholder={t("namePlaceholder")}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && start()}
        className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-[14px] text-foreground outline-none placeholder:text-faint focus:border-foreground/40"
      />
      <p className="mb-2 mt-4 text-[12.5px] font-medium text-muted-foreground">{t("askLabel")}</p>
      <PeoplePicker picked={picked} onToggle={toggle} />
    </Dialog>
  );
}

/** Asks more people into the meeting you are in. */
export function InviteDialog({ open, onClose, meeting }: { open: boolean; onClose: () => void; meeting: string }) {
  const t = useTranslations("meetings");
  const tc = useTranslations("common");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("inviteTitle")}
      description={t("inviteBody")}
      closeLabel={tc("close")}
      footer={
        <>
          <Button variant="ghost" size="sm" className="h-10 px-4" onClick={onClose}>
            {tc("cancel")}
          </Button>
          <Button
            size="sm"
            className="h-10 px-5"
            disabled={!picked.size}
            onClick={() => {
              callManager.inviteToMeeting([...picked]);
              setPicked(new Set());
              onClose();
            }}
          >
            {t("ask", { count: picked.size })}
          </Button>
        </>
      }
    >
      <PeoplePicker picked={picked} onToggle={toggle} exclude={meeting} />
    </Dialog>
  );
}
