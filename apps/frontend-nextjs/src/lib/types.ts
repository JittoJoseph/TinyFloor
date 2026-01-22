// API types matching the backend DTOs

export const TILE_SIZE = 32;
export const MAP_WIDTH_TILES = 55;
export const MAP_HEIGHT_TILES = 25;

export function pixelToTile(
  pixelX: number,
  pixelY: number,
): { tileX: number; tileY: number } {
  return {
    tileX: Math.floor(pixelX / TILE_SIZE),
    tileY: Math.floor(pixelY / TILE_SIZE),
  };
}

export function tileToPixel(
  tileX: number,
  tileY: number,
): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE + TILE_SIZE / 2,
    y: tileY * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function isValidTile(tileX: number, tileY: number): boolean {
  return (
    tileX >= 1 &&
    tileX < MAP_WIDTH_TILES - 1 &&
    tileY >= 1 &&
    tileY < MAP_HEIGHT_TILES - 1
  );
}

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

export type UserStatus = "ONLINE" | "AWAY" | "BUSY" | "IN_CALL" | "OFFLINE";

// Player status for in-room presence (lowercase, matches WebSocket messages)
export type PlayerStatus = "available" | "busy" | "away" | "in_call";

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

export type RoomStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "DELETED";

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
