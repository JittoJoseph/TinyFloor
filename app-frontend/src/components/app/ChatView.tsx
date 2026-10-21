"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  Coffee,
  Footprints,
  Hand,
  Hash,
  ImagePlus,
  ExternalLink,
  Lock,
  MapIcon,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  SquarePen,
  UserPlus,
} from "@/components/ui/icons";
import { motion, useReducedMotion } from "motion/react";
import { GENERAL_CHANNEL, cleanChannelName, dmChannelId, dmMembers, isDm, type ChannelSummary } from "@shared/chat";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { api, type PersonProfile } from "@/lib/api";
import { useChat, useTyping } from "@/lib/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { useFloorStatus, walkToPerson } from "@/lib/floor";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { Face, FaceStack, type Presence } from "@/components/ui/Face";
import { IconButton, Kbd } from "@/components/ui/IconButton";
import { Menu, MenuHeader, MenuItem } from "@/components/ui/Menu";
import { Chip } from "@/components/ui/Empty";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ShellView } from "./AppShell";
import { PresenceDock } from "./PresenceDock";
import { NotifyCard } from "./chat/NotifyCard";
import { usePlace, type PlacePerson } from "./place";
import { Conversation, ConversationIntro, type Line } from "./chat/Conversation";
import { addToComposer, Composer, focusComposer } from "./chat/Composer";
import { HelpTicket } from "./HelpTicket";
import { Logo } from "@/components/app/Logo";
import { help, SUPPORT_CHANNEL, useHelp } from "@/lib/help";
import { conversationToOpen, jumpTo, rememberConversation, takeJump } from "@/lib/chatMemory";
import { useWide } from "@/lib/hooks/use-wide";
import { discard, upload } from "@/lib/chatFiles";
import { mentionsIn } from "@/lib/mentions";
import type { ChatMessage } from "@shared/chat";

/**
 * Chat: channels and direct messages, beside the floor. The same screen in an
 * office and in the lobby. Anyone can edit and unsend what they said. In the
 * lobby direct messages last only while both of you are there, and what only
 * an office can do (making channels, images) is all here and asks for an office.
 * A ticket with the TinyFloor team, while one is open, sits at the very bottom.
 * Coming back to Chat opens the conversation you were last in, not #general.
 */
export function ChatView({ channel }: { channel?: string }) {
  const t = useTranslations("chat");
  const ts = useTranslations("shell");
  const th = useTranslations("help");
  const router = useRouter();
  const place = usePlace();
  const lobby = place.kind === "lobby";
  const state = useChat();
  const { user } = useAuth();
  const floor = useFloorStatus();
  const [jump, setJump] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Chat from a bare address (an old link, or a phone turned wide) opens where you left it,
  // straight away rather than on #general first; the address catches up just after.
  // The rail's link already goes there. On a phone the bare address is the list.
  const wide = useWide();
  // Who you are is known from your session before the chat has connected, so a
  // direct message opened in that first moment still has both its people.
  const me = user?.id ?? state.me;
  const remembered = useMemo(
    () =>
      channel || !wide
        ? null
        : conversationToOpen(place.id, (last) => {
            const pairOf = dmMembers(last);
            // A lobby direct message lasts only while you're both there, so it isn't reopened.
            if (pairOf) return !lobby && pairOf.every((id) => id === me || place.people.some((one) => one.id === id));
            return !state.ready || state.channels.some((one) => one.id === last);
          }),
    [channel, wide, place.id, place.people, lobby, me, state.ready, state.channels],
  );
  const open = channel ?? remembered ?? GENERAL_CHANNEL;
  const support = open === SUPPORT_CHANNEL;
  // Up in an empty box: edit your last message here.
  const [editLast, setEditLast] = useState(0);
  const { ticket, view: ticketView } = useHelp();
  const people = place.people;
  const personById = useMemo(() => new Map(people.map((one) => [one.id, one])), [people]);
  const names = useMemo(() => new Map(people.map((one) => [one.id, one.displayName])), [people]);
  // Who "@" offers: everyone in the office but you. The lobby has strangers in it, so nobody there.
  const mentionable = useMemo(() => (lobby ? [] : people.filter((one) => one.id !== (user?.id ?? state.me))), [lobby, people, user?.id, state.me]);
  const summary = state.channels.find((one) => one.id === open);
  const pair = dmMembers(open);
  const other = pair ? personById.get(pair[0] === me ? pair[1] : pair[0]) : undefined;
  const history = state.history[open];

  // Where the new messages start, as it was when you opened this conversation.
  const [firstUnread, setFirstUnread] = useState<{ channel: string; id: string | null }>({ channel: "", id: null });
  if (firstUnread.channel !== open && history) {
    const unread = summary?.unread ?? 0;
    const first = unread > 0 ? history[Math.max(history.length - unread, 0)] : undefined;
    setFirstUnread({ channel: open, id: first ? String(first.seq) : null });
  }

  // A search result picked elsewhere: load back to it here, and point the conversation at it.
  const [target, setTarget] = useState<{ channel: string; seq: number } | null>(null);
  useEffect(() => {
    const seq = takeJump(open);
    if (seq === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget({ channel: open, seq });
  }, [open]);
  useEffect(() => {
    if (target?.channel === open && state.ready) chat.reach(open, target.seq);
  }, [target, open, state.ready]);

  // Searching messages from the palette: asked as you type, a moment after you stop.
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<{ q: string; messages: ChatMessage[] } | null>(null);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let current = true;
    const timer = setTimeout(() => void chat.search(q).then((messages) => current && setFound({ q, messages })), 220);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Reading a conversation marks it read, and asks for its history.
  useEffect(() => {
    if (support) return;
    chat.watch(open);
    return () => chat.watch(null);
  }, [open, support, state.ready]);
  useEffect(() => {
    if (!support && state.ready) chat.warm(open);
  }, [support, state.ready, open]);
  // The ticket is read often while Chat is open, so the team's answers turn up here.
  useEffect(() => {
    void help.refresh(true);
    const timer = setInterval(() => document.visibilityState === "visible" && void help.refresh(true), 15_000);
    return () => clearInterval(timer);
  }, []);
  // A direct message's address with someone missing from it goes nowhere: back to the start.
  const broken = isDm(open) && !pair;
  useEffect(() => {
    if (broken) {
      rememberConversation(place.id, null);
      router.replace(place.paths.chat());
    }
  }, [broken, router, place.paths, place.id]);

  useEffect(() => {
    if (remembered) router.replace(place.paths.chat(remembered));
  }, [remembered, router, place.paths]);
  useEffect(() => {
    if (channel && !broken && channel !== SUPPORT_CHANNEL) rememberConversation(place.id, channel);
  }, [channel, broken, place.id]);

  // Files: the lobby asks for an office; an office takes them.
  const onFiles = (files: File[]) => {
    if (!files.length) return;
    if (lobby) return place.officesOnly?.("attachments");
    addToComposer(files);
  };

  const channels = state.channels.filter((one) => one.kind === "channel");
  const dms = useDirectMessages(people, state.channels, me);
  const [allPeople, setAllPeople] = useState(false);
  // A big team's list is the people you talk to and whoever's on the floor; the rest are a click (or a search) away.
  const listedDms = allPeople || dms.length <= DM_LIST ? dms : shortList(dms, (id) => open === dmChannelId(me, id) || floor.has(id));
  const presenceOf = (id: string): Presence => floor.get(id) ?? null;

  const lines: Line[] = (history ?? []).map((message) => ({
    id: String(message.seq),
    author: message.author,
    authorName: personById.get(message.author)?.displayName ?? message.authorName,
    body: message.body,
    at: message.at,
    files: message.files,
    mentions: message.mentions,
    reactions: message.reactions,
    edited: message.edited,
    reply: message.reply && {
      id: String(message.reply.seq),
      author: message.reply.author,
      authorName: (message.reply.author && personById.get(message.reply.author)?.displayName) || message.reply.authorName,
      body: message.reply.body,
      files: message.reply.files,
      gone: message.reply.gone,
    },
  }));

  // Who else is writing here: one or two by name, more as "several".
  const typists = [...useTyping(open).entries()].filter(([id]) => id !== me).map(([id, one]) => personById.get(id)?.displayName ?? one.name);
  const typingLine =
    typists.length === 0
      ? null
      : typists.length === 1
        ? t("typingOne", { name: typists[0] })
        : typists.length === 2
          ? t("typingTwo", { a: typists[0], b: typists[1] })
          : t("typingMany");

  // The message being answered, in this conversation; another conversation forgets it.
  const [replyingTo, setReplyingTo] = useState<{ channel: string; line: Line } | null>(null);
  const reply = replyingTo?.channel === open ? replyingTo.line : null;

  // A lobby direct message is never stored: the conversation lasts while you are both here.
  const otherId = pair ? (pair[0] === me ? pair[1] : pair[0]) : null;
  // It ended once they left; before the floor has said who is here, it is simply loading.
  const ended = lobby && !!otherId && !other && !!state.left[otherId];
  useEffect(() => {
    if (lobby && otherId && other && state.ready && !summary) chat.openDm(otherId);
  }, [lobby, otherId, other, state.ready, summary]);

  // Nothing said here yet: the intro offers a way to start.
  const empty = !!history && history.length === 0 && !(state.more[open] ?? false);
  const title = pair ? (other?.displayName ?? summary?.name ?? "") : (summary?.name ?? open);
  const go = (id: string) => router.push(place.paths.chat(id));
  const message = (id: string) => go(dmChannelId(me, id));
  const walkTo = (id: string) => {
    router.push(place.paths.floor);
    walkToPerson(id);
  };

  const personCard = (id: string, name: string, trigger: ReactNode) => (
    <PersonCard
      id={id}
      name={personById.get(id)?.displayName ?? name}
      detail={personById.get(id)?.email ?? undefined}
      role={personById.get(id)?.role}
      presence={presenceOf(id)}
      isMe={id === me}
      onMessage={() => message(id)}
      onWalk={presenceOf(id) && id !== me ? () => walkTo(id) : undefined}
      trigger={trigger}
    />
  );

  const items: CommandItem[] = [
    ...channels.map((one) => ({
      id: one.id,
      label: `#${one.name}`,
      group: t("channels"),
      icon: Hash,
      onSelect: () => go(one.id),
    })),
    ...dms.map(({ person }) => ({
      id: person.id,
      label: person.displayName,
      group: t("directMessages"),
      keywords: [person.email ?? ""],
      visual: <Face seed={person.id} size={18} presence={presenceOf(person.id)} />,
      onSelect: () => message(person.id),
    })),
    {
      id: "go-floor",
      label: ts("backToFloor"),
      group: t("actions"),
      icon: MapIcon,
      onSelect: () => router.push(place.paths.floor),
    },
    {
      id: "go-people",
      label: t("invitePeople"),
      group: t("actions"),
      icon: UserPlus,
      onSelect: () => router.push(place.paths.people),
    },
  ];

  // Messages the server found for what's typed: who said it, where and when, with the words marked.
  const foundItems: CommandItem[] =
    found && found.q === query.trim()
      ? found.messages.map((message) => {
          const pairOf = dmMembers(message.channel);
          const withId = pairOf ? (pairOf[0] === me ? pairOf[1] : pairOf[0]) : null;
          const where = withId ? (personById.get(withId)?.displayName ?? "") : `#${message.channel}`;
          const text = message.body || (message.files ?? []).map((file) => file.name).join(", ");
          return {
            id: `message-${message.seq}`,
            label: text,
            labelNode: <Marked text={text} words={found.q} />,
            detail: [personById.get(message.author)?.displayName ?? message.authorName, where, formatDay(message.at)].filter(Boolean).join(" · "),
            group: t("messages"),
            visual: <Face seed={message.author} size={28} />,
            onSelect: () => {
              if (message.channel === open) setTarget({ channel: open, seq: message.seq });
              else {
                jumpTo(message.channel, message.seq);
                go(message.channel);
              }
            },
          };
        })
      : [];

  const newChannel = (trigger: React.ReactElement) =>
    lobby ? (
      <span
        className="contents"
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          place.officesOnly?.("channels");
        }}
      >
        {trigger}
      </span>
    ) : (
      <NewChannel onMade={go} trigger={trigger} />
    );

  return (
    <ShellView
      showDetail={!!channel}
      column={
        <>
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <h2 className="me-auto truncate text-[15px] font-semibold tracking-tight text-foreground">{place.name}</h2>
            {newChannel(<IconButton label={t("newChannel")} size="sm" icon={<SquarePen />} bare className="[&_svg]:size-4" />)}
          </header>

          <div className="px-3 pb-2">
            <button
              type="button"
              onClick={() => setJump(true)}
              className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            >
              <Search className="size-4" />
              <span className="flex-1 text-start">{t("jumpTo")}</span>
              <Kbd>⌘K</Kbd>
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <Section title={t("channels")}>
              {channels.map((one) => (
                <Row
                  key={one.id}
                  href={place.paths.chat(one.id)}
                  warm={one.id}
                  active={one.id === open}
                  unread={one.unread}
                  count={one.mentions ?? 0}
                  icon={<Hash className="size-4" />}
                  label={one.name}
                />
              ))}
              {newChannel(
                <button type="button" className={addRowClass}>
                  <span className={addIconClass}>
                    <Plus className="size-3.5" />
                  </span>
                  {t("addChannel")}
                  {lobby && <Lock className="ms-auto size-3.5 text-faint" />}
                </button>,
              )}
            </Section>

            <Section title={t("directMessages")}>
              {listedDms.map(({ person, summary: dm }) => (
                <Row
                  key={person.id}
                  href={place.paths.chat(dmChannelId(me, person.id))}
                  warm={lobby ? undefined : dmChannelId(me, person.id)}
                  active={open === dmChannelId(me, person.id)}
                  unread={dm?.unread ?? 0}
                  count={dm?.unread ?? 0}
                  icon={<Face seed={person.id} size={20} presence={presenceOf(person.id)} />}
                  label={person.displayName}
                />
              ))}
              {listedDms.length < dms.length && (
                <button type="button" onClick={() => setAllPeople(true)} className={addRowClass}>
                  <span className={addIconClass}>
                    <MoreHorizontal className="size-3.5" />
                  </span>
                  {t("showAllPeople", { count: dms.length })}
                </button>
              )}
              {dms.length === 0 ? (
                <div className="mx-1 mt-1 rounded-xl border border-dashed border-border-strong p-3">
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {lobby ? t("lobbyAlone") : t("aloneHere")}
                  </p>
                  <Link
                    href={place.paths.people}
                    className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12.5px] font-medium text-background"
                  >
                    <UserPlus className="size-3.5" />
                    {t("invitePeople")}
                  </Link>
                </div>
              ) : (
                <Link href={place.paths.people} className={addRowClass}>
                  <span className={addIconClass}>
                    <UserPlus className="size-3.5" />
                  </span>
                  {t("invitePeople")}
                </Link>
              )}
            </Section>
          </nav>

          {/* The ticket with the team stays out of the way, at the very bottom, while one is open. */}
          {(ticket || (support && ticketView)) && (
            <div className="shrink-0 border-t border-border px-2 py-2">
              <Row
                href={place.paths.chat(SUPPORT_CHANNEL)}
                active={support}
                unread={ticket?.unread ?? 0}
                count={ticket?.unread ?? 0}
                icon={<Logo size={18} />}
                label={th("support")}
              />
            </div>
          )}

          {!lobby && dms.length > 0 && <NotifyCard />}
          <PresenceDock place={place.name} settingsHref={place.paths.settings} />
          <CommandPalette
            items={items}
            open={jump}
            onOpenChange={setJump}
            placeholder={t("jumpTo")}
            emptyMessage={t("noMatch")}
            onQueryChange={setQuery}
            found={foundItems}
            searching={query.trim().length >= 2 && found?.q !== query.trim() ? t("searching") : undefined}
          />
        </>
      }
    >
      {support ? (
        <HelpTicket />
      ) : (
      /* The whole conversation takes a dropped image, the way any chat does. */
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onDragEnter={(event) => event.dataTransfer.types.includes("Files") && setDragging(true)}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.files.length) return;
          event.preventDefault();
          setDragging(false);
          onFiles([...event.dataTransfer.files]);
        }}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
          <IconButton
            label={ts("back")}
            size="sm"
            className="md:hidden"
            onClick={() => router.push(place.paths.chat())}
            icon={<ArrowLeft className="rtl:rotate-180" />}
          />
          {pair ? (
            other ? (
              personCard(
                other.id,
                other.displayName,
                <button type="button" className="flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted">
                  <Face seed={other.id} size={24} presence={presenceOf(other.id)} />
                  <span className="truncate text-[15px] font-semibold text-foreground">{title}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                </button>,
              )
            ) : (
              <span className="truncate text-[15px] font-semibold text-foreground">{title}</span>
            )
          ) : (
            <span className="flex min-w-0 items-center gap-1 text-[15px] font-semibold text-foreground">
              <Hash className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{title}</span>
            </span>
          )}
          <span className="ms-auto" />
          {!pair && people.length > 0 && (
            <Link
              href={place.paths.people}
              className="flex h-8 items-center gap-2 rounded-full border border-border ps-1 pe-2.5 transition-colors hover:bg-muted [--face-ring:var(--ui-card)]"
              title={t("members", { count: people.length })}
            >
              <FaceStack seeds={people.map((one) => one.id)} size={22} max={3} />
              <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground">{people.length}</span>
            </Link>
          )}
        </header>

        {ended ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
              {t("gone", { name: (otherId && state.left[otherId]) || summary?.name || "" })}
            </p>
          </div>
        ) : (
        <>
        <Conversation
          key={`conversation-${open}`}
          lines={lines}
          me={me}
          more={state.more[open] ?? false}
          onOlder={() => chat.older(open)}
          firstUnread={firstUnread.channel === open ? firstUnread.id : null}
          editLast={editLast}
          onReact={(line, emoji, on) => chat.react(Number(line.id), emoji, on)}
          onEdit={(line, body) => chat.edit(Number(line.id), body, open, mentionsIn(body, mentionable, me))}
          names={names}
          target={target?.channel === open ? String(target.seq) : null}
          // A lobby direct message is never stored, so there's nothing to wait for.
          loading={!history && !(lobby && pair)}
          onDelete={(line) => chat.remove(Number(line.id), open)}
          // A lobby direct message was never stored, so there's nothing to point a reply at.
          onReply={lobby && pair ? undefined : (line) => {
            setReplyingTo({ channel: open, line });
            focusComposer();
          }}
          onOpenReply={(id) => setTarget({ channel: open, seq: Number(id) })}
          personCard={personCard}
          intro={
            pair && other ? (
              <ConversationIntro
                mark={<Face seed={other.id} size={64} presence={presenceOf(other.id)} />}
                title={other.displayName}
                body={lobby ? t("lobbyDmIntro") : t("dmIntro", { name: other.displayName })}
                actions={
                  empty && (
                    <>
                      <Chip solid icon={<Hand />} onClick={() => chat.say(open, t("starterHi", { name: firstName(other.displayName) }))}>
                        {t("sayHi")}
                      </Chip>
                      <Chip icon={<Coffee />} onClick={() => chat.say(open, t("starterMinute"))}>
                        {t("askMinute")}
                      </Chip>
                      {presenceOf(other.id) && (
                        <Chip icon={<Footprints />} onClick={() => walkTo(other.id)}>
                          {t("walkOver")}
                        </Chip>
                      )}
                    </>
                  )
                }
              />
            ) : (
              <ConversationIntro
                mark={
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <Hash className="size-7" />
                  </span>
                }
                title={t("channelIntroTitle", { channel: title })}
                body={introFor(open)}
                actions={
                  empty && (
                    <>
                      <Chip
                        solid
                        icon={<Hand />}
                        onClick={() => chat.say(open, t("starterHello"))}
                      >
                        {t("sayHello")}
                      </Chip>
                      <Chip icon={<UserPlus />} onClick={() => router.push(place.paths.people)}>
                        {t("invitePeople")}
                      </Chip>
                    </>
                  )
                }
              />
            )
          }
        />

        <Composer
          key={`composer-${open}`}
          placeholder={pair ? t("sayTo", { name: title }) : t("say", { channel: `#${title}` })}
          onSend={(text, files) => {
            chat.say(open, text, files, mentionsIn(text, mentionable, me), reply ? Number(reply.id) : undefined);
            setReplyingTo(null);
          }}
          replying={reply && { name: reply.authorName }}
          onCancelReply={() => setReplyingTo(null)}
          onTyping={() => chat.typing(open)}
          typing={typingLine}
          onFiles={onFiles}
          upload={lobby ? undefined : (file, progress, signal) => upload(place.id, file, progress, signal)}
          discard={lobby ? undefined : discard}
          people={mentionable}
          draftKey={`${place.id}:${open}`}
          onEditLast={() => setEditLast((was) => was + 1)}
          note={state.slowDown ? t("slowDown") : state.notHere ? t("notHere") : null}
        />
        </>
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-3 z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground/30 bg-card/90 text-center backdrop-blur-sm">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <ImagePlus className="size-6" />
            </span>
            <p className="text-[15px] font-semibold text-foreground">{t("dropHere", { channel: pair ? title : `#${title}` })}</p>
            {lobby && <p className="text-[13px] text-muted-foreground">{t("dropLobby")}</p>}
          </div>
        )}
      </div>
      )}
    </ShellView>
  );

  function introFor(id: string) {
    if (lobby) {
      if (id === "feedback") return t("lobbyFeedback");
      return t("lobbyGeneral");
    }
    return t("channelIntro", { channel: id });
  }
}

/**
 * Everyone you could write to, not just the ones you have: people you have
 * talked to lately first, then everyone else by name.
 */
function useDirectMessages(people: PlacePerson[], channels: ChannelSummary[], me: string) {
  return useMemo(() => {
    const dms = new Map<string, ChannelSummary>();
    for (const one of channels) {
      const pair = one.kind === "dm" ? dmMembers(one.id) : null;
      if (pair) dms.set(pair[0] === me ? pair[1] : pair[0], one);
    }
    return people
      .filter((one) => one.id !== me)
      .map((person) => ({ person, summary: dms.get(person.id) }))
      .sort((a, b) => {
        const at = (b.summary?.lastAt ?? 0) - (a.summary?.lastAt ?? 0);
        return at !== 0 ? at : a.person.displayName.localeCompare(b.person.displayName);
      });
  }, [people, channels, me]);
}

/** Direct messages listed before a long team's list folds. */
const DM_LIST = 10;

/** The people you have talked to, then the ones also worth seeing now, up to the list's length. */
function shortList<T extends { person: PlacePerson; summary?: ChannelSummary }>(dms: T[], worth: (id: string) => boolean): T[] {
  const talked = dms.filter((one) => one.summary?.lastAt);
  const room = Math.max(0, DM_LIST - talked.length);
  const others = dms.filter((one) => !one.summary?.lastAt && worth(one.person.id)).slice(0, room);
  return dms.filter((one) => talked.includes(one) || others.includes(one));
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-3 first:mt-1">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-[12.5px] font-medium text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
      >
        <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
        {title}
      </button>
      {open && <div className="mt-0.5 flex flex-col gap-px">{children}</div>}
    </div>
  );
}

function Row({
  href,
  warm,
  onClick,
  active,
  unread,
  count,
  icon,
  label,
  trailing,
}: {
  href?: string;
  /** The conversation it opens, fetched as the pointer rests on it so it opens with its messages. */
  warm?: string;
  onClick?: () => void;
  active: boolean;
  /** Anything unread makes the row bold. */
  unread: number;
  /** What's counted beside it: in a channel only mentions, in a direct message everything (Slack's way). */
  count: number;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const className = cn(
    "relative flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-start text-[13.5px] transition-colors",
    active
      ? "text-foreground [--face-ring:var(--ui-muted)]"
      : unread
        ? "font-semibold text-foreground hover:bg-foreground/[0.05]"
        : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
  );
  const body = (
    <>
      {active && (
        <motion.span
          layoutId="chat-row"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-lg bg-muted"
        />
      )}
      <span className="relative flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {trailing && <span className="relative">{trailing}</span>}
      {count > 0 && !active && (
        <span className="relative min-w-[18px] rounded-full bg-brand px-1.5 text-center text-[10.5px] font-semibold leading-[18px] text-brand-foreground tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </>
  );
  return href ? (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={active ? focusComposer : undefined}
      onPointerEnter={warm ? () => chat.warm(warm) : undefined}
      onFocus={warm ? () => chat.warm(warm) : undefined}
      className={className}
    >
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

const addRowClass =
  "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground";
const addIconClass = "flex size-5 items-center justify-center rounded-md bg-muted";

/** "Ana Lima" to "Ana": how you would start a message to someone. */
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** A channel is made by naming it. */
function NewChannel({ onMade, trigger }: { onMade: (id: string) => void; trigger: React.ReactElement }) {
  const t = useTranslations("chat");
  const [name, setName] = useState("");
  const clean = cleanChannelName(name);
  return (
    <Menu width={272} align="start" trigger={trigger}>
      <form
        className="p-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!clean) return;
          chat.makeChannel(clean);
          setName("");
          onMade(clean);
        }}
      >
        <p className="mb-2 text-[13px] font-medium text-foreground">{t("newChannel")}</p>
        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 focus-within:border-foreground/35">
          <Hash className="size-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("channelName")}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-foreground outline-none placeholder:text-faint md:text-[13px]"
          />
        </label>
        <p className="mt-1.5 min-h-4 text-[11.5px] text-muted-foreground">
          {clean && clean !== name ? `#${clean}` : t("channelHint")}
        </p>
        <button
          type="submit"
          disabled={!clean}
          className="mt-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-foreground text-[13px] font-medium text-background disabled:opacity-40"
        >
          <Plus className="size-3.5" />
          {t("create")}
        </button>
      </form>
    </Menu>
  );
}

/** Who someone is, from a face or a name anywhere in chat. */
function PersonCard({
  id,
  name,
  detail,
  role,
  presence,
  isMe,
  onMessage,
  onWalk,
  trigger,
}: {
  id: string;
  name: string;
  detail?: string;
  role?: string;
  presence: Presence;
  isMe: boolean;
  onMessage?: () => void;
  /** Present when they are on the floor: walk over to them. */
  onWalk?: () => void;
  trigger: ReactNode;
}) {
  const t = useTranslations("shell");
  const tr = useTranslations("office.roles");
  return (
    <Menu align="start" width={264} trigger={trigger as React.ReactElement}>
      <MenuHeader>
        <Face seed={id} size={56} presence={presence} className="[--face-ring:var(--ui-popover)]" />
        <p className="mt-3 truncate text-[15px] font-semibold text-foreground">{name}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">
          {[role ? tr(role as "admin" | "member") : null, presence ? t("onFloorShort") : t("notOnFloor")]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {detail && (
          <p data-ph-mask className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
            {detail}
          </p>
        )}
        <ProfileLink id={id} />
      </MenuHeader>
      {!isMe && onMessage && (
        <MenuItem icon={<MessageSquare />} onSelect={onMessage}>
          {t("message")}
        </MenuItem>
      )}
      {!isMe && onWalk && (
        <MenuItem icon={<Footprints />} onSelect={onWalk}>
          {t("walkTo")}
        </MenuItem>
      )}
    </Menu>
  );
}

/** Profiles already looked up, so opening someone twice doesn't ask twice. */
const profiles = new Map<string, Promise<PersonProfile | null>>();

/** The link someone put on their profile, if they did, under their name wherever a card opens. */
function ProfileLink({ id }: { id: string }) {
  const [profile, setProfile] = useState<PersonProfile | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!profiles.has(id)) profiles.set(id, api.person(id).then(({ person }) => person, () => null));
    profiles.get(id)!.then((found) => !cancelled && setProfile(found));
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (!profile?.link) return null;
  const shown = profile.link.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <a
      href={profile.link}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="mt-2 flex max-w-full items-center gap-1.5 truncate text-[12.5px] font-medium text-foreground underline-offset-2 hover:underline"
    >
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{shown}</span>
    </a>
  );
}

/** A found message's words around what was looked for, with that part marked. */
function Marked({ text, words }: { text: string; words: string }) {
  const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const at = fold(text).indexOf(fold(words));
  if (at < 0) return <>{text}</>;
  // Some words before it, so the match isn't lost off the end of a long line.
  const reach = Math.max(0, at - 28);
  // ...starting on a word, not halfway into one.
  const space = text.indexOf(" ", reach);
  const from = reach === 0 ? 0 : space >= 0 && space < at ? space + 1 : reach;
  return (
    <>
      {from > 0 && "…"}
      {text.slice(from, at)}
      <mark className="rounded-[4px] bg-brand/15 px-0.5 text-foreground">{text.slice(at, at + words.length)}</mark>
      {text.slice(at + words.length)}
    </>
  );
}

/** "Oct 12", or the time if it was today. */
function formatDay(at: number): string {
  const day = new Date(at);
  return day.toDateString() === new Date().toDateString()
    ? day.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : day.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
