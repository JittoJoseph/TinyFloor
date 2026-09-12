import type { PublicUser } from "@/lib/types";

export const ROOMS_PAGE_SIZE = 6;
export const PEOPLE_PAGE_SIZE = 24;

export interface DirectoryRoom {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  status: string;
  lastActivityAt?: string;
}

export type RawRoom = Omit<DirectoryRoom, "maxPlayers"> & {
  maxPlayers?: number;
  users?: string[];
};

/** Only what a room card shows, so nothing else a room carries lands in the page. */
export const toDirectoryRooms = (rooms: RawRoom[]): DirectoryRoom[] =>
  rooms.map((room) => ({
    id: room.id,
    name: room.name,
    playerCount: room.playerCount || room.users?.length || 0,
    maxPlayers: room.maxPlayers || 20,
    hasPassword: room.hasPassword,
    status: room.status,
    lastActivityAt: room.lastActivityAt,
  }));

export const toDirectoryPeople = (people: PublicUser[]): PublicUser[] =>
  people.map(({ id, username, displayName, characterName, isGuest }) => ({
    id,
    username,
    displayName,
    characterName,
    isGuest,
  }));
