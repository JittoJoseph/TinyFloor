"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Chats, CreditCard, Floor as FloorIcon, MoreHorizontal, Office as OfficeIcon, Pencil, Trash2, X } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "@/components/ui/Face";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { Logo, ShellView } from "@/components/app/AppShell";
import { api, type AdminOffice, type AdminOfficeDetail, type AdminStanding, type PlanId } from "@/lib/api";
import { usePlans } from "@/lib/billing";
import { cn } from "@/lib/utils";
import {
  Badge,
  Column,
  DetailHeader,
  DetailState,
  DialogButton,
  Field,
  Figure,
  Figures,
  Flag,
  hours,
  Flagged,
  Live,
  Pick,
  PlanBadge,
  planName,
  Properties,
  Property,
  Row,
  Section,
  Short,
  Slot,
  Tab,
  usePaged,
  useRun,
  useSearch,
  When,
} from "./pieces";
import { CloseTicket, Messages, Reply, useTicket } from "./Thread";
import type { ViewProps } from "./views";

type Filter = "all" | AdminStanding;

/** The tabs over the list, by standing; Given only while some office is. */
const FILTERS: Array<{ id: AdminStanding; label: string }> = [
  { id: "paying", label: "Paying" },
  { id: "trial", label: "Trial" },
  { id: "given", label: "Given" },
  { id: "free", label: "Free" },
];

/**
 * Every office, the one with someone around most recently first: all of
 * them, or those paying, on the trial, given a plan by hand, or free. A row
 * has the office's name and owner, where the owner is and when anyone was
 * last around, and its plan as it has it. Picked, an office's page has its
 * figures (seats, meeting hours, who's on the floor), how it has its plan,
 * and its people; it can be renamed, given a plan without payment, or closed.
 */
export function Offices({ summary, picked, pick, open, recount }: ViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [typed, search, setTyped] = useSearch();
  const read = useCallback(
    (page: number) => api.adminOffices({ q: search, page, ...(filter === "all" ? {} : { standing: filter }) }).then(({ offices, ...paging }) => ({ ...paging, items: offices })),
    [search, filter],
  );
  const list = usePaged(read);
  const { offices } = summary.counts;

  return (
    <ShellView
      showDetail={!!picked}
      columnClassName="md:w-[360px]"
      column={
        <Column
          title="Offices"
          count={offices}
          search={{ value: typed, onChange: setTyped, placeholder: "Search by name or owner's email" }}
          tabs={
            <>
              <Tab active={filter === "all"} onClick={() => setFilter("all")} count={offices}>
                All
              </Tab>
              {FILTERS.map(
                (one) =>
                  (one.id !== "given" || summary.standings.given > 0 || filter === "given") && (
                    <Tab key={one.id} active={filter === one.id} onClick={() => setFilter(one.id)} count={summary.standings[one.id]}>
                      {one.label}
                    </Tab>
                  ),
              )}
            </>
          }
          loading={list.items === null}
          empty={list.error ? "Couldn't load them." : list.items?.length === 0 && (search ? "No office matches." : "No offices here.")}
          more={list.more}
        >
          {list.items?.map((office) => (
            <Row
              key={office.id}
              selected={office.id === picked}
              onClick={() => pick(office.id)}
              lead={<OfficeMark id={office.id} members={office.members} />}
              title={
                <>
                  <span className="truncate">{office.name}</span>
                  {office.floor === NEW_FLOOR && <Badge small>New floor</Badge>}
                </>
              }
              sub={<Flagged country={office.ownerCountry}>{office.ownerEmail ?? "No owner"}</Flagged>}
              aside={office.here > 0 ? <Live>{office.here} here</Live> : office.lastActiveAt ? <Short at={office.lastActiveAt} /> : "Never"}
              below={<PlanBadge office={office} />}
            />
          ))}
        </Column>
      }
    >
      {picked ? (
        <Office
          key={picked}
          id={picked}
          onBack={() => pick(null)}
          openPerson={(id) => open("people", id)}
          onChanged={() => {
            void list.reload();
            recount();
          }}
          onClosed={() => {
            pick(null);
            void list.reload();
            recount();
          }}
        />
      ) : (
        <Pick icon={<OfficeIcon />} title="Pick an office" note="Its seats, meeting hours, plan and people show here." />
      )}
    </ShellView>
  );
}

/**
 * An office's mark in the list, with how many are in it on its corner: only
 * for a team, so the many offices of one person stay quiet and teams stand out.
 */
function OfficeMark({ id, members }: { id: string; members: number }) {
  return (
    <span className="relative block">
      <Face seed={id} size={38} square />
      {members > 1 && (
        <span
          title={`${members} people`}
          className="absolute -bottom-1 -end-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--face-ring,var(--ui-card))] px-1 text-[10.5px] font-semibold tabular-nums text-foreground shadow-[0_0_0_2px_var(--face-ring,var(--ui-card)),inset_0_0_0_1px_var(--ui-border-strong)]"
        >
          {members}
        </span>
      )}
    </span>
  );
}

/** The floors while offices move to the new one (shared-protocol map.ts FLOORS); once they all have, this goes. */
const OLD_FLOOR = "startup";
const NEW_FLOOR = "campus";

function Office({
  id,
  onBack,
  openPerson,
  onChanged,
  onClosed,
}: {
  id: string;
  onBack: () => void;
  openPerson: (id: string) => void;
  onChanged: () => void;
  onClosed: () => void;
}) {
  const [detail, setDetail] = useState<AdminOfficeDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);
  const plans = usePlans();
  // The conversation sits beside the office where there's room, and over it, on a button, where there isn't.
  const [chatting, setChatting] = useState(() => window.matchMedia("(min-width: 1024px)").matches);

  useEffect(() => {
    let live = true;
    api.adminOffice(id).then(
      (found) => live && setDetail(found),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, round]);

  if (!detail) return <DetailState error={failed ? "Couldn't load this office." : undefined} />;
  const { office, members } = detail;
  const allowance = plans?.plans.find((plan) => plan.id === office.plan)?.meetingHours;
  const seats = office.seats > 0 ? Math.min(1, office.members / office.seats) : 0;

  return (
    <div className="relative flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <DetailHeader
          onBack={onBack}
          lead={<Face seed={office.id} size={44} square />}
          title={office.name}
          sub={
            <>
              Made <When at={office.createdAt} />
            </>
          }
          actions={
            <>
              <IconButton label="Conversation" size="sm" tone={chatting ? "solid" : "soft"} icon={<Chats />} onClick={() => setChatting((now) => !now)} />
              <OfficeActions
                office={office}
                onChanged={() => {
                  setRound((n) => n + 1);
                  onChanged();
                }}
                onClosed={onClosed}
              />
            </>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8">
            <Figures>
              <Figure
                label="Seats"
                value={
                  <>
                    {office.members}
                    <span className="text-faint"> / {office.seats}</span>
                  </>
                }
                note={
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                    <span className={cn("block h-full rounded-full", seats >= 1 ? "bg-warn" : "bg-foreground/60")} style={{ width: `${seats * 100}%` }} />
                  </span>
                }
              />
              <Figure
                label="Meeting hours"
                value={
                  <>
                    {hours(office.meetingSeconds)}
                    {allowance !== undefined && <span className="text-faint"> / {allowance}</span>}
                  </>
                }
                note="This month"
              />
              <Figure label="On the floor" value={office.here > 0 ? <span className="text-ok">{office.here}</span> : "0"} note={office.here > 0 ? "Right now" : "Nobody now"} />
              <Figure label="Last active" value={office.here > 0 ? "Now" : office.lastActiveAt ? <When at={office.lastActiveAt} /> : "Never"} />
            </Figures>

            <Section title="Floor">
              <FloorStatus
                office={office}
                onMoved={() => {
                  setRound((n) => n + 1);
                  onChanged();
                }}
              />
            </Section>

            <Section title="Plan">
              <Properties>
                <Property icon={<CreditCard />} label="Plan">
                  <PlanBadge office={office} />
                </Property>
                <Property icon={<CreditCard />} label="Paid">
                  {office.standing === "trial"
                    ? "Nothing yet: on the free trial"
                    : office.standing === "given"
                      ? "Given without payment"
                      : office.standing === "free"
                        ? "Nothing"
                        : office.billing === "past_due"
                          ? "Through Creem; the last card payment failed"
                          : office.cancelAt
                            ? "Through Creem, until it ends"
                            : "Through Creem"}
                </Property>
                {office.standing === "trial" && !!office.trialEndsAt && (
                  <Property icon={<Calendar />} label="Trial ends">
                    <When at={office.trialEndsAt} />
                  </Property>
                )}
                {office.cancelAt && (
                  <Property icon={<Calendar />} label="Ends">
                    <When at={office.cancelAt} />
                  </Property>
                )}
              </Properties>
            </Section>

            <Section title="People" aside={members.length}>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {members.map((member) => (
                  <li key={member.id}>
                    <button
                      type="button"
                      onClick={() => openPerson(member.id)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-start transition-colors hover:bg-foreground/[0.025]"
                    >
                      <Face seed={member.id} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{member.displayName}</span>
                        {member.email && <span className="block truncate text-[12px] text-muted-foreground">{member.email}</span>}
                      </span>
                      <Slot width="w-5">{member.country && <Flag code={member.country} />}</Slot>
                      <Slot width="w-16">
                        <Badge>{member.owner ? "Owner" : member.role === "admin" ? "Admin" : "Member"}</Badge>
                      </Slot>
                      <span className="hidden w-16 shrink-0 justify-end text-[12px] tabular-nums text-muted-foreground sm:flex">
                        {member.here ? <Live>Here</Live> : <Short at={member.lastActiveAt} />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      </div>
      {chatting && <OfficeChat key={office.id} office={office} ticket={detail.ticket} onHide={() => setChatting(false)} />}
    </div>
  );
}

/**
 * Which floor the office is on, while the new one reaches offices one at a
 * time: on the old floor, with converting it to the new as the action, or on
 * the new, with going back. Either way it asks first: everyone on it
 * reconnects to the other floor, and each claimed desk moves to the nearest
 * free desk there.
 */
function FloorStatus({ office, onMoved }: { office: AdminOffice; onMoved: () => void }) {
  const [asking, setAsking] = useState(false);
  const { busy, error, run, clear } = useRun();
  const converted = office.floor === NEW_FLOOR;
  const to = converted ? OLD_FLOOR : NEW_FLOOR;
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 rounded-xl border border-border px-3.5 py-3">
        <FloorIcon className="size-4 shrink-0 text-faint" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium">{converted ? "New floor" : "Old floor"}</span>
          <span className="block text-[12.5px] text-muted-foreground">{converted ? "Campus, with the new layout and camera" : "Startup, the original office"}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            clear();
            setAsking(true);
          }}
          className={cn(
            "h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
            converted ? "border border-border-strong text-foreground hover:bg-muted" : "bg-foreground text-background hover:opacity-90",
          )}
        >
          {converted ? "Revert to old floor" : "Convert to new floor"}
        </button>
      </div>
      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        title={converted ? `Revert ${office.name} to the old floor?` : `Convert ${office.name} to the new floor?`}
        description={
          converted
            ? "Everyone there reconnects to the old floor, and each claimed desk moves to the nearest free desk on it. You can convert it again later."
            : "Everyone there reconnects to the new floor, and each claimed desk moves to the nearest free desk on it. You can revert it later."
        }
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={() => setAsking(false)}>Cancel</DialogButton>
            <DialogButton
              solid
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => api.adminUpdateOffice(office.id, { floor: to })))) return;
                setAsking(false);
                onMoved();
              }}
            >
              {converted ? "Revert" : "Convert"}
            </DialogButton>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </>
  );
}

/**
 * The office's conversation with the team, beside its page: what's been
 * said, and the team's next words. With none open, writing starts one: it
 * turns up in Chat for everyone in the office, as the TinyFloor team, and
 * notifies them.
 */
function OfficeChat({ office, ticket, onHide }: { office: AdminOffice; ticket: AdminOfficeDetail["ticket"]; onHide: () => void }) {
  const [id, setId] = useState(ticket?.id ?? null);
  const { detail, reload, setDetail } = useTicket(id);
  const open = detail?.ticket.status === "open";
  return (
    <aside className="absolute inset-0 z-20 flex flex-col bg-card lg:static lg:z-auto lg:w-[380px] lg:shrink-0 lg:border-s lg:border-border">
      <header className="flex min-h-[76px] shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold tracking-tight">Conversation</h3>
          <p className="truncate text-[12.5px] text-muted-foreground">
            {!id ? "Nothing said yet" : !detail ? "Reading" : open ? `Open, in ${office.name}'s Chat` : "Closed"}
          </p>
        </div>
        {open && (
          <CloseTicket
            id={id!}
            whose={`${office.name}'s`}
            onClosed={() => setDetail((now) => now && { ...now, ticket: { ...now.ticket, status: "closed", closedAt: Date.now() } })}
          />
        )}
        <IconButton label="Hide" size="sm" icon={<X />} onClick={onHide} />
      </header>
      {id && !detail ? (
        <DetailState />
      ) : (
        <Messages
          messages={detail?.messages ?? []}
          empty={
            <div className="max-w-64">
              <Logo size={40} className="mx-auto" />
              <p className="mt-3 text-[14px] font-semibold">Nothing said with {office.name} yet</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">Write first: it shows in Chat for everyone there, from the TinyFloor team, and notifies them.</p>
            </div>
          }
        />
      )}
      <Reply
        placeholder={`Message everyone in ${office.name}`}
        note={open ? "Ctrl+Enter sends." : "Starts a conversation in their Chat."}
        send={async (text) => {
          if (open) await api.adminHelpReply(id!, text);
          else setId((await api.adminWriteToOffice(office.id, text)).id);
          reload();
        }}
      />
    </aside>
  );
}

/**
 * The things that change an office, kept out of the way: behind a menu, and
 * the two that matter (a plan without payment, closing it) only once the
 * office's name has been typed out. A plan can't be given while the office
 * pays through Creem, and a plan that still renews has to be cancelled
 * before the office can close.
 */
function OfficeActions({ office, onChanged, onClosed }: { office: AdminOffice; onChanged: () => void; onClosed: () => void }) {
  const [asking, setAsking] = useState<"rename" | "plan" | "close" | null>(null);
  const [name, setName] = useState(office.name);
  const [plan, setPlan] = useState<PlanId>(office.plan as PlanId);
  const [typed, setTyped] = useState("");
  const { busy, error, run, clear } = useRun();
  const paid = !!office.billing;
  const confirmed = typed.trim() === office.name;

  const ask = (what: "rename" | "plan" | "close") => {
    setName(office.name);
    setPlan(office.plan as PlanId);
    setTyped("");
    clear();
    setAsking(what);
  };
  const close = () => setAsking(null);
  const act = async (action: () => Promise<unknown>, after: () => void) => {
    if (!(await run(action))) return;
    close();
    after();
  };

  const typeToConfirm = (
    <label className="mt-4 block">
      <span className="text-[12.5px] text-muted-foreground">
        Type <span className="font-semibold text-foreground">{office.name}</span> to confirm
      </span>
      <span className="mt-1.5 block">
        <Field value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} />
      </span>
    </label>
  );
  const problem = error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>;

  return (
    <>
      <Menu align="end" width={240} trigger={<IconButton label="Manage" size="sm" tone="soft" icon={<MoreHorizontal />} />}>
        <MenuItem icon={<Pencil />} onSelect={() => ask("rename")}>
          Rename
        </MenuItem>
        <MenuItem icon={<CreditCard />} disabled={paid} onSelect={() => ask("plan")} hint={paid ? "Pays through Creem" : undefined}>
          Change plan without payment
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger icon={<Trash2 />} onSelect={() => ask("close")}>
          Close office
        </MenuItem>
      </Menu>

      <Dialog
        open={asking === "rename"}
        onClose={close}
        title="Rename office"
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton solid disabled={busy || !name.trim() || name.trim() === office.name} onClick={() => act(() => api.adminUpdateOffice(office.id, { name }), onChanged)}>
              Save
            </DialogButton>
          </>
        }
      >
        <Field value={name} onChange={(event) => setName(event.target.value)} maxLength={48} />
        {problem}
      </Dialog>

      <Dialog
        open={asking === "plan"}
        onClose={close}
        title="Change plan without payment"
        description="The office gets the plan's seats and meeting hours at once, and nobody is charged. Use it for friends, partners and support cases."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton solid disabled={busy || !confirmed || plan === office.plan} onClick={() => act(() => api.adminUpdateOffice(office.id, { plan }), onChanged)}>
              Change plan
            </DialogButton>
          </>
        }
      >
        <div role="radiogroup" aria-label="Plan" className="flex h-10 items-center rounded-full bg-muted p-1">
          {(["free", "pro"] as PlanId[]).map((one) => (
            <button
              key={one}
              type="button"
              role="radio"
              aria-checked={plan === one}
              onClick={() => setPlan(one)}
              className={cn(
                "h-8 flex-1 cursor-pointer rounded-full text-[13px] font-medium transition-colors",
                plan === one ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {planName(one)}
              {office.plan === one && <span className="text-muted-foreground"> · now</span>}
            </button>
          ))}
        </div>
        {typeToConfirm}
        {problem}
      </Dialog>

      <Dialog
        open={asking === "close"}
        onClose={close}
        title={`Close ${office.name}?`}
        description="Its floor, chat, members and invite link go now, for everyone in it. A plan that still renews has to be cancelled first; one already cancelled ends straight away. This can't be undone."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton danger disabled={busy || !confirmed} onClick={() => act(() => api.adminDeleteOffice(office.id), onClosed)}>
              Close office
            </DialogButton>
          </>
        }
      >
        {typeToConfirm}
        {problem}
      </Dialog>
    </>
  );
}
