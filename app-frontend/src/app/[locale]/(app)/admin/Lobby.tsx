"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Hash, Paperclip, Pencil, Reply, Shield, Trash2 } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face, FaceStack } from "@/components/ui/Face";
import { ShellView } from "@/components/app/AppShell";
import { api, ApiError, type LobbyChatPage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Column, DetailHeader, DetailState, Live, Pick, Row, Short, useRun } from "./pieces";
import type { ViewProps } from "./views";

type LobbyMessage = LobbyChatPage["messages"][number];
type Channel = LobbyChatPage["channels"][number];

/** Messages from one person this close together read as one: their face and name once. */
const RUN_MS = 5 * 60_000;

/**
 * The public lobby's chat, as its moderators see it: who's in the lobby now,
 * its channels, and the one picked, a week of it, by day and by person, as
 * the lobby shows it. Any message can be changed or taken down, and everyone
 * in the lobby sees it at once; its author opens their page.
 */
export function Lobby({ picked, pick, open }: ViewProps) {
  const [channels, setChannels] = useState<Channel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [people, setPeople] = useState<{ here: number; faces: Array<{ id: string }> } | null>(null);

  // The channels come with any page of the chat; #general's will do.
  const loadChannels = useCallback(() => {
    api.adminLobbyChat("general").then(
      (page) => setChannels(page.channels),
      () => setFailed(true),
    );
  }, []);
  useEffect(() => {
    loadChannels();
    api.lobbyPeople().then(setPeople, () => undefined);
  }, [loadChannels]);

  return (
    <ShellView
      showDetail={!!picked}
      column={
        <Column title="Lobby" loading={channels === null && !failed} empty={failed ? "Couldn't load the lobby's chat." : channels?.length === 0 && "No channels."}>
          {people && (
            <li className="mb-2 flex items-center gap-3 rounded-[12px] border border-border px-3 py-2.5">
              {people.faces.length > 0 ? <FaceStack seeds={people.faces.map((one) => one.id)} size={24} max={4} /> : <span className="size-6 rounded-full bg-muted" />}
              <span className="text-[12.5px]">
                {people.here > 0 ? <Live>{people.here === 1 ? "1 in the lobby now" : `${people.here} in the lobby now`}</Live> : <span className="text-muted-foreground">Nobody in the lobby now</span>}
              </span>
            </li>
          )}
          {channels?.map((one) => (
            <Row
              key={one.id}
              selected={one.id === picked}
              onClick={() => pick(one.id)}
              lead={
                <span className={cn("flex size-9 items-center justify-center rounded-[10px]", one.id === picked ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>
                  <Hash className="size-4" />
                </span>
              }
              title={one.id}
              sub={one.messages === 1 ? "1 message this week" : `${one.messages} messages this week`}
              aside={one.lastAt ? <Short at={one.lastAt} /> : undefined}
            />
          ))}
        </Column>
      }
    >
      {picked ? (
        <ChannelView
          key={picked}
          channel={channels?.find((one) => one.id === picked) ?? { id: picked, messages: 0, lastAt: null }}
          onBack={() => pick(null)}
          openPerson={(id) => open("people", id)}
          onCount={loadChannels}
        />
      ) : (
        <Pick icon={<Hash />} title="Pick a channel" note="A week of it shows here, as the lobby sees it, each message yours to change or take down." />
      )}
    </ShellView>
  );
}

function ChannelView({ channel, onBack, openPerson, onCount }: { channel: Channel; onBack: () => void; openPerson: (id: string) => void; onCount: () => void }) {
  const locale = useLocale();
  const [page, setPage] = useState<LobbyChatPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  // Today and yesterday as of when the channel was opened, so the dividers hold still while it's read.
  const [today] = useState(() => new Date().toDateString());
  const [yesterday] = useState(() => new Date(Date.now() - 86_400_000).toDateString());

  const load = useCallback(
    async (before?: number) => {
      try {
        const next = await api.adminLobbyChat(channel.id, before);
        // Older messages go above the ones already shown.
        setPage((now) => (before && now ? { ...next, messages: [...next.messages, ...now.messages] } : next));
      } catch {
        setFailed(true);
      }
    },
    [channel.id],
  );
  useEffect(() => {
    // State is set when the answer comes, not here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  // Opened at the newest, as a chat is.
  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box || !page || opened.current) return;
    box.scrollTop = box.scrollHeight;
    opened.current = true;
  }, [page]);

  if (!page) return <DetailState error={failed ? "Couldn't load this channel." : undefined} />;
  // Older messages arrive above the ones being read, which stay where they are on screen.
  const older = async () => {
    const box = scroller.current;
    const from = box ? box.scrollHeight - box.scrollTop : 0;
    setBusy(true);
    await load(page.messages[0]?.seq);
    setBusy(false);
    requestAnimationFrame(() => {
      if (box) box.scrollTop = box.scrollHeight - from;
    });
  };
  const change = (seq: number, next: LobbyMessage | null) => {
    setPage((now) => now && { ...now, messages: next ? now.messages.map((one) => (one.seq === seq ? next : one)) : now.messages.filter((one) => one.seq !== seq) });
    if (!next) onCount();
  };
  const day = (at: number) => {
    const date = new Date(at).toDateString();
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    return new Date(at).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  };

  return (
    <>
      <DetailHeader
        onBack={onBack}
        lead={
          <span className="flex size-10 items-center justify-center rounded-[12px] bg-muted text-muted-foreground">
            <Hash className="size-5" />
          </span>
        }
        title={channel.id}
        sub={channel.messages === 1 ? "1 message this week" : `${channel.messages} messages this week`}
      />
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {page.messages.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-muted-foreground">Nothing in #{channel.id} this week.</p>
        ) : (
          <div className="mx-auto w-full max-w-3xl pb-4 pt-2">
            {page.more && (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void older()}
                  className="h-8 cursor-pointer rounded-full bg-muted px-4 text-[12.5px] font-medium transition-colors hover:bg-foreground/[0.08] disabled:opacity-50"
                >
                  {busy ? "Loading" : "Show older"}
                </button>
              </div>
            )}
            <ol>
              {page.messages.map((message, index) => {
                const before = page.messages[index - 1];
                const newDay = !before || day(before.at) !== day(message.at);
                const run = !newDay && before.author === message.author && message.at - before.at < RUN_MS && !message.reply;
                return (
                  <Fragment key={message.seq}>
                    {newDay && (
                      <li className="relative my-3 flex justify-center">
                        <span className="absolute inset-x-4 top-1/2 h-px bg-border md:inset-x-6" />
                        <span className="relative rounded-full border border-border bg-card px-3 py-0.5 text-[11.5px] font-medium text-muted-foreground">{day(message.at)}</span>
                      </li>
                    )}
                    <Message message={message} run={run} openPerson={openPerson} onChange={(next) => change(message.seq, next)} />
                  </Fragment>
                );
              })}
            </ol>
          </div>
        )}
      </div>
      {/* Where a composer would be: what this is. */}
      <p className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-4 py-3 text-center text-[12.5px] text-muted-foreground">
        <Shield className="size-4 shrink-0 text-faint" />
        Moderating #{channel.id}: a change shows to everyone in the lobby at once.
      </p>
    </>
  );
}

/**
 * One message: its face and name (or, following on from the same person,
 * just its time on hover), what it answers, its words, files and reactions,
 * and while it's pointed at, the tools to change it or take it down.
 */
function Message({ message, run, openPerson, onChange }: { message: LobbyMessage; run: boolean; openPerson: (id: string) => void; onChange: (next: LobbyMessage | null) => void }) {
  const locale = useLocale();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { busy, error, run: act } = useRun();

  // A message already gone (its author unsent it, or its week ran out) just leaves the list.
  const gone = (problem: unknown) => problem instanceof ApiError && problem.status === 404;
  const save = () =>
    act(async () => {
      const body = (editing ?? "").trim();
      try {
        if (body && body !== message.body) {
          await api.adminEditLobbyMessage(message.seq, body);
          onChange({ ...message, body, edited: Date.now() });
        }
        setEditing(null);
      } catch (problem) {
        if (!gone(problem)) throw problem;
        onChange(null);
      }
    });
  const takeDown = () =>
    act(async () => {
      try {
        await api.adminDeleteLobbyMessage(message.seq);
      } catch (problem) {
        if (!gone(problem)) throw problem;
      }
      onChange(null);
    });
  const time = new Date(message.at).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const reactions = Object.entries(message.reactions ?? {}).filter(([, who]) => who.length > 0);

  return (
    <li className={cn("group relative flex gap-3 px-4 transition-colors hover:bg-foreground/[0.025] md:px-6", run ? "py-0.5" : "pb-0.5 pt-2.5", editing !== null && "bg-foreground/[0.025]")}>
      {run ? (
        <span className="w-8 shrink-0 pt-0.5 text-end text-[10.5px] tabular-nums text-faint opacity-0 group-hover:opacity-100">{time}</span>
      ) : (
        <button type="button" onClick={() => openPerson(message.author)} className="h-fit shrink-0 cursor-pointer" aria-label={message.authorName}>
          <Face seed={message.author} size={32} />
        </button>
      )}
      <div className="min-w-0 flex-1 pb-1">
        {!run && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-[12.5px]">
            <button type="button" onClick={() => openPerson(message.author)} className="cursor-pointer font-semibold text-foreground hover:underline">
              {message.authorName}
            </button>
            <span className="text-[11.5px] text-faint" title={new Date(message.at).toLocaleString(locale)}>
              {time}
            </span>
          </p>
        )}
        {message.reply && (
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
            <Reply className="size-3.5 shrink-0 text-faint" />
            {message.reply.gone ? (
              <span className="italic">A message that&apos;s gone</span>
            ) : (
              <>
                <span className="shrink-0 font-medium">{message.reply.authorName}</span>
                <span className="truncate">{message.reply.body || (message.reply.files ? "A picture" : "")}</span>
              </>
            )}
          </p>
        )}
        {editing !== null ? (
          <form
            className="mt-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <textarea
              autoFocus
              value={editing}
              rows={Math.min(6, Math.max(2, editing.split("\n").length))}
              onChange={(event) => setEditing(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(null);
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void save();
                }
              }}
              className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[16px] outline-none focus:border-border-strong sm:text-[13.5px]"
            />
            <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-faint">
              <button type="submit" disabled={busy} className="h-7 cursor-pointer rounded-full bg-foreground px-3 text-[12px] font-medium text-background disabled:opacity-50">
                Save
              </button>
              <button type="button" onClick={() => setEditing(null)} className="h-7 cursor-pointer rounded-full px-3 text-[12px] text-muted-foreground hover:bg-muted">
                Cancel
              </button>
              Enter saves, Esc cancels
            </div>
          </form>
        ) : (
          message.body && (
            <p dir="auto" className="whitespace-pre-wrap break-words text-[13.5px] leading-[1.5] text-foreground/90">
              {message.body}
              {message.edited && (
                <span className="ms-1.5 text-[11px] text-faint" title={new Date(message.edited).toLocaleString(locale)}>
                  (edited)
                </span>
              )}
            </p>
          )
        )}
        {message.files && message.files.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.files.map((file) => (
              <span key={file.key} className="inline-flex h-7 max-w-60 items-center gap-1.5 rounded-lg border border-border px-2 text-[12px] text-muted-foreground">
                <Paperclip className="size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </span>
            ))}
          </div>
        )}
        {reactions.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactions.map(([emoji, who]) => (
              <span key={emoji} className="inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-[12px] tabular-nums">
                {emoji}
                <span className="text-muted-foreground">{who.length}</span>
              </span>
            ))}
          </div>
        )}
        {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
      </div>

      {/* The tools, floating at the message's corner while it's pointed at. */}
      {editing === null && (
        <div
          className={cn(
            "absolute -top-3 end-4 z-10 flex items-center gap-0.5 rounded-full border border-border bg-popover p-0.5 shadow-[0_2px_8px_rgb(0_0_0/0.08)] transition-opacity md:end-6",
            confirming ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100",
          )}
        >
          {confirming ? (
            <>
              <span className="px-2 text-[12px] text-muted-foreground">Take down for everyone?</span>
              <button
                type="button"
                autoFocus
                disabled={busy}
                onBlur={() => setConfirming(false)}
                onClick={() => void takeDown()}
                className="h-7 cursor-pointer rounded-full bg-destructive px-3 text-[12px] font-medium text-white disabled:opacity-50"
              >
                Take down
              </button>
            </>
          ) : (
            <>
              <IconButton label="Edit" size="sm" className="size-7" onClick={() => setEditing(message.body)} icon={<Pencil />} />
              <IconButton label="Take down" size="sm" className="size-7 hover:text-destructive" onClick={() => setConfirming(true)} icon={<Trash2 />} />
            </>
          )}
        </div>
      )}
    </li>
  );
}
