// API types matching the backend DTOs

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarPreferences?: AvatarPreferences;
  createdRooms: string[];
  joinedRooms: string[];
  isGuest: boolean;
  createdAt: string;
  status: UserStatus;
}

export interface AvatarPreferences {
  characterName: string;
  skinTone?: string;
  hairStyle?: string;
  hairColor?: string;
  outfit?: string;
  accessories?: string;
}

export type UserStatus = 'ONLINE' | 'AWAY' | 'BUSY' | 'IN_CALL' | 'OFFLINE';

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  isGuest: boolean;
  status: UserStatus;
  message?: string;
}

export interface Room {
  id: string;
  name: string;
  ownerId?: string;
  isPublic: boolean;
  hasPassword: boolean;
  maxPlayers: number;
  playerCount: number;
  createdAt: string;
  lastActivityAt: string;
  status: RoomStatus;
  shareCode?: string;
  settings?: RoomSettings;
  users?: string[];
}

export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';

export interface RoomSettings {
  allowGuests: boolean;
  requireApproval: boolean;
  enableVideo: boolean;
  enableAudio: boolean;
  enableChat: boolean;
  welcomeMessage?: string;
  mapTheme: string;
  proximityRadius: number;
}

export interface CreateRoomRequest {
  name: string;
  isPublic?: boolean;
  password?: string;
  maxPlayers?: number;
  settings?: RoomSettings;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  displayName?: string;
}
