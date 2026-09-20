/**
 * The TinyFloor API (tinyfloor-api). Sessions are an HttpOnly cookie the browser
 * sends by itself, so nothing about signing in is kept in JavaScript.
 */
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
}

export type OfficeRole = "admin" | "member";

export interface OfficeSummary {
  id: string;
  name: string;
  plan: string;
  seats: number;
  members: number;
  role: OfficeRole;
}

export interface Office extends OfficeSummary {
  /** How many people fit on the floor at once: members plus room for guests. */
  capacity: number;
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

export interface GuestLink {
  id: string;
  createdAt: number;
  expiresAt: number;
}

export interface OfficeOverview {
  office: Office;
  members: Member[];
  invites: Invite[];
  guestLinks: GuestLink[];
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
  signUp: (body: { email: string; password: string; displayName: string; character: string; turnstileToken: string }) =>
    post<{ user: SessionUser }>("/auth/signup", body),
  signIn: (body: { email: string; password: string }) => post<{ user: SessionUser }>("/auth/login", body),
  continueAsGuest: (body: { name: string; character: string; turnstileToken: string }) =>
    post<{ user: SessionUser }>("/auth/guest", body),
  signOut: () => post<{ ok: true }>("/auth/logout"),

  // The signed-in person
  me: () => get<{ user: SessionUser; offices: OfficeSummary[] }>("/me"),
  updateMe: (body: { displayName?: string; character?: string }) => patch<{ user: SessionUser }>("/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) => post<{ ok: true }>("/me/password", body),

  // Offices
  createOffice: (name: string) => post<{ office: Office }>("/offices", { name }),
  office: (officeId: string) => get<{ office: Office }>(`/offices/${id(officeId)}`),
  /** The office, its people and its invitations in one request. */
  overview: (officeId: string) => get<OfficeOverview>(`/offices/${id(officeId)}/overview`),
  renameOffice: (officeId: string, name: string) => patch<{ office: Office }>(`/offices/${id(officeId)}`, { name }),
  closeOffice: (officeId: string) => del<{ ok: true }>(`/offices/${id(officeId)}`),
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
    get<{ invite: { officeName: string; invitedBy: string; role: OfficeRole; expiresAt: number; full: boolean } }>(
      `/invites/${id(token)}`,
    ),
  acceptInvite: (token: string) => post<{ officeId: string }>(`/invites/${id(token)}/accept`),

  // Guest links
  createGuestLink: (officeId: string, expiresIn: "1d" | "7d" | "30d") =>
    post<{ guestLink: GuestLink & { token: string } }>(`/offices/${id(officeId)}/guest-links`, { expiresIn }),
  revokeGuestLink: (officeId: string, linkId: string) =>
    del<{ ok: true }>(`/offices/${id(officeId)}/guest-links/${id(linkId)}`),
  guestLinkPreview: (token: string) => get<{ guestLink: { officeName: string } }>(`/guest-links/${id(token)}`),

  // Walking in, chatting, calling
  officeTicket: (officeId: string) => post<RoomTicket>(`/offices/${id(officeId)}/ticket`),
  chatTicket: (officeId: string) => post<RoomTicket>(`/offices/${id(officeId)}/chat-ticket`),
  guestLinkTicket: (token: string) => post<RoomTicket>(`/guest-links/${id(token)}/ticket`),
  lobbyTicket: () => post<RoomTicket>("/lobby/ticket"),
  iceServers: () => post<IceServers>("/calls/ice-servers"),
};
