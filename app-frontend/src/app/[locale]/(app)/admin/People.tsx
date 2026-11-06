"use client";

import { useCallback, useEffect, useState } from "react";
import { AtSign, Calendar, Clock, Globe, KeyRound, MoreHorizontal, Office, Pencil, People as PeopleIcon, Trash2 } from "web-shared/components/ui/icons";
import { IconButton } from "@/components/ui/IconButton";
import { Face } from "web-shared/components/ui/Face";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ShellView } from "@/components/app/AppShell";
import { api, type AdminPersonDetail } from "web-shared/lib/api";
import {
  Badge,
  Column,
  Country,
  DetailHeader,
  DetailState,
  DialogButton,
  Field,
  Flagged,
  Pick,
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
  PlanBadge,
  Slot,
} from "./pieces";
import type { ViewProps } from "./views";

/**
 * Everyone: accounts, and guests (kept for a week), whoever was around most
 * recently first. Picked, a person's page says where they are, how they sign
 * in, when they joined and were last around, and the offices they're in;
 * an account can be renamed or deleted from it.
 */
export function People({ summary, picked, pick, open, recount }: ViewProps) {
  const [guests, setGuests] = useState(false);
  const [typed, search, setTyped] = useSearch();
  const read = useCallback(
    (page: number) => api.adminPeople({ q: search, guests, page }).then(({ users, ...paging }) => ({ ...paging, items: users })),
    [search, guests],
  );
  const list = usePaged(read);

  return (
    <ShellView
      showDetail={!!picked}
      columnClassName="md:w-[360px]"
      column={
        <Column
          title="People"
          count={summary.counts.accounts + summary.counts.guests}
          search={{ value: typed, onChange: setTyped, placeholder: guests ? "Search by name" : "Search by name or email" }}
          tabs={
            <>
              <Tab active={!guests} onClick={() => setGuests(false)} count={summary.counts.accounts}>
                Accounts
              </Tab>
              <Tab active={guests} onClick={() => setGuests(true)} count={summary.counts.guests}>
                Guests
              </Tab>
            </>
          }
          loading={list.items === null}
          empty={list.error ? "Couldn't load them." : list.items?.length === 0 && (search ? "Nobody matches." : "Nobody yet.")}
          more={list.more}
        >
          {list.items?.map((person) => (
            <Row
              key={person.id}
              selected={person.id === picked}
              onClick={() => pick(person.id)}
              lead={<Face seed={person.id} size={38} />}
              title={<span className="truncate">{person.displayName}</span>}
              sub={<Flagged country={person.country}>{person.email ?? (guests ? "Guest" : "No email")}</Flagged>}
              aside={<Short at={person.lastActiveAt} />}
            />
          ))}
        </Column>
      }
    >
      {picked ? (
        <Person
          key={picked}
          id={picked}
          onBack={() => pick(null)}
          openOffice={(id) => open("offices", id)}
          onChanged={() => {
            void list.reload();
            recount();
          }}
          onDeleted={() => {
            pick(null);
            void list.reload();
            recount();
          }}
        />
      ) : (
        <Pick icon={<PeopleIcon />} title="Pick someone" note="Where they are, how they sign in, and the offices they're in show here." />
      )}
    </ShellView>
  );
}

function Person({
  id,
  onBack,
  openOffice,
  onChanged,
  onDeleted,
}: {
  id: string;
  onBack: () => void;
  openOffice: (id: string) => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<AdminPersonDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    api.adminPerson(id).then(
      (found) => live && setDetail(found),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [id, round]);

  if (!detail) return <DetailState error={failed ? "Couldn't load them." : undefined} />;
  const { person, offices } = detail;

  return (
    <>
      <DetailHeader
        onBack={onBack}
        lead={<Face seed={person.id} size={44} />}
        title={person.displayName}
        sub={person.email ?? "Guest"}
        actions={
          !person.guest && (
            <PersonActions
              id={person.id}
              name={person.displayName}
              email={person.email}
              onChanged={() => {
                setRound((n) => n + 1);
                onChanged();
              }}
              onDeleted={onDeleted}
            />
          )
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8">
          <Section title="About">
            <Properties>
              <Property icon={<Globe />} label="Country">
                <Country code={person.country} />
              </Property>
              <Property icon={<KeyRound />} label="Signs in with">
                {person.guest ? "Nothing: a guest" : person.google ? "Google" : "An email code"}
              </Property>
              {person.email && (
                <Property icon={<AtSign />} label="Email">
                  <a href={`mailto:${person.email}`} className="truncate hover:underline">
                    {person.email}
                  </a>
                </Property>
              )}
              <Property icon={<Calendar />} label="Joined">
                <When at={person.createdAt} />
              </Property>
              <Property icon={<Clock />} label="Last around">
                <When at={person.lastActiveAt} />
              </Property>
            </Properties>
          </Section>

          <Section title="Offices" aside={offices.length ? offices.length : undefined}>
            {offices.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-[13px] text-muted-foreground">In no office.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {offices.map((office) => (
                  <li key={office.id}>
                    <button
                      type="button"
                      onClick={() => openOffice(office.id)}
                      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-start transition-colors hover:bg-foreground/[0.025]"
                    >
                      <Face seed={office.id} size={30} square />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{office.name}</span>
                        <span className="block text-[12px] text-muted-foreground">
                          Joined <When at={office.joinedAt} />
                        </span>
                      </span>
                      <Slot width="w-16">
                        <Badge>{office.owner ? "Owner" : office.role === "admin" ? "Admin" : "Member"}</Badge>
                      </Slot>
                      <Slot width="w-28">
                        <PlanBadge office={office} />
                      </Slot>
                      <Office className="hidden size-4 text-faint sm:block" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}

/** Rename an account, or delete it. Deleting says what happens to the offices it owns. */
function PersonActions({
  id,
  name,
  email,
  onChanged,
  onDeleted,
}: {
  id: string;
  name: string;
  email: string | null;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [asking, setAsking] = useState<"rename" | "delete" | null>(null);
  const [typed, setTyped] = useState(name);
  const { busy, error, run, clear } = useRun();
  const close = () => {
    setAsking(null);
    clear();
  };

  return (
    <>
      <Menu align="end" width={200} trigger={<IconButton label="More" size="sm" tone="soft" icon={<MoreHorizontal />} />}>
        <MenuItem
          icon={<Pencil />}
          onSelect={() => {
            setTyped(name);
            setAsking("rename");
          }}
        >
          Rename
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger icon={<Trash2 />} onSelect={() => setAsking("delete")}>
          Delete account
        </MenuItem>
      </Menu>

      <Dialog
        open={asking === "rename"}
        onClose={close}
        title="Rename"
        description={email ?? undefined}
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton
              solid
              disabled={busy || !typed.trim() || typed.trim() === name}
              onClick={async () => {
                if (!(await run(() => api.adminRenamePerson(id, typed)))) return;
                close();
                onChanged();
              }}
            >
              Save
            </DialogButton>
          </>
        }
      >
        <Field value={typed} onChange={(event) => setTyped(event.target.value)} maxLength={30} />
        {error && <p className="mt-2 text-[12.5px] text-destructive">{error}</p>}
      </Dialog>

      <Dialog
        open={asking === "delete"}
        onClose={close}
        title={`Delete ${name}?`}
        description="Their sign-in, sessions and memberships go now. Offices they own pass to their longest-standing admin or member; an office with nobody else in it closes. An office on a paid plan that still renews has to be cancelled first. This can't be undone."
        closeLabel="Close"
        footer={
          <>
            <DialogButton onClick={close}>Cancel</DialogButton>
            <DialogButton
              danger
              disabled={busy}
              onClick={async () => {
                if (!(await run(() => api.adminDeletePerson(id)))) return;
                close();
                onDeleted();
              }}
            >
              Delete account
            </DialogButton>
          </>
        }
      >
        {error && <p className="text-[12.5px] text-destructive">{error}</p>}
      </Dialog>
    </>
  );
}
