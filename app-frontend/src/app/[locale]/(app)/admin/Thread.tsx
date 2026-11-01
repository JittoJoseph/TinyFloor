"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, X } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "@/components/ui/Face";
import { Logo } from "@/components/app/Logo";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { api, type AdminHelpDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { DialogButton, useRun, When } from "./pieces";

/*
 * A conversation with the team, as the team has it: the parts the Inbox and
 * an office's page both make theirs from. Reading it (useTicket) is what
 * marks it read; what's been said (Messages), the team's next words (Reply),
 * and closing it (CloseTicket).
 */

/** A ticket read, and read again whenever `again` changes (the list says something moved); null for none. */
export function useTicket(id: string | null, again?: unknown) {
  const [detail, setDetail] = useState<AdminHelpDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api.adminHelpTicket(id).then(
      (next) => live && setDetail(next),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, again, round]);
  const current = detail && detail.ticket.id === id ? detail : null;
  return { detail: current, failed, reload: useCallback(() => setRound((n) => n + 1), []), setDetail };
}

/** What's been said, the team's words on the right; `fresh` of theirs marked new. Kept scrolled to the latest. */
export function Messages({ messages, fresh = 0, empty }: { messages: AdminHelpDetail["messages"]; fresh?: number; empty?: React.ReactNode }) {
  const end = useRef<HTMLLIElement>(null);
  const last = messages.at(-1)?.id;
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [last]);
  const theirs = new Set(fresh > 0 ? messages.filter((one) => !one.team).slice(-fresh).map((one) => one.id) : []);
  if (!messages.length) return <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">{empty}</div>;
  return (
    <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-6">
      {messages.map((message) => (
        <li key={message.id} className={cn("flex items-end gap-2.5", message.team && "flex-row-reverse")}>
          {message.team ? <Logo size={28} className="shrink-0" /> : <Face seed={message.author ?? message.name} size={28} />}
          <div className={cn("flex max-w-[min(34rem,85%)] flex-col", message.team && "items-end")}>
            <p className="mb-1 flex items-baseline gap-2 px-1 text-[11.5px] text-faint">
              <span className="font-medium text-muted-foreground">{message.name}</span>
              <When at={message.at} />
              {theirs.has(message.id) && <span className="font-semibold text-foreground">New</span>}
            </p>
            <p
              dir="auto"
              className={cn(
                "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.5]",
                message.team ? "rounded-ee-md bg-foreground text-background" : "rounded-es-md bg-muted text-foreground",
              )}
            >
              {message.body}
            </p>
          </div>
        </li>
      ))}
      <li ref={end} aria-hidden />
    </ol>
  );
}

/** The team's next words. Ctrl+Enter sends; what was typed clears only once it's sent. */
export function Reply({ placeholder, note, send }: { placeholder: string; note: string; send: (text: string) => Promise<unknown> }) {
  const [text, setText] = useState("");
  const { busy, error, run } = useRun();
  const go = async () => {
    const body = text.trim();
    if (!body || busy) return;
    if (await run(() => send(body))) setText("");
  };
  return (
    <form
      className="shrink-0 border-t border-border p-3 md:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void go();
      }}
    >
      <div className="rounded-2xl border border-border bg-background focus-within:border-border-strong">
        <textarea
          value={text}
          rows={Math.min(8, Math.max(2, text.split("\n").length))}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void go();
            }
          }}
          placeholder={placeholder}
          className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[16px] outline-none placeholder:text-faint sm:text-[13.5px]"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1">
          <span className={cn("text-[11.5px]", error ? "text-destructive" : "text-faint")}>{error ?? note}</span>
          <button type="submit" disabled={busy || !text.trim()} className="h-8 shrink-0 cursor-pointer rounded-full bg-foreground px-4 text-[12.5px] font-medium text-background disabled:opacity-40">
            Send
          </button>
        </div>
      </div>
    </form>
  );
}

/** Closing a ticket, behind a menu and a question: it leaves their Chat, and their next message starts a new one. */
export function CloseTicket({ id, whose, onClosed }: { id: string; whose: string; onClosed: () => void }) {
  const [asking, setAsking] = useState(false);
  const { busy, error, run } = useRun();
  return (
    <>
      <Menu align="end" width={180} trigger={<IconButton label="More" size="sm" tone="soft" icon={<MoreHorizontal />} />}>
        <MenuItem danger icon={<X />} onSelect={() => setAsking(true)}>
          Close conversation
        </MenuItem>
      </Menu>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        title="Close this conversation?"
        description={`It leaves ${whose} Chat, and the next message from there starts a new one. You can still read it under Closed.`}
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={() => setAsking(false)}>Cancel</DialogButton>
            <DialogButton
              danger
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => api.adminHelpClose(id)))) return;
                setAsking(false);
                onClosed();
              }}
            >
              Close conversation
            </DialogButton>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </>
  );
}
