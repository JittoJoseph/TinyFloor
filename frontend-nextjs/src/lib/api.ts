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

export type WorkspaceRole = "owner" | "admin" | "member";

export interface WorkspaceSummary {
  id: string;
  name: string;
  plan: string;
  role: WorkspaceRole;
}

export interface Workspace extends WorkspaceSummary {
  memberLimit: number;
  members: number;
}

export interface Member {
  id: string;
  displayName: string;
  character: string;
  role: WorkspaceRole;
  joinedAt: number;
}

export interface Invite {
  id: string;
  email: string | null;
  role: "admin" | "member";
  createdAt: number;
  expiresAt: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  capacity: number;
  people: number;
}

export interface RoomDetails {
  id: string;
  name: string;
  capacity: number;
  workspaceId: string;
  workspaceName: string;
}

export interface GuestLink {
  id: string;
  createdAt: number;
  expiresAt: number;
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
  me: () => get<{ user: SessionUser; workspaces: WorkspaceSummary[] }>("/me"),
  updateMe: (body: { displayName?: string; character?: string }) => patch<{ user: SessionUser }>("/me", body),
  changePassword: (body: { currentPassword: string; newPassword: string }) => post<{ ok: true }>("/me/password", body),

  // Workspaces and members
  createWorkspace: (name: string) => post<{ workspace: Workspace }>("/workspaces", { name }),
  workspace: (workspaceId: string) => get<{ workspace: Workspace }>(`/workspaces/${id(workspaceId)}`),
  renameWorkspace: (workspaceId: string, name: string) =>
    patch<{ workspace: Workspace }>(`/workspaces/${id(workspaceId)}`, { name }),
  deleteWorkspace: (workspaceId: string) => del<{ ok: true }>(`/workspaces/${id(workspaceId)}`),
  members: (workspaceId: string) => get<{ members: Member[] }>(`/workspaces/${id(workspaceId)}/members`),
  setRole: (workspaceId: string, userId: string, role: "admin" | "member") =>
    patch<{ ok: true }>(`/workspaces/${id(workspaceId)}/members/${id(userId)}`, { role }),
  removeMember: (workspaceId: string, userId: string) =>
    del<{ ok: true }>(`/workspaces/${id(workspaceId)}/members/${id(userId)}`),
  transferOwnership: (workspaceId: string, userId: string) =>
    post<{ ok: true }>(`/workspaces/${id(workspaceId)}/transfer`, { userId }),

  // Invites
  createInvite: (workspaceId: string, body: { role: "admin" | "member"; email?: string }) =>
    post<{ invite: Invite & { token: string } }>(`/workspaces/${id(workspaceId)}/invites`, body),
  invites: (workspaceId: string) => get<{ invites: Invite[] }>(`/workspaces/${id(workspaceId)}/invites`),
  revokeInvite: (workspaceId: string, inviteId: string) =>
    del<{ ok: true }>(`/workspaces/${id(workspaceId)}/invites/${id(inviteId)}`),
  invitePreview: (token: string) =>
    get<{ invite: { workspaceName: string; invitedBy: string; role: string; expiresAt: number } }>(
      `/invites/${id(token)}`,
    ),
  acceptInvite: (token: string) => post<{ workspaceId: string }>(`/invites/${id(token)}/accept`),

  // Rooms and guest links
  rooms: (workspaceId: string) => get<{ rooms: RoomSummary[] }>(`/workspaces/${id(workspaceId)}/rooms`),
  createRoom: (workspaceId: string, body: { name: string; capacity?: number }) =>
    post<{ room: RoomSummary }>(`/workspaces/${id(workspaceId)}/rooms`, body),
  room: (roomId: string) => get<{ room: RoomDetails }>(`/rooms/${id(roomId)}`),
  updateRoom: (roomId: string, body: { name?: string; capacity?: number }) =>
    patch<{ room: RoomDetails }>(`/rooms/${id(roomId)}`, body),
  deleteRoom: (roomId: string) => del<{ ok: true }>(`/rooms/${id(roomId)}`),
  createGuestLink: (roomId: string, expiresIn: "1d" | "7d" | "30d") =>
    post<{ guestLink: GuestLink & { token: string } }>(`/rooms/${id(roomId)}/guest-links`, { expiresIn }),
  guestLinks: (roomId: string) => get<{ guestLinks: GuestLink[] }>(`/rooms/${id(roomId)}/guest-links`),
  revokeGuestLink: (roomId: string, linkId: string) =>
    del<{ ok: true }>(`/rooms/${id(roomId)}/guest-links/${id(linkId)}`),
  guestLinkPreview: (token: string) =>
    get<{ guestLink: { roomName: string; workspaceName: string } }>(`/guest-links/${id(token)}`),

  // Entering rooms and calls
  roomTicket: (roomId: string) => post<RoomTicket>(`/rooms/${id(roomId)}/ticket`),
  guestLinkTicket: (token: string) => post<RoomTicket>(`/guest-links/${id(token)}/ticket`),
  lobbyTicket: () => post<RoomTicket>("/lobby/ticket"),
  iceServers: () => post<IceServers>("/calls/ice-servers"),
};
