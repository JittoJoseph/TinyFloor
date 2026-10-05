"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "@/components/ui/icons";
import { api, type AdminPage, type AdminReport } from "@/lib/api";
import { Face } from "@/components/ui/Face";
import { Loader } from "@/components/motion/loader";
import { cn } from "@/lib/utils";
import { When } from "./when";

/**
 * Help and feedback (docs/19), as the team sees it: what people sent, from
 * which office and page, with their browser and a link to the session's
 * recording; the conversation since; and a reply, which they see in their
 * Help and feedback, and closing it. Open ones waiting on the team say so.
 */
export function Reports({ onOpenCount }: { onOpenCount: (count: number) => void }) {
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [page, setPage] = useState(0);
  const [list, setList] = useState<(AdminPage & { reports: AdminReport[] }) | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const next = await api.adminReports({ status, page });
      setList(next);
      if (status === "open") onOpenCount(next.total);
    } catch {
      setError("Couldn't load the reports.");
    }
  }, [status, page, onOpenCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const pages = list ? Math.ceil(list.total / list.pageSize) : 0;

  return (
    <section>
      <div className="flex gap-1.5">
        {(["open", "closed"] as const).map((one) => (
          <button
            key={one}
            type="button"
            onClick={() => {
              setStatus(one);
              setPage(0);
              setList(null);
            }}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium capitalize transition-colors",
              one === status ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-border-strong",
            )}
          >
            {one}
            {one === status && list && <span className="tabular-nums text-background/60">{list.total}</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list === null ? (
          <div className="flex justify-center rounded-2xl border border-border bg-card py-16 text-muted-foreground">
            <Loader variant="dots" size={18} />
          </div>
        ) : list.reports.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
            {status === "open" ? "Nothing open. All caught up." : "Nothing closed yet."}
          </p>
        ) : (
          list.reports.map((report) => <ReportCard key={report.id} report={report} onChanged={load} />)
        )}
      </div>

      {pages > 1 && list && (
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

function ReportCard({ report, onChanged }: { report: AdminReport; onChanged: () => Promise<void> }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  const text = reply.trim();
  const send = (close: boolean) =>
    run(async () => {
      if (text) await api.adminReplyToReport(report.id, text);
      if (close) await api.adminSetReport(report.id, "closed");
    });

  const context: Array<[string, React.ReactNode]> = [
    ["Page", report.page && <code className="break-all text-[12px]">{report.page}</code>],
    ["Browser", report.userAgent && <span title={report.userAgent}>{browserOf(report.userAgent)}</span>],
    ["Screen", report.screen],
    ["Language", report.locale],
    ["Country", report.country],
    [
      "Recording",
      report.replay && (
        <a href={report.replay} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline">
          Watch in PostHog
          <ExternalLink className="size-3.5" />
        </a>
      ),
    ],
  ];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card [--face-ring:var(--ui-card)]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border px-4 py-3">
        <Face seed={report.userId ?? report.name} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold">
            {report.name}
            {report.email && (
              <a href={`mailto:${report.email}`} className="ms-2 font-normal text-muted-foreground hover:text-foreground">
                {report.email}
              </a>
            )}
            {!report.userId && <span className="ms-2 font-normal text-faint">(account gone)</span>}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">
            {report.place} · <When at={report.createdAt} />
          </p>
        </div>
        {report.status === "open" && report.waiting && (
          <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">Waiting on us</span>
        )}
        {report.status === "closed" && report.closedAt && (
          <span className="rounded-full bg-ok/15 px-2 py-0.5 text-[11px] font-semibold text-ok">
            Closed <When at={report.closedAt} />
          </span>
        )}
      </header>

      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0 space-y-2.5">
          {report.messages.map((message) => (
            <div key={message.id} className={cn("rounded-xl px-3 py-2", message.fromTeam ? "ms-8 bg-brand/[0.07]" : "me-8 bg-muted")}>
              <p className="text-[11.5px] text-muted-foreground">
                <span className="font-semibold text-foreground">{message.fromTeam ? "TinyFloor team" : report.name}</span> · <When at={message.at} />
              </p>
              <p dir="auto" className="mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.5]">
                {message.body}
              </p>
            </div>
          ))}

          <form
            className="pt-1"
            onSubmit={(event) => {
              event.preventDefault();
              void send(false);
            }}
          >
            <textarea
              value={reply}
              rows={Math.min(8, Math.max(2, reply.split("\n").length))}
              onChange={(event) => setReply(event.target.value)}
              placeholder={report.status === "open" ? "Reply. They see it in Help and feedback." : "Reply. They see it, and it stays closed."}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-foreground/35 sm:text-[13.5px]"
            />
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="submit" disabled={busy || !text} className="h-8 cursor-pointer rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background disabled:opacity-40">
                Reply
              </button>
              {report.status === "open" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void send(true)}
                  className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
                >
                  {text ? "Reply and close" : "Close"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => api.adminSetReport(report.id, "open"))}
                  className="h-8 cursor-pointer rounded-full bg-muted px-3.5 text-[12.5px] font-medium hover:bg-foreground/[0.08] disabled:opacity-40"
                >
                  Reopen
                </button>
              )}
            </div>
            {error && <p className="mt-1.5 text-[12px] text-destructive">{error}</p>}
          </form>
        </div>

        <dl className="grid content-start gap-2.5 rounded-xl bg-muted/60 p-3 text-[12.5px]">
          {context
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-[11px] text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 min-w-0 break-words">{value}</dd>
              </div>
            ))}
        </dl>
      </div>
    </article>
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
