/**
 * The TinyFloor API (tinyfloor-api). Sessions are an HttpOnly cookie the browser
 * sends by itself, so nothing about signing in is kept in JavaScript.
 */
import type { LobbyChatPage, PresentPerson } from "@shared/admin";

export type { LobbyChatPage, PresentPerson };
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787/v1";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** The form field this is about, when there is one. */
    readonly field?: string,
  ) {
    super(message);
  }
}

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  character: string;
  guest: boolean;
  /** Has a password; someone who only signs in with Google doesn't, until they set one. */
  password?: boolean;
  /** Can sign in with Google. */
  google?: boolean;
  /** The link on their profile. */
  link?: string | null;
  /** Has said who they are on the floor. A new account hasn't, until its first door. */
  introduced?: boolean;
}

/** Someone's profile, as the people they chat with see it. */
export interface PersonProfile {
  id: string;
  displayName: string;
  link: string | null;
  guest: boolean;
}

export type OfficeRole = "admin" | "member";

export interface OfficeSummary {
  id: string;
  name: string;
  plan: string;
  seats: number;
  members: number;
  role: OfficeRole;
  /** Everyone in the office, oldest member first, for the dashboard (only from /v1/me). */
  team?: Array<{ id: string; displayName: string; role: OfficeRole }>;
  /** Who is on the floor right now (only from /v1/me). */
  here?: number;
  /** Who is on the floor right now, as they look (only from /v1/me). */
  inNow?: PresentPerson[];
  /** When the team trial ends, while one runs (docs/22): the plan is the trial's until then. */
  trialEndsAt?: number | null;
  /** Free, never trialled and never paid: past the free seats, the next person starts the trial (where plans are sold). */
  trialOpen?: boolean;
}

export interface Office extends OfficeSummary {
  /** Who holds the subscription. */
  owner: string;
}

export interface Member {
  id: string;
  displayName: string;
  character: string;
  email: string | null;
  role: OfficeRole;
  joinedAt: number;
}

export interface OfficeOverview {
  office: Office;
  members: Member[];
  /** How many people are on the floor right now. */
  people: number;
}

export interface RoomTicket {
  ticket: string;
  url: string;
}

export interface IceServers {
  iceServers: RTCIceServer[];
  expiresAt: number;
}

/** The admin view (open only to the admin accounts). */
export interface AdminSummary {
  counts: Record<"accounts" | "guests" | "offices" | "activeDay" | "activeWeek" | "newWeek" | "newMonth" | "withGoogle" | "helpUnread", number>;
  countries: Array<{ country: string; people: number }>;
  /** Sign-ups on each of the last 30 calendar days where the viewer is, oldest first. */
  signups: number[];
  /** Those days, as YYYY-MM-DD. */
  signupDays: string[];
  plans: {
    /** Offices paying through Creem, by plan. */
    paid: Record<string, number>;
    /** Offices on a paid plan given by hand, without payment. */
    given: number;
  };
  /** Meeting seconds used this month across every office. */
  meetingSeconds: number;
}

export interface AdminPerson {
  id: string;
  displayName: string;
  email: string | null;
  character: string;
  country: string | null;
  createdAt: number;
  lastActiveAt: number;
  google: number;
  password: number;
  offices: number;
}

export interface AdminOffice {
  id: string;
  name: string;
  plan: string;
  seats: number;
  createdAt: number;
  /** How many people are in it. */
  members: number;
  /** When anyone in it was last around; null for an office nobody is in. */
  lastActiveAt: number | null;
  /** The Creem subscription's status while it holds the plan (active, trialing, past_due, scheduled_cancel); null when nothing is paid. */
  billing: string | null;
  cancelAt: number | null;
  /** Meeting seconds used this month. */
  meetingSeconds: number;
  here: number;
}

/** Someone in an office, as the admin view shows them when it's opened. */
export interface AdminMember {
  id: string;
  displayName: string;
  email: string | null;
  role: OfficeRole;
  joinedAt: number;
  lastActiveAt: number;
  country: string | null;
  owner: number;
  /** On the office's floor right now. */
  here: boolean;
}

/** Help and feedback (docs/19): the open ticket with the TinyFloor team where you are. */
export interface HelpTicket {
  id: string;
  /** New since you last had it on screen; nothing until you have. */
  unread: number;
}

export interface HelpMessage {
  id: number;
  /** Who wrote it; null for the team. */
  author: string | null;
  mine: boolean;
  team: boolean;
  name: string;
  body: string;
  at: number;
}

export interface HelpTicketView {
  id: string;
  status: "open" | "closed";
  messages: HelpMessage[];
}

/** A ticket in the admin view's list. */
export interface AdminHelpTicket {
  id: string;
  /** The office's name then, or "Demo office". */
  place: string;
  officeId: string | null;
  lobby: boolean;
  /** Who opened it. */
  name: string;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
  /** Messages from them the team hasn't read. */
  unread: number;
  /** The latest message, shortened. */
  last: string;
}

/** A ticket opened in the admin view: who opened it, from where, and everything said. */
export interface AdminHelpDetail {
  ticket: Omit<AdminHelpTicket, "updatedAt" | "unread" | "last"> & {
    userId: string | null;
    email: string | null;
    page: string | null;
    userAgent: string | null;
    screen: string | null;
    locale: string | null;
    country: string | null;
    replay: string | null;
    status: "open" | "closed";
  };
  messages: HelpMessage[];
}

/** Where a ticket was opened from, for the team. */
export interface HelpContext {
  page: string;
  locale: string;
  screen: string;
  replay?: string | null;
}

/** A page of a list in the admin view. */
export interface AdminPage {
  page: number;
  pageSize: number;
  total: number;
}

export type PlanId = "free" | "plus" | "pro";
export interface Plan {
  id: PlanId;
  seats: number;
  /** Meeting hours a month: time a meeting has two or more people in it (docs/14). */
  meetingHours: number;
  /** US cents a month before tax; null for the free plan. */
  price: number | null;
}

/** The plans, and whether paid plans are on sale here (Creem's test mode or its live store). */
export interface Plans {
  plans: Plan[];
  billing: { mode: "test" | "live" } | null;
  /** How long the team trial runs where plans are on sale; 0 where there's none (docs/22). */
  trialDays: number;
}

/** An office's plan, as its admins see it in settings. */
export interface OfficeBilling {
  plan: PlanId;
  seats: number;
  members: number;
  meetingHours: number;
  /** Meeting seconds used this month (UTC), and when the count starts again. */
  usage: { seconds: number; resetsAt: number };
  /** The team trial, while it runs and nothing is paid (docs/22). */
  trial: { plan: PlanId; endsAt: number } | null;
  subscription: {
    plan: PlanId;
    /** active, trialing, past_due (a card being retried) or scheduled_cancel. */
    status: string;
    renewsAt: number | null;
    /** Set once it's cancelled: the plan runs until then. */
    endsAt: number | null;
  } | null;
}

export interface Payment {
  id: string;
  at: number;
  plan: PlanId | null;
  /** In the currency's smallest unit, tax included. */
  amount: number;
  currency: string;
  status: "paid" | "refunded" | "partly_refunded" | "failed" | "due";
  invoice: boolean;
}

/** The slower half of the billing page, from Creem. Creem keeps the card itself, so `card` is null. */
export interface BillingDetails {
  nextCharge: { at: number; amount: number; currency: string } | null;
  card: { brand: string; last4: string; expires: string | null } | null;
  history: Payment[];
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach TinyFloor. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown",
      error?.message ?? "Something went wrong",
      error?.field,
    );
  }
  return data as T;
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body: unknown = {}) => request<T>("POST", path, body);
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path, {});
const id = encodeURIComponent;

export const api = {
  // Signing in
  session: () => get<{ user: SessionUser | null }>("/session"),
  signUp: (body: { email: string; password: string; turnstileToken: string }) =>
    post<{ user: SessionUser }>("/auth/signup", body),
  signIn: (body: { email: string; password: string }) => post<{ user: SessionUser }>("/auth/login", body),
  /** Signs in with the one-time code from Google's popup, making an account the first time. */
  /** Google's popup code (the button), or One Tap's signed ID token. */
  signInWithGoogle: (from: { code: string } | { credential: string }) => post<{ user: SessionUser; created: boolean }>("/auth/google", from),
  continueAsGuest: (body: { name: string; character: string; turnstileToken: string }) =>
    post<{ user: SessionUser }>("/auth/guest", body),
  signOut: () => post<{ ok: true }>("/auth/logout"),

  // The signed-in person
  me: () => get<{ user: SessionUser; offices: OfficeSummary[] }>("/me"),
  updateMe: (body: { displayName?: string; character?: string; link?: string; introduced?: boolean }) => patch<{ user: SessionUser }>("/me", body),
  /** Connects a Google account to the signed-in account, with the code from Google's popup. */
  connectGoogle: (code: string) => post<{ user: SessionUser }>("/me/google", { code }),
  person: (id: string) => get<{ person: PersonProfile }>(`/people/${encodeURIComponent(id)}`),
  changePassword: (body: { currentPassword: string; newPassword: string }) => post<{ ok: true }>("/me/password", body),

  // The admin view
  adminSummary: () =>
    get<AdminSummary>(`/admin/summary?${new URLSearchParams({ tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}`),
  adminPeople: (params: { q?: string; guests?: boolean; page?: number }) =>
    get<AdminPage & { users: AdminPerson[] }>(
      `/admin/users?${new URLSearchParams({
        ...(params.q ? { q: params.q } : {}),
        ...(params.guests ? { guests: "1" } : {}),
        ...(params.page ? { page: String(params.page) } : {}),
      })}`,
    ),
  adminOffices: (params: { q?: string; page?: number }) =>
    get<AdminPage & { offices: AdminOffice[] }>(
      `/admin/offices?${new URLSearchParams({ ...(params.q ? { q: params.q } : {}), ...(params.page ? { page: String(params.page) } : {}) })}`,
    ),
  adminOfficeMembers: (officeId: string) => get<{ members: AdminMember[] }>(`/admin/offices/${id(officeId)}/members`),
  adminLobbyChat: (channel: string, before?: number) =>
    get<LobbyChatPage>(`/admin/lobby-chat?${new URLSearchParams({ channel, ...(before ? { before: String(before) } : {}) })}`),
  adminEditLobbyMessage: (seq: number, body: string) => patch<{ ok: true }>(`/admin/lobby-chat/${seq}`, { body }),
  adminDeleteLobbyMessage: (seq: number) => del<{ ok: true }>(`/admin/lobby-chat/${seq}`),
  adminRenamePerson: (userId: string, displayName: string) => patch<{ ok: true }>(`/admin/users/${id(userId)}`, { displayName }),
  adminDeletePerson: (userId: string) => del<{ ok: true; handedOver: string[]; closed: string[] }>(`/admin/users/${id(userId)}`),
  adminUpdateOffice: (officeId: string, changes: { name?: string; plan?: PlanId }) => patch<{ ok: true }>(`/admin/offices/${id(officeId)}`, changes),
  adminDeleteOffice: (officeId: string) => del<{ ok: true }>(`/admin/offices/${id(officeId)}`),
  adminHelp: (params: { status: "open" | "closed"; page?: number }) =>
    get<AdminPage & { tickets: AdminHelpTicket[] }>(
      `/admin/help?${new URLSearchParams({ status: params.status, ...(params.page ? { page: String(params.page) } : {}) })}`,
    ),
  adminHelpTicket: (ticketId: string) => get<AdminHelpDetail>(`/admin/help/${id(ticketId)}`),
  adminHelpReply: (ticketId: string, body: string) => post<{ ok: true }>(`/admin/help/${id(ticketId)}/messages`, { body }),
  adminHelpClose: (ticketId: string) => post<{ ok: true }>(`/admin/help/${id(ticketId)}/close`),

  // Help and feedback: the ticket with the team where you are (an office, or the demo office)
  helpOpen: (office?: string) => get<{ ticket: HelpTicket | null }>(`/help${office ? `?${new URLSearchParams({ office })}` : ""}`),
  /** Adds to the open ticket, or opens one. */
  sayToHelp: (body: { body: string; office?: string } & Partial<HelpContext>) => post<{ id: string }>("/help", body),
  /** A ticket on screen; reading it makes it read. */
  helpTicket: (ticketId: string) => get<HelpTicketView>(`/help/${id(ticketId)}`),

  // Offices
  createOffice: (name: string) => post<{ office: Office }>("/offices", { name }),
  office: (officeId: string) => get<{ office: Office }>(`/offices/${id(officeId)}`),
  /** The office, its people and its invitations in one request. */
  overview: (officeId: string) => get<OfficeOverview>(`/offices/${id(officeId)}/overview`),
  renameOffice: (officeId: string, name: string) => patch<{ office: Office }>(`/offices/${id(officeId)}`, { name }),
  closeOffice: (officeId: string) => del<{ ok: true }>(`/offices/${id(officeId)}`),

  // Paid plans (worker-api/src/billing.ts)
  plans: () => get<Plans>("/plans"),
  billing: (officeId: string) => get<OfficeBilling>(`/offices/${id(officeId)}/billing`),
  billingDetails: (officeId: string) => get<BillingDetails>(`/offices/${id(officeId)}/billing/details`),
  /** Creem's customer portal (card and invoices), for the person who pays for the plan. */
  billingPortal: (officeId: string) => post<{ url: string }>(`/offices/${id(officeId)}/billing/portal`),
  /** A checkout made by the API for this office, to open over the page. */
  checkout: (officeId: string, plan: PlanId) =>
    post<{ checkoutId: string; url: string }>(`/offices/${id(officeId)}/billing/checkout`, { plan }),
  /** After paying: the plan from Creem's record of that checkout, without waiting for the webhook. */
  syncCheckout: (officeId: string, checkoutId: string) =>
    post<OfficeBilling>(`/offices/${id(officeId)}/billing/sync`, { checkoutId }),
  changePlan: (officeId: string, plan: PlanId) => post<OfficeBilling>(`/offices/${id(officeId)}/billing/change`, { plan }),
  cancelPlan: (officeId: string) => post<OfficeBilling>(`/offices/${id(officeId)}/billing/cancel`),
  resumePlan: (officeId: string) => post<OfficeBilling>(`/offices/${id(officeId)}/billing/resume`),
  setRole: (officeId: string, userId: string, role: OfficeRole) =>
    patch<{ ok: true }>(`/offices/${id(officeId)}/members/${id(userId)}`, { role }),
  removeMember: (officeId: string, userId: string) =>
    del<{ ok: true }>(`/offices/${id(officeId)}/members/${id(userId)}`),
  handOver: (officeId: string, userId: string) => post<{ ok: true }>(`/offices/${id(officeId)}/transfer`, { userId }),

  // The office's one invite link (lib/inviteLink.ts)
  inviteLink: (officeId: string) => get<{ code: string }>(`/offices/${id(officeId)}/invite`),
  resetInviteLink: (officeId: string) => post<{ code: string }>(`/offices/${id(officeId)}/invite/reset`),
  invitePreview: (token: string) =>
    get<{ invite: { officeId: string; officeName: string; members: number; role: OfficeRole; full: boolean } }>(`/invites/${id(token)}`),
  acceptInvite: (token: string) => post<{ officeId: string }>(`/invites/${id(token)}/accept`),

  // Walking in, chatting, calling
  officeTicket: (officeId: string) => post<RoomTicket>(`/offices/${id(officeId)}/ticket`),
  chatTicket: (officeId: string) => post<RoomTicket>(`/offices/${id(officeId)}/chat-ticket`),
  lobbyTicket: () => post<RoomTicket>("/lobby/ticket"),
  lobbyChatTicket: () => post<RoomTicket>("/lobby/chat-ticket"),
  /** Who is in the public lobby right now, for its door. */
  lobbyPeople: () => get<{ here: number; faces: Array<{ id: string; name: string }> }>("/lobby"),
  iceServers: () => post<IceServers>("/calls/ice-servers"),
};
