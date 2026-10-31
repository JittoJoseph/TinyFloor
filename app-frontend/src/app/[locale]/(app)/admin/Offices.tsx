"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CreditCard, MoreHorizontal, Office as OfficeIcon, Pencil, Trash2 } from "@/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "@/components/ui/Face";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ShellView } from "@/components/app/AppShell";
import { api, type AdminOffice, type AdminOfficeDetail, type PlanId } from "@/lib/api";
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
  Live,
  Pick,
  planName,
  Properties,
  Property,
  Row,
  Section,
  Short,
  Tab,
  usePaged,
  useRun,
  useSearch,
  When,
} from "./pieces";
import type { ViewProps } from "./views";

type Filter = "all" | "pro" | "free";

/**
 * Every office, the one with someone around most recently first: all of
 * them, those on Pro, or the free ones. Picked, an office's page has its
 * figures (seats, meeting hours, who's on the floor), how it has its plan,
 * and its people; it can be renamed, given a plan without payment, or closed.
 */
export function Offices({ summary, picked, pick, open, recount }: ViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [typed, search, setTyped] = useSearch();
  const read = useCallback(
    (page: number) => api.adminOffices({ q: search, page, ...(filter === "all" ? {} : { plan: filter }) }).then(({ offices, ...paging }) => ({ ...paging, items: offices })),
    [search, filter],
  );
  const list = usePaged(read);
  const { offices, proOffices } = summary.counts;

  return (
    <ShellView
      showDetail={!!picked}
      columnClassName="md:w-[340px]"
      column={
        <Column
          title="Offices"
          count={offices}
          search={{ value: typed, onChange: setTyped, placeholder: "Search by name" }}
          tabs={
            <>
              <Tab active={filter === "all"} onClick={() => setFilter("all")} count={offices}>
                All
              </Tab>
              <Tab active={filter === "pro"} onClick={() => setFilter("pro")} count={proOffices}>
                Pro
              </Tab>
              <Tab active={filter === "free"} onClick={() => setFilter("free")} count={offices - proOffices}>
                Free
              </Tab>
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
              lead={<Face seed={office.id} size={36} square />}
              title={<span className="truncate">{office.name}</span>}
              sub={office.members === 1 ? "1 person" : `${office.members} people`}
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

/** The office's plan, and how it has it: paying (or behind on it, or stopping), or given by hand. */
function PlanBadge({ office }: { office: AdminOffice }) {
  if (office.plan === "free") return <Badge>Free</Badge>;
  if (office.billing === "past_due") return <Badge tone="danger">{planName(office.plan)} · card failed</Badge>;
  if (office.billing && office.cancelAt) return <Badge tone="warn">{planName(office.plan)} · ending</Badge>;
  if (office.billing) return <Badge tone="strong">{planName(office.plan)}</Badge>;
  return <Badge tone="ok">{planName(office.plan)} · given</Badge>;
}

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
    <>
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
          <OfficeActions
            office={office}
            onChanged={() => {
              setRound((n) => n + 1);
              onChanged();
            }}
            onClosed={onClosed}
          />
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

          <Section title="Plan">
            <Properties>
              <Property icon={<CreditCard />} label="Plan">
                <PlanBadge office={office} />
              </Property>
              <Property icon={<CreditCard />} label="Paid">
                {office.billing === "past_due"
                  ? "Through Creem; the last card payment failed"
                  : office.billing && office.cancelAt
                    ? "Through Creem, until it ends"
                    : office.billing
                      ? "Through Creem"
                      : office.plan !== "free"
                        ? "Given without payment"
                        : "Nothing"}
              </Property>
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
                    {member.country && <Flag code={member.country} />}
                    <Badge>{member.owner ? "Owner" : member.role === "admin" ? "Admin" : "Member"}</Badge>
                    <span className="hidden w-20 shrink-0 text-end text-[12px] text-muted-foreground sm:block">
                      {member.here ? <Live>Here</Live> : <Short at={member.lastActiveAt} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </>
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
