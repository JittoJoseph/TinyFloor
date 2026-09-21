"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ChevronDown,
  Coffee,
  Footprints,
  Hand,
  Hash,
  ImagePlus,
  Lock,
  Map as MapIcon,
  MessageSquare,
  Plus,
  Search,
  SquarePen,
  UserPlus,
  Users,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { GENERAL_CHANNEL, cleanChannelName, dmChannelId, dmMembers, type ChannelSummary } from "@shared/chat";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
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
import { usePlace, type PlacePerson } from "./place";
import { Conversation, ConversationIntro, type Line } from "./chat/Conversation";
import { Composer } from "./chat/Composer";

/**
 * Chat: channels and direct messages, beside the floor. The same screen in an
 * office and in the lobby; in the lobby what only an office can do (making
 * channels, direct messages, images) is all here, and asks for an office.
 */
export function ChatView({ channel }: { channel?: string }) {
  const t = useTranslations("chat");
  const ts = useTranslations("shell");
  const router = useRouter();
  const place = usePlace();
  const lobby = place.kind === "lobby";
  const state = useChat();
  const floor = useFloorStatus();
  const [jump, setJump] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const open = channel ?? GENERAL_CHANNEL;
  const me = state.me;
  const people = place.people;
  const personById = useMemo(() => new Map(people.map((one) => [one.id, one])), [people]);
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

  // Reading a conversation marks it read, and asks for its history.
  useEffect(() => {
    chat.watch(open);
    return () => chat.watch(null);
  }, [open, state.ready]);
  useEffect(() => {
    if (state.ready && !state.history[open]) chat.older(open);
  }, [state.ready, state.history, open]);
  useEffect(() => () => clearTimeout(noteTimer.current), []);

  const say = (text: string) => {
    clearTimeout(noteTimer.current);
    setNote(text);
    noteTimer.current = setTimeout(() => setNote(null), 5000);
  };

  // Images: the lobby asks for an office; an office says where they stand.
  const onFiles = (files: File[]) => {
    if (!files.length) return;
    if (lobby) return place.officesOnly("attachments");
    say(place.plan === "free" ? t("attachmentsPaid") : t("attachmentsSoon"));
  };

  const channels = state.channels.filter((one) => one.kind === "channel");
  const dms = useDirectMessages(people, state.channels, me);
  const presenceOf = (id: string): Presence => floor.get(id) ?? null;
  const canInvite = lobby || place.role === "admin";

  const lines: Line[] = (history ?? []).map((message) => ({
    id: String(message.seq),
    author: message.author,
    authorName: personById.get(message.author)?.displayName ?? message.authorName,
    body: message.body,
    at: message.at,
    image: message.image,
    reactions: message.reactions,
  }));

  // Nothing said here yet: the intro offers a way to start.
  const empty = !!history && history.length === 0 && !(state.more[open] ?? false);
  const title = pair ? (other?.displayName ?? summary?.name ?? "") : (summary?.name ?? open);
  const go = (id: string) => router.push(place.paths.chat(id));
  const message = (id: string) => (lobby ? place.officesOnly("directMessages") : go(dmChannelId(me, id)));
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
      label: canInvite ? t("invitePeople") : ts("people"),
      group: t("actions"),
      icon: canInvite ? UserPlus : Users,
      onSelect: () => router.push(place.paths.people),
    },
  ];

  const newChannel = (trigger: React.ReactElement) =>
    lobby ? (
      <span
        className="contents"
        onClickCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          place.officesOnly("channels");
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
                  active={one.id === open}
                  unread={one.unread}
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
              {dms.map(({ person, summary: dm }) =>
                lobby ? (
                  <Row
                    key={person.id}
                    onClick={() => place.officesOnly("directMessages")}
                    active={false}
                    unread={0}
                    icon={<Face seed={person.id} size={20} presence={presenceOf(person.id)} />}
                    label={person.displayName}
                    trailing={<Lock className="size-3.5 text-faint" />}
                  />
                ) : (
                  <Row
                    key={person.id}
                    href={place.paths.chat(dmChannelId(me, person.id))}
                    active={open === dmChannelId(me, person.id)}
                    unread={dm?.unread ?? 0}
                    icon={<Face seed={person.id} size={20} presence={presenceOf(person.id)} />}
                    label={person.displayName}
                  />
                ),
              )}
              {dms.length === 0 ? (
                <div className="mx-1 mt-1 rounded-xl border border-dashed border-border-strong p-3">
                  <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                    {lobby ? t("lobbyAlone") : t("aloneHere")}
                  </p>
                  {canInvite && (
                    <Link
                      href={place.paths.people}
                      className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-[12.5px] font-medium text-background"
                    >
                      <UserPlus className="size-3.5" />
                      {t("invitePeople")}
                    </Link>
                  )}
                </div>
              ) : (
                canInvite && (
                  <Link href={place.paths.people} className={addRowClass}>
                    <span className={addIconClass}>
                      <UserPlus className="size-3.5" />
                    </span>
                    {t("invitePeople")}
                  </Link>
                )
              )}
            </Section>
          </nav>

          <PresenceDock floorHref={place.paths.floor} place={place.name} settingsHref={place.paths.settings} />
          <CommandPalette items={items} open={jump} onOpenChange={setJump} placeholder={t("jumpTo")} emptyMessage={t("noMatch")} />
        </>
      }
    >
      {/* The whole conversation takes a dropped image, the way any chat does. */}
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

        <Conversation
          key={`conversation-${open}`}
          lines={lines}
          me={me}
          more={state.more[open] ?? false}
          onOlder={() => chat.older(open)}
          firstUnread={firstUnread.channel === open ? firstUnread.id : null}
          onReact={(line, emoji, on) => chat.react(Number(line.id), emoji, on)}
          personCard={personCard}
          intro={
            pair && other ? (
              <ConversationIntro
                mark={<Face seed={other.id} size={64} presence={presenceOf(other.id)} />}
                title={other.displayName}
                body={t("dmIntro", { name: other.displayName })}
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
                        onClick={() => chat.say(open, t(open === "introductions" ? "starterIntro" : "starterHello"))}
                      >
                        {open === "introductions" ? t("introduceYourself") : t("sayHello")}
                      </Chip>
                      {canInvite && (
                        <Chip icon={<UserPlus />} onClick={() => router.push(place.paths.people)}>
                          {t("invitePeople")}
                        </Chip>
                      )}
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
          onSend={(text) => chat.say(open, text)}
          onFiles={onFiles}
          note={note ?? (state.slowDown ? t("slowDown") : null)}
        />

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
    </ShellView>
  );

  function introFor(id: string) {
    if (lobby) {
      if (id === "introductions") return t("lobbyIntroductions");
      if (id === "feedback") return t("lobbyFeedback");
      return t("lobbyGeneral");
    }
    return id === GENERAL_CHANNEL ? t("generalIntro", { office: place.name }) : t("channelIntro", { channel: id });
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

export function Row({
  href,
  onClick,
  active,
  unread,
  icon,
  label,
  trailing,
}: {
  href?: string;
  onClick?: () => void;
  active: boolean;
  unread: number;
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
      {unread > 0 && !active && (
        <span className="relative min-w-[18px] rounded-full bg-brand px-1.5 text-center text-[10.5px] font-semibold leading-[18px] text-brand-foreground tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} aria-current={active ? "page" : undefined} className={className}>
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
export function PersonCard({
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
        {detail && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{detail}</p>}
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
