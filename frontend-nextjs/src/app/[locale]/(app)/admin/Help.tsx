"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { api, type AdminHelpMessage, type AdminHelpThread, type AdminPage } from "@/lib/api";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";
import { When } from "./when";

type Show = "waiting" | "all";

/**
 * Help and feedback (docs/19), as the team sees it: each office's
 * conversation (and each demo office visitor's), with who said what, from
 * which page and browser, and a link to the recording. An answer turns up in
 * their Help and feedback as something new. Waiting on us: the last word is
 * theirs and it isn't marked done.
 */
export function Help({ onWaiting }: { onWaiting: (count: number) => void }) {
  const [show, setShow] = useState<Show>("waiting");
  const [page, setPage] = useState(0);
  const [list, setList] = useState<(AdminPage & { threads: AdminHelpThread[] }) | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const next = await api.adminHelp({ show, page });
      setList(next);
      if (show === "waiting") onWaiting(next.total);
    } catch {
      setError("Couldn't load the conversations.");
    }
  }, [show, page, onWaiting]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pages = list ? Math.ceil(list.total / list.pageSize) : 0;

  return (
    <section>
      <div className="flex gap-1.5">
        {(
          [
            ["waiting", "Waiting on us"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setShow(key);
              setPage(0);
              setList(null);
            }}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
              key === show ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-border-strong",
            )}
          >
            {label}
            {key === show && list && <span className="tabular-nums text-background/60">{list.total}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list === null ? (
          <div className="flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
            <Loader variant="dots" size={18} />
          </div>
        ) : list.threads.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
            {show === "waiting" ? "Nobody's waiting. All caught up." : "Nobody has written yet."}
          </p>
        ) : (
          list.threads.map((thread) => <Conversation key={thread.id} thread={thread} onChanged={load} />)
        )}
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[13px]">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-8 cursor-pointer rounded-full bg-muted px-3.5 disabled:opacity-40">
            Newer
          </button>
          <span className="tabular-nums text-muted-foreground">
            {page + 1} of {pages}
          </span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="h-8 cursor-pointer rounded-full bg-muted px-3.5 disabled:opacity-40">
            Older
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}

function Conversation({ thread, onChanged }: { thread: AdminHelpThread; onChanged: () => Promise<void> }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const text = reply.trim();
  const lobby = !thread.officeId && thread.place === "Demo office";

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await work();
      setReply("");
      await onChanged();
    } catch {
      setError("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const answer = (done: boolean) =>
    run(async () => {
      if (text) await api.adminHelpReply(thread.id, text);
      if (done) await api.adminHelpStatus(thread.id, "done");
    });

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3">
        <Face seed={thread.officeId ?? thread.id} size={30} square={!lobby} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">
            {thread.place}
            {lobby && <span className="ms-2 font-normal text-muted-foreground">{thread.messages.find((one) => !one.team)?.name}</span>}
            {!thread.officeId && !lobby && <span className="ms-2 font-normal text-faint">(office closed)</span>}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            Started <When at={thread.createdAt} /> · last <When at={thread.updatedAt} />
          </p>
        </div>
        {thread.waiting && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">Waiting on us</span>}
        {thread.status === "done" && <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">Done</span>}
      </header>

      <div className="space-y-3 p-4">
        <ol className="space-y-2.5">
          {thread.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </ol>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void answer(false);
          }}
        >
          <textarea
            value={reply}
            rows={Math.min(8, Math.max(2, reply.split("\n").length))}
            onChange={(event) => setReply(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void answer(false);
              }
            }}
            placeholder={`Reply to ${lobby ? "them" : `everyone in ${thread.place}`}. Ctrl+Enter sends.`}
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-foreground/35 sm:text-[13.5px]"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button type="submit" disabled={busy || !text} className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background disabled:opacity-40">
              Reply
            </button>
            {thread.status === "open" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void answer(true)}
                className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
              >
                {text ? "Reply and mark done" : "Mark done"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(() => api.adminHelpStatus(thread.id, "open"))}
                className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
              >
                Not done
              </button>
            )}
          </div>
          {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
        </form>
      </div>
    </article>
  );
}

/** One message: the team's on the right; theirs with who wrote it and, under it, where from. */
function Message({ message }: { message: AdminHelpMessage }) {
  const context = [
    message.userAgent && browserOf(message.userAgent),
    message.screen,
    message.locale,
    message.country,
  ].filter(Boolean);
  return (
    <li className={cn("flex flex-col", message.team ? "items-end" : "items-start")}>
      <p className="mb-1 px-1 text-[11.5px] text-muted-foreground">
        <span className={cn("font-semibold", message.team ? "text-brand" : "text-foreground")}>{message.name}</span>
        {message.email && (
          <a href={`mailto:${message.email}`} className="ms-1.5 hover:text-foreground">
            {message.email}
          </a>
        )}
        {" · "}
        <When at={message.at} />
      </p>
      <p
        dir="auto"
        className={cn(
          "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-[13.5px] leading-[1.5]",
          message.team ? "bg-brand/[0.1]" : "bg-muted",
        )}
      >
        {message.body}
      </p>
      {!message.team && (context.length > 0 || message.page || message.replay) && (
        <p className="mt-1 flex max-w-[85%] flex-wrap items-center gap-x-2 gap-y-0.5 px-1 text-[11.5px] text-faint">
          {context.length > 0 && <span title={message.userAgent ?? undefined}>{context.join(" · ")}</span>}
          {message.page && <code className="break-all">{message.page}</code>}
          {message.replay && (
            <a href={message.replay} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground">
              Recording
              <ExternalLink className="size-3" />
            </a>
          )}
        </p>
      )}
    </li>
  );
}

/** "Chrome on Windows" from a user agent; the whole string is on hover. */
function browserOf(agent: string): string {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\/|Opera/.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "A browser";
  const system = /Windows/.test(agent)
    ? "Windows"
    : /iPhone|iPad/.test(agent)
      ? "iOS"
      : /Android/.test(agent)
        ? "Android"
        : /Mac OS X/.test(agent)
          ? "macOS"
          : /CrOS/.test(agent)
            ? "ChromeOS"
            : /Linux/.test(agent)
              ? "Linux"
              : null;
  return system ? `${browser} on ${system}` : browser;
}
