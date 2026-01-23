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
  status: Status;
}

export interface AvatarPreferences {
  characterName: string;
}

export type Status = "available" | "busy" | "away" | "in_call" | "offline";

export type UserStatus = Status;

export type PlayerStatus = Status;

export interface AuthResponse {
  token: string;
  userId: string;
  username: string;
  displayName: string;
  email?: string;
  isGuest: boolean;
  status: Status;
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
  users?: string[];
}

export type RoomStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED" | "DELETED";

export interface CreateRoomRequest {
  name: string;
  isPublic?: boolean;
  password?: string;
  maxPlayers?: number;
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
