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

export interface Invite {
  id: string;
  email: string | null;
  role: OfficeRole;
  createdAt: number;
  expiresAt: number;
}

export interface OfficeOverview {
  office: Office;
  members: Member[];
  invites: Invite[];
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
  counts: Record<"accounts" | "guests" | "offices" | "activeDay" | "activeWeek" | "newWeek" | "newMonth" | "withGoogle", number>;
  countries: Array<{ country: string; people: number }>;
  /** Sign-ups on each of the last 30 calendar days where the viewer is, oldest first. */
  signups: number[];
  /** Those days, as YYYY-MM-DD. */
  signupDays: string[];
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
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerCountry: string | null;
  here: number;
  members: Array<{ id: string; displayName: string; email: string | null; role: OfficeRole; joinedAt: number; lastActiveAt: number; country: string | null }>;
}

export type PlanId = "free" | "team" | "business";
export type BillingInterval = "month" | "year";

export interface Plan {
  id: PlanId;
  seats: number;
  /** US cents before tax; null for the free plan. */
  prices: Record<BillingInterval, number> | null;
}

/** The plans, and — where paid plans are on — what Paddle.js needs to open a checkout. */
export interface Plans {
  plans: Plan[];
  billing: { environment: "sandbox" | "production"; clientToken: string } | null;
}

/** An office's plan, as its admins see it in settings. */
export interface OfficeBilling {
  plan: PlanId;
  seats: number;
  members: number;
  subscription: {
    plan: PlanId;
    interval: BillingInterval;
    /** active, trialing, past_due (a card being retried) or paused. */
    status: string;
    renewsAt: number | null;
    /** Set once it's cancelled: the plan runs until then. */
    endsAt: number | null;
  } | null;
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
  signInWithGoogle: (from: { code: string }) => post<{ user: SessionUser; created: boolean }>("/auth/google", from),
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
  adminPeople: (params: { q?: string; guests?: boolean; before?: number }) =>
    get<{ users: AdminPerson[]; more: boolean }>(
      `/admin/users?${new URLSearchParams({
        ...(params.q ? { q: params.q } : {}),
        ...(params.guests ? { guests: "1" } : {}),
        ...(params.before ? { before: String(params.before) } : {}),
      })}`,
    ),
  adminOffices: (before?: number) =>
    get<{ offices: AdminOffice[]; more: boolean }>(`/admin/offices${before ? `?before=${before}` : ""}`),
  adminLobbyChat: (channel: string, before?: number) =>
    get<LobbyChatPage>(`/admin/lobby-chat?${new URLSearchParams({ channel, ...(before ? { before: String(before) } : {}) })}`),
  adminEditLobbyMessage: (seq: number, body: string) => patch<{ ok: true }>(`/admin/lobby-chat/${seq}`, { body }),
  adminDeleteLobbyMessage: (seq: number) => del<{ ok: true }>(`/admin/lobby-chat/${seq}`),

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
  /** A checkout made by the API for this office, to open in Paddle.js. */
  checkout: (officeId: string, plan: PlanId, interval: BillingInterval) =>
    post<{ transactionId: string; email: string | null }>(`/offices/${id(officeId)}/billing/checkout`, { plan, interval }),
  /** After paying: the plan from Paddle's record of that checkout, without waiting for the webhook. */
  syncCheckout: (officeId: string, transactionId: string) =>
    post<OfficeBilling>(`/offices/${id(officeId)}/billing/sync`, { transactionId }),
  changePlan: (officeId: string, plan: PlanId, interval: BillingInterval) =>
    post<OfficeBilling>(`/offices/${id(officeId)}/billing/change`, { plan, interval }),
  cancelPlan: (officeId: string) => post<OfficeBilling>(`/offices/${id(officeId)}/billing/cancel`),
  resumePlan: (officeId: string) => post<OfficeBilling>(`/offices/${id(officeId)}/billing/resume`),
  billingPortal: (officeId: string) => post<{ url: string }>(`/offices/${id(officeId)}/billing/portal`),
  setRole: (officeId: string, userId: string, role: OfficeRole) =>
    patch<{ ok: true }>(`/offices/${id(officeId)}/members/${id(userId)}`, { role }),
  removeMember: (officeId: string, userId: string) =>
    del<{ ok: true }>(`/offices/${id(officeId)}/members/${id(userId)}`),
  handOver: (officeId: string, userId: string) => post<{ ok: true }>(`/offices/${id(officeId)}/transfer`, { userId }),

  // Invitations
  createInvite: (officeId: string, body: { role: OfficeRole; email?: string }) =>
    post<{ invite: Invite & { token: string } }>(`/offices/${id(officeId)}/invites`, body),
  revokeInvite: (officeId: string, inviteId: string) =>
    del<{ ok: true }>(`/offices/${id(officeId)}/invites/${id(inviteId)}`),
  invitePreview: (token: string) =>
    get<{ invite: { officeId: string; officeName: string; members: number; invitedBy: string; role: OfficeRole; expiresAt: number; full: boolean } }>(
      `/invites/${id(token)}`,
    ),
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
