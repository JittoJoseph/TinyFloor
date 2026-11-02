"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Pencil, Trash2, X } from "@/components/ui/icons";
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
 * an office's page both make theirs from. Having it on screen (useTicket) is
 * what marks it read; what's been said (Messages), with where what's new starts,
 * who has read how far, and the team's own words to change or take back;
 * the team's next words (Reply); and closing it (CloseTicket).
 */

/**
 * A ticket read, and read again whenever `again` changes (the list says
 * something moved); null for none. Shown, it's marked read to its latest
 * message, after the look that says where what's new started.
 */
export function useTicket(id: string | null, again?: unknown) {
  const [detail, setDetail] = useState<AdminHelpDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!id) return;
    let live = true;
    api.adminHelpTicket(id).then(
      async (next) => {
        if (!live) return;
        if ((next.messages.at(-1)?.id ?? 0) > next.seenBefore) await api.adminHelpRead(id).catch(() => undefined);
        if (live) setDetail(next);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, again, round]);
  const current = detail && detail.ticket.id === id ? detail : null;
  return { detail: current, failed, reload: useCallback(() => setRound((n) => n + 1), []), setDetail };
}

/**
 * What's been said, the team's words on the right, kept scrolled to the
 * latest. A line marks where what's new from them starts (as it was when
 * the ticket was opened, so it stays while it's on screen); each person's
 * face sits under the last message they've read, and the team's latest
 * says so while nobody has. The team's own messages can be changed or
 * taken back, from a menu beside each.
 */
export function Messages({
  ticketId,
  messages,
  seenBefore,
  reads = [],
  onChanged,
  empty,
}: {
  ticketId?: string | null;
  messages: AdminHelpDetail["messages"];
  seenBefore?: number;
  reads?: AdminHelpDetail["reads"];
  onChanged?: () => void;
  empty?: React.ReactNode;
}) {
  const end = useRef<HTMLLIElement>(null);
  const last = messages.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [last]);
  // Where what's new started when this ticket was first read here; later reads don't move it.
  const [mark, setMark] = useState<{ ticket: string; from: number } | null>(null);
  if (ticketId && seenBefore !== undefined && mark?.ticket !== ticketId) setMark({ ticket: ticketId, from: seenBefore });
  const firstNew = mark ? messages.find((one) => !one.team && one.id > mark.from)?.id : undefined;

  // Each reader under the last message they've seen; not under their own, which says nothing.
  const seenAt = new Map<number, AdminHelpDetail["reads"]>();
  for (const reader of reads) {
    const at = messages.findLast((one) => one.id <= reader.seen);
    if (at && at.author !== reader.id) seenAt.set(at.id, [...(seenAt.get(at.id) ?? []), reader]);
  }
  const lastTeam = messages.findLast((one) => one.team);
  const unseen = !!lastTeam && !reads.some((reader) => reader.seen >= lastTeam.id);

  if (!messages.length) return <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center">{empty}</div>;
  return (
    <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-6">
      {messages.map((message) => (
        <li key={message.id}>
          {message.id === firstNew && <NewLine />}
          <Said message={message} ticketId={ticketId ?? null} onChanged={onChanged} />
          {(seenAt.has(message.id) || (unseen && message.id === lastTeam?.id)) && (
            <Seen readers={seenAt.get(message.id) ?? []} team={message.team} />
          )}
        </li>
      ))}
      <li ref={end} aria-hidden />
    </ol>
  );
}

/** Where what's new from them starts, the way Chat marks it. */
function NewLine() {
  return (
    <div className="mb-4 flex items-center gap-2" role="separator">
      <span className="h-px flex-1 bg-brand/60" />
      <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">New</span>
    </div>
  );
}

/** Who has read up to here, as their faces; under the team's latest, "Not seen yet" while nobody has. */
function Seen({ readers, team }: { readers: AdminHelpDetail["reads"]; team: boolean }) {
  return (
    <div className={cn("mt-1.5 flex items-center gap-1 text-[11px] text-faint", team ? "justify-end pe-[38px]" : "ps-[38px]")}>
      {readers.length ? (
        <span className="flex -space-x-1" title={`Seen by ${readers.map((one) => one.name).join(", ")}`}>
          {readers.map((one) => (
            <Face key={one.id} seed={one.id} size={16} />
          ))}
        </span>
      ) : (
        "Not seen yet"
      )}
    </div>
  );
}

/** One message; the team's own with a menu to change or take it back, and a box in its place while it's changed. */
function Said({ message, ticketId, onChanged }: { message: AdminHelpDetail["messages"][number]; ticketId: string | null; onChanged?: () => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { busy, error, run, clear } = useRun();
  const ours = message.team && !!ticketId && !!onChanged;
  const save = async () => {
    const body = editing?.trim();
    if (!body || busy) return;
    if (body === message.body) return setEditing(null);
    if (await run(() => api.adminHelpEdit(ticketId!, message.id, body))) {
      setEditing(null);
      onChanged!();
    }
  };
  return (
    <div className={cn("group flex items-end gap-2.5", message.team && "flex-row-reverse")}>
      {message.team ? <Logo size={28} className="shrink-0" /> : <Face seed={message.author ?? message.name} size={28} />}
      <div className={cn("flex max-w-[min(34rem,85%)] flex-col", message.team && "items-end", editing !== null && "w-full")}>
        <p className="mb-1 flex items-baseline gap-2 px-1 text-[11.5px] text-faint">
          <span className="font-medium text-muted-foreground">{message.name}</span>
          <When at={message.at} />
        </p>
        {editing !== null ? (
          <div className="w-full rounded-2xl border border-border-strong bg-background">
            <textarea
              autoFocus
              value={editing}
              rows={Math.min(8, Math.max(2, editing.split("\n").length))}
              onChange={(event) => setEditing(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(null);
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void save();
                }
              }}
              className="block w-full resize-none bg-transparent px-3.5 pt-2.5 text-[16px] outline-none sm:text-[13.5px]"
            />
            <div className="flex items-center justify-end gap-1.5 px-2.5 pb-2.5 pt-1">
              {error && <span className="me-auto ps-1 text-[11.5px] text-destructive">{error}</span>}
              <button type="button" onClick={() => setEditing(null)} className="h-7 cursor-pointer rounded-full px-3 text-[12px] font-medium hover:bg-muted">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !editing.trim()}
                onClick={() => void save()}
                className="h-7 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p
            dir="auto"
            className={cn(
              "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.5]",
              message.team ? "rounded-ee-md bg-foreground text-background" : "rounded-es-md bg-muted text-foreground",
            )}
          >
            {message.body}
          </p>
        )}
      </div>
      {ours && editing === null && (
        <span className="mb-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
          <Menu align="end" width={168} trigger={<IconButton label="Message actions" size="sm" icon={<MoreHorizontal />} />}>
            <MenuItem
              icon={<Pencil />}
              onSelect={() => {
                clear();
                setEditing(message.body);
              }}
            >
              Edit
            </MenuItem>
            <MenuItem
              danger
              icon={<Trash2 />}
              onSelect={() => {
                clear();
                setDeleting(true);
              }}
            >
              Delete
            </MenuItem>
          </Menu>
        </span>
      )}
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Delete this message?"
        description="It goes from their Chat too, and from what's new there."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={() => setDeleting(false)}>Cancel</DialogButton>
            <DialogButton
              danger
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => api.adminHelpDelete(ticketId!, message.id)))) return;
                setDeleting(false);
                onChanged!();
              }}
            >
              Delete
            </DialogButton>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </div>
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
