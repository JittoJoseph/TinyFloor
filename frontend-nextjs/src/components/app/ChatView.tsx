"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ChevronDown, Hash, MessageSquare, Plus, Search, SquarePen, UserPlus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { GENERAL_CHANNEL, cleanChannelName, dmChannelId, dmMembers, type ChannelSummary } from "@shared/chat";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { chat } from "@/lib/ChatSocket";
import { useChat } from "@/lib/useChat";
import { useFloorStatus } from "@/lib/floor";
import { officeChatPath, officePath, officePeoplePath } from "@/lib/links";
import type { Member } from "@/lib/api";
import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { Face, FaceStack, type Presence } from "@/components/ui/Face";
import { IconButton, Kbd } from "@/components/ui/IconButton";
import { Menu, MenuHeader, MenuItem } from "@/components/ui/Menu";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ShellView } from "./AppShell";
import { PresenceDock } from "./PresenceDock";
import { useOffice } from "./OfficeShell";
import { Conversation, ConversationIntro, type Line } from "./chat/Conversation";
import { Composer } from "./chat/Composer";

/** The office's chat: channels and direct messages, beside the floor. */
export function ChatView({ channel }: { channel?: string }) {
  const t = useTranslations("chat");
  const ts = useTranslations("shell");
  const router = useRouter();
  const { office, members } = useOffice();
  const state = useChat();
  const floor = useFloorStatus();
  const [jump, setJump] = useState(false);

  const open = channel ?? GENERAL_CHANNEL;
  const me = state.me;
  const memberById = useMemo(() => new Map(members.map((one) => [one.id, one])), [members]);
  const summary = state.channels.find((one) => one.id === open);
  const pair = dmMembers(open);
  const other = pair ? memberById.get(pair[0] === me ? pair[1] : pair[0]) : undefined;
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

  const channels = state.channels.filter((one) => one.kind === "channel");
  const people = useDirectMessages(members, state.channels, me);
  const presenceOf = (id: string): Presence => floor.get(id) ?? null;

  const lines: Line[] = (history ?? []).map((message) => ({
    id: String(message.seq),
    author: message.author,
    authorName: memberById.get(message.author)?.displayName ?? message.authorName,
    body: message.body,
    at: message.at,
    image: message.image,
    reactions: message.reactions,
  }));

  const title = pair ? (other?.displayName ?? summary?.name ?? "") : (summary?.name ?? open);
  const go = (id: string) => router.push(officeChatPath(office.id, id));

  const personCard = (id: string, name: string, trigger: ReactNode) => (
    <PersonCard
      id={id}
      name={memberById.get(id)?.displayName ?? name}
      detail={memberById.get(id)?.email ?? undefined}
      role={memberById.get(id)?.role}
      presence={presenceOf(id)}
      isMe={id === me}
      onMessage={() => go(dmChannelId(me, id))}
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
    ...people.map((person) => ({
      id: person.member.id,
      label: person.member.displayName,
      group: t("directMessages"),
      keywords: [person.member.email ?? ""],
      badge: <Face seed={person.member.id} size={18} presence={presenceOf(person.member.id)} />,
      onSelect: () => go(dmChannelId(me, person.member.id)),
    })),
  ];

  return (
    <ShellView
      showDetail={!!channel}
      column={
        <>
          <header className="flex h-14 shrink-0 items-center gap-2 px-4">
            <h2 className="me-auto truncate text-[15px] font-semibold tracking-tight text-foreground">{office.name}</h2>
            <NewChannel onMade={go} />
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
                  href={officeChatPath(office.id, one.id)}
                  active={one.id === open}
                  unread={one.unread}
                  icon={<Hash className="size-4" />}
                  label={one.name}
                />
              ))}
            </Section>

            <Section title={t("directMessages")}>
              {people.map(({ member, summary: dm }) => (
                <Row
                  key={member.id}
                  href={officeChatPath(office.id, dmChannelId(me, member.id))}
                  active={open === dmChannelId(me, member.id)}
                  unread={dm?.unread ?? 0}
                  icon={<Face seed={member.id} size={20} presence={presenceOf(member.id)} />}
                  label={member.displayName}
                />
              ))}
              {people.length === 0 && <p className="px-3 py-1.5 text-[12.5px] text-muted-foreground">{t("aloneHere")}</p>}
              {office.role === "admin" && (
                <Link
                  href={officePeoplePath(office.id)}
                  className="flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
                >
                  <span className="flex size-5 items-center justify-center rounded-md bg-muted">
                    <UserPlus className="size-3.5" />
                  </span>
                  {t("invitePeople")}
                </Link>
              )}
            </Section>
          </nav>

          <PresenceDock floorHref={officePath(office.id)} place={office.name} />
          <CommandPalette
            items={items}
            open={jump}
            onOpenChange={setJump}
            placeholder={t("jumpTo")}
            emptyMessage={t("noMatch")}
          />
        </>
      }
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-5">
        <IconButton
          label={ts("back")}
          size="sm"
          className="md:hidden"
          onClick={() => router.push(officeChatPath(office.id))}
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
        {!pair && (
          <Link
            href={officePeoplePath(office.id)}
            className="flex h-8 items-center gap-2 rounded-full border border-border px-1 pe-2.5 transition-colors hover:bg-muted [--face-ring:var(--ui-card)]"
            title={t("members", { count: members.length })}
          >
            <FaceStack seeds={members.map((one) => one.id)} size={22} max={3} />
            <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground">{members.length}</span>
          </Link>
        )}
      </header>

      <Conversation
        key={open}
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
            />
          ) : (
            <ConversationIntro
              mark={
                <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <Hash className="size-7" />
                </span>
              }
              title={t("channelIntroTitle", { channel: title })}
              body={open === GENERAL_CHANNEL ? t("generalIntro", { office: office.name }) : t("channelIntro", { channel: title })}
            />
          )
        }
      />

      <Composer
        key={open}
        placeholder={pair ? t("sayTo", { name: title }) : t("say", { channel: `#${title}` })}
        onSend={(text) => chat.say(open, text)}
        attachNote={office.plan === "free" ? t("attachmentsPaid") : t("attachmentsSoon")}
      />
    </ShellView>
  );
}

/**
 * Everyone you could write to, not just the ones you have: people you have
 * talked to lately first, then everyone else by name.
 */
function useDirectMessages(members: Member[], channels: ChannelSummary[], me: string) {
  return useMemo(() => {
    const dms = new Map<string, ChannelSummary>();
    for (const one of channels) {
      const pair = one.kind === "dm" ? dmMembers(one.id) : null;
      if (pair) dms.set(pair[0] === me ? pair[1] : pair[0], one);
    }
    return members
      .filter((one) => one.id !== me)
      .map((member) => ({ member, summary: dms.get(member.id) }))
      .sort((a, b) => {
        const at = (b.summary?.lastAt ?? 0) - (a.summary?.lastAt ?? 0);
        return at !== 0 ? at : a.member.displayName.localeCompare(b.member.displayName);
      });
  }, [members, channels, me]);
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
  active,
  unread,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  unread: number;
  icon: ReactNode;
  label: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors",
        active
          ? "text-foreground [--face-ring:var(--ui-muted)]"
          : unread
            ? "font-semibold text-foreground hover:bg-foreground/[0.05]"
            : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId="chat-row"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-lg bg-muted"
        />
      )}
      <span className="relative flex size-5 shrink-0 items-center justify-center">{icon}</span>
      <span className="relative min-w-0 flex-1 truncate">{label}</span>
      {unread > 0 && !active && (
        <span className="relative min-w-[18px] rounded-full bg-brand px-1.5 text-center text-[10.5px] font-semibold leading-[18px] text-brand-foreground tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}

/** A channel is made by naming it. */
function NewChannel({ onMade }: { onMade: (id: string) => void }) {
  const t = useTranslations("chat");
  const [name, setName] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const clean = cleanChannelName(name);
  return (
    <Menu
      align="end"
      width={272}
      trigger={<IconButton label={t("newChannel")} size="sm" icon={<SquarePen />} bare className="[&_svg]:size-4" />}
    >
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
        <label className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 focus-within:border-border-strong">
          <Hash className="size-3.5 text-muted-foreground" />
          <input
            ref={input}
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("channelName")}
            className="min-w-0 flex-1 bg-transparent text-[16px] md:text-[13px] text-foreground outline-none placeholder:text-faint"
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
  trigger,
}: {
  id: string;
  name: string;
  detail?: string;
  role?: string;
  presence: Presence;
  isMe: boolean;
  onMessage?: () => void;
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
          {[role ? tr(role as "admin" | "member") : null, presence ? t("onFloorShort") : t("notOnFloor")].filter(Boolean).join(" · ")}
        </p>
        {detail && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{detail}</p>}
      </MenuHeader>
      {!isMe && onMessage && (
        <MenuItem icon={<MessageSquare />} onSelect={onMessage}>
          {t("message")}
        </MenuItem>
      )}
    </Menu>
  );
}
