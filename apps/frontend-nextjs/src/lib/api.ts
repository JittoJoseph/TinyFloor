import { AuthResponse, User, LoginRequest, RegisterRequest } from "./types";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
    return this.token;
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.fetch<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (response.token) this.setToken(response.token);
    return response;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.fetch<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (response.token) this.setToken(response.token);
    return response;
  }

  async createGuestSession(
    displayName: string,
    character: string,
  ): Promise<AuthResponse> {
    const params = new URLSearchParams({ displayName, character });
    const response = await this.fetch<AuthResponse>(
      `/api/auth/guest?${params}`,
      { method: "POST" },
    );
    if (response.token) this.setToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.fetch<void>("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors on logout
    }
    this.setToken(null);
  }

  async validateToken(): Promise<boolean> {
    try {
      return await this.fetch<boolean>("/api/auth/validate");
    } catch {
      return false;
    }
  }

  /**
   * Combined session validation and user fetch - reduces 2 API calls to 1.
   * Returns { valid: boolean, user: User | null }
   */
  async getSession(): Promise<{ valid: boolean; user: User | null }> {
    try {
      return await this.fetch<{ valid: boolean; user: User | null }>(
        "/api/auth/session",
      );
    } catch {
      return { valid: false, user: null };
    }
  }

  // User endpoints
  async getCurrentUser(): Promise<User> {
    return this.fetch<User>("/api/users/me");
  }

  async getDashboardSummary(): Promise<{
    displayName: string;
    username: string;
    avatarPreferences: { characterName?: string } | null;
    createdRoomsCount: number;
    joinedRoomsCount: number;
    recentCollaborators: {
      id: string;
      displayName: string;
      characterName: string;
    }[];
  }> {
    return this.fetch("/api/users/me/summary");
  }

  async updateProfile(
    displayName?: string,
    avatarPreferences?: Record<string, string>,
  ): Promise<User> {
    const params = displayName
      ? `?displayName=${encodeURIComponent(displayName)}`
      : "";
    return this.fetch<User>(`/api/users/me${params}`, {
      method: "PUT",
      body: JSON.stringify(avatarPreferences || {}),
    });
  }

  async updateAvatar(avatarPreferences: Record<string, string>): Promise<User> {
    return this.fetch<User>("/api/users/me/avatar", {
      method: "PUT",
      body: JSON.stringify(avatarPreferences),
    });
  }

  // Room endpoints
  async getRooms(
    page = 0,
    size = 20,
  ): Promise<
    {
      id: string;
      name: string;
      users: string[];
      playerCount: number;
      isPublic: boolean;
      hasPassword: boolean;
      status: string;
    }[]
  > {
    return this.fetch(`/api/rooms?page=${page}&size=${size}`);
  }

  async searchRooms(
    query: string,
  ): Promise<
    { id: string; name: string; users: string[]; playerCount: number }[]
  > {
    return this.fetch(`/api/rooms/search?query=${encodeURIComponent(query)}`);
  }

  async getRoom(roomId: string): Promise<{
    id: string;
    name: string;
    users: string[];
    playerCount: number;
    maxPlayers: number;
    isPublic: boolean;
    hasPassword: boolean;
    settings?: {
      enableVideo: boolean;
      enableAudio: boolean;
      enableChat: boolean;
    };
  }> {
    return this.fetch(`/api/rooms/${roomId}`);
  }

  async getRoomByShareCode(shareCode: string): Promise<{
    id: string;
    name: string;
    users: string[];
    playerCount: number;
    maxPlayers: number;
    isPublic: boolean;
    hasPassword: boolean;
    settings?: {
      enableVideo: boolean;
      enableAudio: boolean;
      enableChat: boolean;
    };
  }> {
    return this.fetch(`/api/rooms/share/${shareCode}`);
  }

  async getMyRooms(): Promise<
    {
      id: string;
      name: string;
      playerCount: number;
      isPublic: boolean;
      hasPassword: boolean;
      maxPlayers: number;
      createdAt: string;
      lastActivityAt: string;
      status: string;
      shareCode?: string;
    }[]
  > {
    return this.fetch("/api/rooms/my-rooms");
  }

  async getJoinedRooms(): Promise<
    {
      id: string;
      name: string;
      playerCount: number;
      isPublic: boolean;
      hasPassword: boolean;
      maxPlayers: number;
      createdAt: string;
      lastActivityAt: string;
      status: string;
    }[]
  > {
    return this.fetch("/api/rooms/joined");
  }

  async createRoom(data: {
    name: string;
    isPublic?: boolean;
    password?: string;
    maxPlayers?: number;
  }): Promise<{ id: string; name: string; shareCode?: string }> {
    return this.fetch("/api/rooms", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async joinRoom(
    roomId: string,
    password?: string,
    name?: string,
  ): Promise<{
    success: boolean;
    roomId: string;
    userId: string;
    message?: string;
  }> {
    return this.fetch(`/api/rooms/${roomId}/join`, {
      method: "POST",
      body: JSON.stringify({ password, name }),
    });
  }

  async leaveRoom(roomId: string, userId: string): Promise<void> {
    return this.fetch(`/api/rooms/${roomId}/leave`, {
      method: "POST",
      body: JSON.stringify({ userId }),
    });
  }

  async updateRoom(
    roomId: string,
    data: {
      name: string;
      isPublic?: boolean;
      password?: string;
      maxPlayers?: number;
    },
  ): Promise<{ id: string; name: string }> {
    return this.fetch(`/api/rooms/${roomId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteRoom(roomId: string): Promise<void> {
    return this.fetch(`/api/rooms/${roomId}`, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient();
